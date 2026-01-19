-- Migration: Supprimer statuts revision_requested et revised de l'enum quote_status
-- Date: 2025-01-07
-- Description: Refonte du workflow - suppression de la logique de révision

-- 1. Convertir les devis existants avec statut revision_requested en rejected
UPDATE quotes 
SET status = 'rejected' 
WHERE status = 'revision_requested';

-- 2. Convertir les devis révisés récents (moins de 7 jours) en pending pour permettre une nouvelle soumission
UPDATE quotes 
SET status = 'pending' 
WHERE status = 'revised' 
AND created_at > NOW() - INTERVAL '7 days';

-- 3. Convertir les devis révisés anciens (plus de 7 jours) en rejected
UPDATE quotes 
SET status = 'rejected' 
WHERE status = 'revised' 
AND created_at <= NOW() - INTERVAL '7 days';

-- 4. Créer un nouvel enum sans revision_requested et revised
CREATE TYPE quote_status_new AS ENUM (
  'pending', 
  'viewed', 
  'accepted', 
  'rejected', 
  'expired', 
  'abandoned'
);

-- 5. Convertir la colonne status vers le nouveau type
ALTER TABLE quotes 
ALTER COLUMN status TYPE quote_status_new 
USING status::text::quote_status_new;

-- 6. Supprimer l'ancien enum et renommer le nouveau
DROP TYPE IF EXISTS quote_status;
ALTER TYPE quote_status_new RENAME TO quote_status;

-- 7. Commenter la migration
COMMENT ON COLUMN quotes.status IS 'Statut du devis : pending (en attente), viewed (vu), accepted (accepté), rejected (refusé), expired (expiré), abandoned (abandonné). Les statuts revision_requested et revised ont été supprimés dans le cadre de la refonte du workflow.';
