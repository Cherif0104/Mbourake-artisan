-- Migration: Système de remboursement avec validation admin

-- Créer l'enum pour le statut de remboursement
DO $$ BEGIN
    CREATE TYPE refund_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ajouter les colonnes à la table escrows pour le système de remboursement
ALTER TABLE escrows
ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refund_status refund_status,
ADD COLUMN IF NOT EXISTS refund_approved_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS refund_notes TEXT,
ADD COLUMN IF NOT EXISTS refund_requested_by UUID REFERENCES profiles(id);

-- Index pour les remboursements en attente
CREATE INDEX IF NOT EXISTS idx_escrows_refund_pending ON escrows(refund_status) WHERE refund_status = 'pending';

-- Commentaires
COMMENT ON COLUMN escrows.refund_requested_at IS 'Date de la demande de remboursement';
COMMENT ON COLUMN escrows.refund_status IS 'Statut de la demande de remboursement: pending, approved, rejected';
COMMENT ON COLUMN escrows.refund_approved_by IS 'ID de l''admin qui a approuvé/rejeté le remboursement';
COMMENT ON COLUMN escrows.refund_notes IS 'Notes de l''admin concernant le remboursement';
COMMENT ON COLUMN escrows.refund_requested_by IS 'ID du client qui a demandé le remboursement';
