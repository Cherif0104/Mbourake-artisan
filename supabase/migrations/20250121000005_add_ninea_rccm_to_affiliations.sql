-- Migration: Ajout des champs NINEA et RCCM aux affiliations
-- Date: 2025-01-21

-- Ajouter colonnes NINEA et RCCM
ALTER TABLE artisan_affiliations
ADD COLUMN IF NOT EXISTS ninea TEXT;

ALTER TABLE artisan_affiliations
ADD COLUMN IF NOT EXISTS rccm TEXT;

-- Commentaires pour documentation
COMMENT ON COLUMN artisan_affiliations.ninea IS 'Numéro d''Identification Nationale des Entreprises et Associations (NINEA)';
COMMENT ON COLUMN artisan_affiliations.rccm IS 'Registre du Commerce et du Crédit Mobilier (RCCM)';

-- Index pour recherche
CREATE INDEX IF NOT EXISTS idx_artisan_affiliations_ninea ON artisan_affiliations(ninea) WHERE ninea IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artisan_affiliations_rccm ON artisan_affiliations(rccm) WHERE rccm IS NOT NULL;
