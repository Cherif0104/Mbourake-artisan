-- Migration: Ajouter champ rejection_reason et migrer données de revision_reason
-- Date: 2025-01-07
-- Description: Refonte du workflow - ajout d'un champ générique pour la raison de refus

-- 1. Ajouter le nouveau champ rejection_reason
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Migrer les données existantes de revision_reason vers rejection_reason
-- Pour les devis qui ont été refusés ou qui avaient une demande de révision
UPDATE quotes 
SET rejection_reason = revision_reason 
WHERE revision_reason IS NOT NULL 
AND (status = 'rejected' OR revision_reason IS NOT NULL);

-- 3. Ajouter un commentaire sur le champ
COMMENT ON COLUMN quotes.rejection_reason IS 'Raison du refus du devis fournie par le client (optionnel). Anciennement revision_reason, renommé pour la refonte du workflow.';

-- Note: Les anciens champs revision_reason, client_suggested_price, client_audio_url, revision_count
-- sont conservés pour les données historiques mais ne sont plus utilisés dans le nouveau workflow.
-- Ils peuvent être supprimés ultérieurement après vérification des données.
