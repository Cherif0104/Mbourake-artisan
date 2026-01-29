-- Migration: Lecture publique des avis (reviews) pour les profils artisans
-- Permet à tous (anon + authentifiés) de lire les avis et notations sur les profils publics des artisans,
-- pour parité avec l'expérience des utilisateurs connectés.

-- 1. Activer RLS sur reviews si pas déjà fait
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 2. Policy: tout le monde peut lire les avis des artisans (pour page profil public)
DROP POLICY IF EXISTS "Public can read reviews for artisan profiles" ON public.reviews;
CREATE POLICY "Public can read reviews for artisan profiles"
  ON public.reviews FOR SELECT
  USING (
    artisan_id IN (SELECT id FROM public.artisans)
  );

COMMENT ON POLICY "Public can read reviews for artisan profiles" ON public.reviews IS
  'Permet aux visiteurs non connectés de voir les avis et notations sur les profils artisans.';
