-- Migration: Expiration automatique des projets (72h)
-- Marque automatiquement les projets comme expirés après 72h sans devis

-- Fonction pour marquer les projets expirés
CREATE OR REPLACE FUNCTION mark_expired_projects()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Marquer comme expirés les projets qui ont dépassé leur date d'expiration
  -- et qui sont toujours en statut 'open' (pas de devis accepté)
  UPDATE projects
  SET status = 'expired'
  WHERE expires_at < NOW()
    AND status = 'open'
    AND NOT EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.project_id = projects.id
        AND quotes.status = 'accepted'
    );
END;
$$;

-- Créer une fonction qui peut être appelée par pg_cron (si disponible)
-- Sinon, cette fonction peut être appelée manuellement ou via une Edge Function
COMMENT ON FUNCTION mark_expired_projects() IS 'Marque les projets ouverts comme expirés après leur date d''expiration';
