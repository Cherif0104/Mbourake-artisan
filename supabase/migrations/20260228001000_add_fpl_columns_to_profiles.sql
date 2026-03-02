-- Migration: Champs F‑P‑L sur le profil artisan
-- Objectif : stocker l'état de Formalisation, Professionnalisation, Labellisation

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS formalisation_status TEXT,
  ADD COLUMN IF NOT EXISTS professionalisation_status TEXT,
  ADD COLUMN IF NOT EXISTS labellisation_status TEXT;

COMMENT ON COLUMN profiles.formalisation_status IS 'Statut de formalisation (lead, en_cours, valide, etc.)';
COMMENT ON COLUMN profiles.professionalisation_status IS 'Statut de professionnalisation (formations suivies, niveau, etc.)';
COMMENT ON COLUMN profiles.labellisation_status IS 'Statut de labellisation (non_demarre, en_cours, labellise, etc.)';

