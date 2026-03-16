-- Migration: Corriger l'erreur 500 sur l'upload Storage (récursion RLS staff_users)
-- Référence: support Supabase SU-341750, discussion https://github.com/orgs/supabase/discussions/22336
--
-- IMPORTANT: Le schéma storage est détenu par Supabase. Ce script NE PEUT PAS être exécuté
-- depuis le SQL Editor (erreur 42501: must be owner of relation objects).
--
-- À la place, appliquer les politiques via le Dashboard Supabase :
--   Storage → bucket "photos" → Policies → supprimer les politiques qui référencent staff_users,
--   puis créer les 3 politiques ci-dessous (voir docs/FIX_STORAGE_RLS_RECURSION.md).
--
-- Ce fichier sert de référence pour le contenu exact des politiques à avoir.

-- ========== RÉFÉRENCE : politiques à configurer dans Dashboard → Storage → photos → Policies ==========
--
-- 1) Supprimer toute politique existante sur le bucket photos qui référence une table (ex. staff_users).
--
-- 2) Créer ces 3 politiques (via l'interface ou en demandant au support Supabase de les appliquer) :
--
-- Nom: "Users can upload photos"
-- Operation: INSERT (Allow)
-- Policy definition (WITH CHECK):
--   bucket_id = 'photos' AND auth.role() = 'authenticated'
--
-- Nom: "Anyone can read photos"
-- Operation: SELECT (Allow)
-- Policy definition (USING):
--   bucket_id = 'photos'
--
-- Nom: "Users can delete own photos"
-- Operation: DELETE (Allow)
-- Policy definition (USING):
--   bucket_id = 'photos' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text
--
-- ========== Fin référence ==========

-- Partie exécutable : uniquement le bucket (storage.buckets peut être modifiable selon les projets)
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;
