-- Renforce get_accepted_quote_artisan_for_project : dernier recours quand un seul devis
-- existe sur le projet (incohérence données ou trigger pas encore exécuté).
-- Évite "Devis accepté introuvable" intermittent.

CREATE OR REPLACE FUNCTION public.get_accepted_quote_artisan_for_project(p_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_artisan_id uuid;
  v_quote_count int;
BEGIN
  SELECT client_id INTO v_client_id
  FROM projects
  WHERE id = p_project_id;

  IF v_client_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Seul le client du projet ou l'artisan du devis accepté peut appeler cette fonction
  IF auth.uid() IS DISTINCT FROM v_client_id THEN
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

  -- 1) Devis avec status = 'accepted'
  SELECT q.artisan_id INTO v_artisan_id
  FROM quotes q
  WHERE q.project_id = p_project_id
    AND q.status = 'accepted'
  LIMIT 1;

  IF v_artisan_id IS NOT NULL THEN
    RETURN v_artisan_id;
  END IF;

  -- 2) Devis accepté via une révision
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

  -- 3) Dernier recours (incohérence / race) : un seul devis sur le projet → c'est le bon
  -- Réservé au client du projet pour ne pas exposer un artisan_id à un tiers.
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
  'Retourne l''artisan_id du devis accepté. Fallbacks : révision acceptée, puis un seul devis (client uniquement).';
