-- Migration: Ajouter champ certificate_url à artisan_affiliations
-- Permet de stocker l'URL du certificat d'affiliation uploadé

-- Ajouter la colonne certificate_url si elle n'existe pas
ALTER TABLE artisan_affiliations
ADD COLUMN IF NOT EXISTS certificate_url TEXT;

-- Commentaire
COMMENT ON COLUMN artisan_affiliations.certificate_url IS 'URL du certificat d''affiliation uploadé par l''artisan';
