-- Canonicalise le devis accepté au niveau projet pour éviter les résolutions intermittentes.
-- Stratégie additive:
-- 1) colonne projects.accepted_quote_id (source de vérité)
-- 2) backfill des projets existants
-- 3) synchronisation automatique via triggers quotes / quote_revisions
-- 4) RPC get_accepted_quote_artisan_for_project priorise accepted_quote_id

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS accepted_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_accepted_quote_id
  ON projects(accepted_quote_id);

COMMENT ON COLUMN projects.accepted_quote_id IS
  'Devis canonique accepté pour le projet. Source de vérité pour la clôture/paiement.';

-- Backfill initial: accepted > révision accepted > devis unique
WITH resolved AS (
  SELECT
    p.id AS project_id,
    COALESCE(
      (
        SELECT q.id
        FROM quotes q
        WHERE q.project_id = p.id
          AND q.status = 'accepted'
        ORDER BY q.updated_at DESC NULLS LAST, q.created_at DESC NULLS LAST
        LIMIT 1
      ),
      (
        SELECT qr.quote_id
        FROM quote_revisions qr
        WHERE qr.project_id = p.id
          AND qr.status = 'accepted'
          AND qr.quote_id IS NOT NULL
        ORDER BY qr.responded_at DESC NULLS LAST, qr.created_at DESC NULLS LAST
        LIMIT 1
      ),
      (
        SELECT q.id
        FROM quotes q
        WHERE q.project_id = p.id
        ORDER BY q.created_at DESC NULLS LAST
        LIMIT 1
      )
    ) AS quote_id
  FROM projects p
)
UPDATE projects p
SET accepted_quote_id = r.quote_id,
    updated_at = NOW()
FROM resolved r
WHERE p.id = r.project_id
  AND r.quote_id IS NOT NULL
  AND p.accepted_quote_id IS DISTINCT FROM r.quote_id;

-- Synchronisation quand un devis devient accepted (ou est créé accepted)
CREATE OR REPLACE FUNCTION sync_project_accepted_quote_on_quote_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'accepted') THEN
    UPDATE projects
    SET accepted_quote_id = NEW.id,
        status = CASE
          WHEN status IN ('open', 'quote_received', 'quote_rejected') THEN 'quote_accepted'
          ELSE status
        END,
        updated_at = NOW()
    WHERE id = NEW.project_id;

    -- Empêche plusieurs devis accepted pour un même projet
    UPDATE quotes
    SET status = 'rejected'
    WHERE project_id = NEW.project_id
      AND id <> NEW.id
      AND status = 'accepted';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_project_accepted_quote_on_quote_insert ON quotes;
CREATE TRIGGER trigger_sync_project_accepted_quote_on_quote_insert
  AFTER INSERT ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_accepted_quote_on_quote_change();

DROP TRIGGER IF EXISTS trigger_sync_project_accepted_quote_on_quote_update ON quotes;
CREATE TRIGGER trigger_sync_project_accepted_quote_on_quote_update
  AFTER UPDATE OF status ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_accepted_quote_on_quote_change();

COMMENT ON FUNCTION sync_project_accepted_quote_on_quote_change() IS
  'Synchronise projects.accepted_quote_id quand un devis est accepted et force l unicité logique.';

-- Révision accepted: aligner projet + devis accepté canonique
CREATE OR REPLACE FUNCTION set_project_quote_accepted_on_revision_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'accepted' AND NEW.status = 'accepted' THEN
    UPDATE quotes
    SET status = 'accepted'
    WHERE id = NEW.quote_id;

    UPDATE projects
    SET status = 'quote_accepted',
        accepted_quote_id = NEW.quote_id,
        updated_at = NOW()
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_project_quote_accepted_on_revision_accepted() IS
  'Met le projet en quote_accepted et synchronise accepted_quote_id quand une révision est acceptée.';

-- RPC résiliente: priorité à accepted_quote_id, puis fallbacks historiques
CREATE OR REPLACE FUNCTION public.get_accepted_quote_artisan_for_project(p_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_project_accepted_quote_id uuid;
  v_artisan_id uuid;
  v_quote_count int;
BEGIN
  SELECT client_id, accepted_quote_id
  INTO v_client_id, v_project_accepted_quote_id
  FROM projects
  WHERE id = p_project_id;

  IF v_client_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Client du projet: accès complet
  IF auth.uid() = v_client_id THEN
    IF v_project_accepted_quote_id IS NOT NULL THEN
      SELECT q.artisan_id INTO v_artisan_id
      FROM quotes q
      WHERE q.id = v_project_accepted_quote_id
      LIMIT 1;
      IF v_artisan_id IS NOT NULL THEN
        RETURN v_artisan_id;
      END IF;
    END IF;
  ELSE
    -- Artisan: autoriser uniquement s'il est l'assigné canonique ou accepted historique
    IF v_project_accepted_quote_id IS NOT NULL THEN
      SELECT q.artisan_id INTO v_artisan_id
      FROM quotes q
      WHERE q.id = v_project_accepted_quote_id
        AND q.artisan_id = auth.uid()
      LIMIT 1;
      IF v_artisan_id IS NOT NULL THEN
        RETURN v_artisan_id;
      END IF;
    END IF;

    SELECT q.artisan_id INTO v_artisan_id
    FROM quotes q
    WHERE q.project_id = p_project_id
      AND q.status = 'accepted'
      AND q.artisan_id = auth.uid()
    LIMIT 1;
    IF v_artisan_id IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  -- 1) Devis accepted
  SELECT q.artisan_id INTO v_artisan_id
  FROM quotes q
  WHERE q.project_id = p_project_id
    AND q.status = 'accepted'
  LIMIT 1;
  IF v_artisan_id IS NOT NULL THEN
    RETURN v_artisan_id;
  END IF;

  -- 2) Révision accepted
  SELECT q.artisan_id INTO v_artisan_id
  FROM quote_revisions qr
  JOIN quotes q ON q.id = qr.quote_id
  WHERE qr.project_id = p_project_id
    AND qr.status = 'accepted'
  ORDER BY qr.responded_at DESC NULLS LAST
  LIMIT 1;
  IF v_artisan_id IS NOT NULL THEN
    RETURN v_artisan_id;
  END IF;

  -- 3) Dernier recours: un seul devis (client uniquement)
  IF auth.uid() = v_client_id THEN
    SELECT COUNT(*) INTO v_quote_count
    FROM quotes
    WHERE project_id = p_project_id;

    IF v_quote_count = 1 THEN
      SELECT q.artisan_id INTO v_artisan_id
      FROM quotes q
      WHERE q.project_id = p_project_id
      LIMIT 1;
    END IF;
  END IF;

  RETURN v_artisan_id;
END;
$$;

COMMENT ON FUNCTION public.get_accepted_quote_artisan_for_project(uuid) IS
  'Retourne artisan_id via source canonique projects.accepted_quote_id, puis fallbacks accepted/révision/devis unique.';
