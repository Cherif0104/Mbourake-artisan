-- Script de diagnostic pour vérifier les devis d'un projet
-- Remplacez 'PROJECT_ID' par l'ID du projet à diagnostiquer

-- 1. Vérifier tous les devis pour un projet
SELECT 
  q.id,
  q.quote_number,
  q.status,
  q.amount,
  q.artisan_id,
  p.full_name as artisan_name,
  q.project_id,
  q.created_at,
  q.updated_at
FROM quotes q
LEFT JOIN profiles p ON p.id = q.artisan_id
WHERE q.project_id = 'PROJECT_ID' -- Remplacez par l'ID du projet
ORDER BY q.created_at DESC;

-- 2. Vérifier les politiques RLS sur la table quotes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'quotes';

-- 3. Vérifier le statut du projet
SELECT 
  id,
  project_number,
  title,
  status,
  client_id,
  category_id,
  created_at,
  updated_at
FROM projects
WHERE id = 'PROJECT_ID'; -- Remplacez par l'ID du projet

-- 4. Compter les devis par statut pour ce projet
SELECT 
  status,
  COUNT(*) as count
FROM quotes
WHERE project_id = 'PROJECT_ID' -- Remplacez par l'ID du projet
GROUP BY status;

-- 5. Vérifier tous les devis d'un artisan pour un projet
-- Remplacez 'ARTISAN_ID' et 'PROJECT_ID'
SELECT 
  q.*,
  p.full_name as artisan_name
FROM quotes q
LEFT JOIN profiles p ON p.id = q.artisan_id
WHERE q.artisan_id = 'ARTISAN_ID' -- Remplacez par l'ID de l'artisan
  AND q.project_id = 'PROJECT_ID' -- Remplacez par l'ID du projet
ORDER BY q.created_at DESC;
