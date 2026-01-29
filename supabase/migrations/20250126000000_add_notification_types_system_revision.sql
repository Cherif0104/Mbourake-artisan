-- Migration: Ajouter les types de notification manquants (révisions + system)
-- À exécuter si 20250125000001 n'a pas été appliquée ou si 'system' manque.

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

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'system' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'system';
  END IF;
END $$;

COMMENT ON TYPE notification_type IS 'Types: new_project, new_quote, quote_accepted, quote_rejected, message, project_completed, payment_received, dispute_raised, quote_revision_requested, quote_revision_responded, system';
