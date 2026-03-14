-- Ajouter le type 'new_order' pour les notifications de commande marketplace
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'new_order'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'new_order';
  END IF;
END
$$;

COMMENT ON TYPE notification_type IS 'Types: new_project, new_quote, quote_accepted, quote_rejected, message, project_completed, payment_received, dispute_raised, quote_revision_requested, quote_revision_responded, system, new_order';
