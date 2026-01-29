-- Migration: Lecture publique des artisans et de leurs profils
-- Permet à tous (anon + authentifiés) de voir la liste des artisans et les champs publics des profils artisans
-- pour la page Explorer / Recherche et les profils publics.

-- 1. Activer RLS sur artisans si pas déjà fait (sans casser les policies existantes)
ALTER TABLE public.artisans ENABLE ROW LEVEL SECURITY;

-- 2. Policy: tout le monde peut lire la liste des artisans (profil public)
DROP POLICY IF EXISTS "Public can read artisans" ON public.artisans;
CREATE POLICY "Public can read artisans"
  ON public.artisans FOR SELECT
  USING (true);

-- 3. Policy: tout le monde peut lire les champs publics du profil des artisans (pour liste + page profil)
DROP POLICY IF EXISTS "Public can read artisan profiles" ON public.profiles;
CREATE POLICY "Public can read artisan profiles"
  ON public.profiles FOR SELECT
  USING (
    id IN (SELECT id FROM public.artisans)
  );
