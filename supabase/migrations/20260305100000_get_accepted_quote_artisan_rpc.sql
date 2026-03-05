-- RPC pour récupérer l'artisan du devis accepté d'un projet (page clôture / notation).
-- S'exécute en SECURITY DEFINER pour contourner d'éventuelles RLS sur quotes.
-- Vérifie que l'appelant est le client du projet ou l'artisan assigné.

CREATE OR REPLACE FUNCTION public.get_accepted_quote_artisan_for_project(p_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_artisan_id uuid;
BEGIN
  -- Vérifier que l'utilisateur est le client du projet ou a un lien avec le projet
  SELECT client_id INTO v_client_id
  FROM projects
  WHERE id = p_project_id;

  IF v_client_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Seul le client du projet ou l'artisan du devis accepté peut appeler cette fonction
  IF auth.uid() IS DISTINCT FROM v_client_id THEN
    -- Vérifier si l'utilisateur est l'artisan du devis accepté
    SELECT q.artisan_id INTO v_artisan_id
    FROM quotes q
    WHERE q.project_id = p_project_id
      AND q.status = 'accepted'
      AND q.artisan_id = auth.uid()
    LIMIT 1;
    IF v_artisan_id IS NULL THEN
      RETURN NULL; -- Pas autorisé
    END IF;
  END IF;

  -- Récupérer l'artisan_id du devis accepté (bypass RLS)
  SELECT q.artisan_id INTO v_artisan_id
  FROM quotes q
  WHERE q.project_id = p_project_id
    AND q.status = 'accepted'
  LIMIT 1;

  IF v_artisan_id IS NOT NULL THEN
    RETURN v_artisan_id;
  END IF;

  -- Fallback : devis accepté via une révision
  SELECT q.artisan_id INTO v_artisan_id
  FROM quote_revisions qr
  JOIN quotes q ON q.id = qr.quote_id
  WHERE qr.project_id = p_project_id
    AND qr.status = 'accepted'
  ORDER BY qr.responded_at DESC NULLS LAST
  LIMIT 1;

  RETURN v_artisan_id;
END;
$$;

COMMENT ON FUNCTION public.get_accepted_quote_artisan_for_project(uuid) IS
  'Retourne l''artisan_id du devis accepté pour un projet. Utilisé par la page de clôture (client qui note). Vérifie que l''appelant est le client ou l''artisan.';
