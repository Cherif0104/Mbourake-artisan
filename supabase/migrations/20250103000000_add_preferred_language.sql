-- Migration: Ajouter colonne preferred_language dans profiles
-- Permet de persister la langue sélectionnée lors de l'onboarding

-- Ajouter la colonne preferred_language
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'fr' CHECK (preferred_language IN ('fr', 'wo', 'en'));

-- Commentaire
COMMENT ON COLUMN profiles.preferred_language IS 'Langue préférée de l''utilisateur: fr (français), wo (wolof), en (anglais). Défaut: fr.';

-- Index pour optimiser les requêtes si nécessaire
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language ON profiles(preferred_language);
