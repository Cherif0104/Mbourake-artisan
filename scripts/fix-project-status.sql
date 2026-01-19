-- Script pour vérifier et corriger le statut d'un projet
-- Remplacez 'PROJECT_ID' par l'ID du projet à vérifier/corriger

-- 1. Vérifier le statut actuel du projet
SELECT 
  id,
  project_number,
  title,
  status,
  client_id,
  created_at,
  updated_at
FROM projects
WHERE id = 'PROJECT_ID'; -- Remplacez par l'ID du projet

-- 2. Mettre à jour le statut à 'cancelled' si nécessaire
-- ATTENTION : Ne décommentez que si vous voulez forcer l'annulation
-- UPDATE projects
-- SET status = 'cancelled',
--     updated_at = NOW()
-- WHERE id = 'PROJECT_ID';

-- 3. Rejeter tous les devis en attente pour ce projet
-- ATTENTION : Ne décommentez que si vous voulez forcer le rejet
-- UPDATE quotes
-- SET status = 'rejected',
--     updated_at = NOW()
-- WHERE project_id = 'PROJECT_ID'
--   AND status IN ('pending', 'viewed');

-- 4. Vérifier les devis après correction
SELECT 
  id,
  quote_number,
  status,
  artisan_id,
  created_at
FROM quotes
WHERE project_id = 'PROJECT_ID'
ORDER BY created_at DESC;
