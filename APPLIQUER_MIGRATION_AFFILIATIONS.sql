-- ============================================
-- MIGRATION : Ajout certificate_url aux affiliations
-- ============================================
-- À EXÉCUTER DANS SUPABASE SQL EDITOR
-- Date: 2025-01-21
-- ============================================

-- Ajouter colonne pour l'URL du certificat
ALTER TABLE artisan_affiliations
ADD COLUMN IF NOT EXISTS certificate_url TEXT;

-- Commentaire pour documentation
COMMENT ON COLUMN artisan_affiliations.certificate_url IS 'URL du certificat d''affiliation uploadé par l''artisan';

-- ============================================
-- VÉRIFICATION (optionnel)
-- ============================================
-- Exécutez cette requête pour vérifier que la colonne a été ajoutée :
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'artisan_affiliations' AND column_name = 'certificate_url';
