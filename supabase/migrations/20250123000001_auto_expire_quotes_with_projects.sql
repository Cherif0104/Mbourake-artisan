-- Migration: Expiration automatique des devis en attente lorsque le projet expire
-- Lorsqu'un projet est marqué expiré, tous les devis encore en pending/viewed sont marqués expirés.

CREATE OR REPLACE FUNCTION mark_expired_projects()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_project_ids UUID[];
BEGIN
  -- Projets à marquer expirés : date dépassée, statut open, aucun devis accepté
  SELECT ARRAY_AGG(p.id)
  INTO expired_project_ids
  FROM projects p
  WHERE p.expires_at < NOW()
    AND p.status = 'open'
    AND NOT EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.project_id = p.id AND q.status = 'accepted'
    );

  IF expired_project_ids IS NOT NULL AND array_length(expired_project_ids, 1) > 0 THEN
    -- Marquer les projets comme expirés
    UPDATE projects
    SET status = 'expired'
    WHERE id = ANY(expired_project_ids);

    -- Marquer les devis encore en attente (pending/viewed) de ces projets comme expirés
    UPDATE quotes
    SET status = 'expired'
    WHERE project_id = ANY(expired_project_ids)
      AND status IN ('pending', 'viewed');
  END IF;
END;
$$;

COMMENT ON FUNCTION mark_expired_projects() IS 'Marque les projets ouverts comme expirés après leur date d''expiration et expire les devis en attente de ces projets';
