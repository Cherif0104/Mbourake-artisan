-- Migration: Ajouter les types de notification pour les révisions de devis
-- Les types 'quote_revision_requested' et 'quote_revision_responded' doivent être ajoutés à l'enum notification_type

-- Ajouter 'quote_revision_requested' à l'enum notification_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'quote_revision_requested' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'quote_revision_requested';
  END IF;
END $$;

-- Ajouter 'quote_revision_responded' à l'enum notification_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'quote_revision_responded' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'quote_revision_responded';
  END IF;
END $$;

COMMENT ON TYPE notification_type IS 'Types de notifications: new_project, new_quote, quote_accepted, quote_rejected, message, project_completed, payment_received, dispute_raised, quote_revision_requested, quote_revision_responded';
