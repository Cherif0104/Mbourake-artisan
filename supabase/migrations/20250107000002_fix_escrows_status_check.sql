-- Migration: Corriger la contrainte CHECK sur escrows.status
-- Date: 2025-01-07
-- Description: La contrainte CHECK rejetait 'pending' qui est une valeur valide selon l'enum escrow_status

-- 1. Supprimer l'ancienne contrainte CHECK si elle existe
ALTER TABLE escrows 
DROP CONSTRAINT IF EXISTS escrows_status_check;

-- 2. Recréer la contrainte CHECK avec toutes les valeurs valides de l'enum escrow_status
-- Valeurs valides selon l'enum : "pending" | "held" | "advance_paid" | "released" | "refunded" | "frozen"
ALTER TABLE escrows
ADD CONSTRAINT escrows_status_check 
CHECK (status IS NULL OR status IN ('pending', 'held', 'advance_paid', 'released', 'refunded', 'frozen'));

-- 3. Commenter la contrainte
COMMENT ON CONSTRAINT escrows_status_check ON escrows IS 
  'Contrainte CHECK pour garantir que le statut de l''escrow correspond aux valeurs de l''enum escrow_status : pending, held, advance_paid, released, refunded, frozen';
