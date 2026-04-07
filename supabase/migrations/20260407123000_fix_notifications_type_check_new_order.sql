-- Aligne la contrainte notifications_type_check avec les types réellement utilisés.
-- Corrige notamment l'échec sur type='new_order' lors des commandes marketplace.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (
    type = ANY (
      ARRAY[
        'new_project'::text,
        'new_quote'::text,
        'quote_accepted'::text,
        'quote_rejected'::text,
        'revision_requested'::text,
        'quote_revision_requested'::text,
        'quote_revision_responded'::text,
        'project_completed'::text,
        'payment_received'::text,
        'verification_approved'::text,
        'verification_rejected'::text,
        'new_message'::text,
        'dispute_raised'::text,
        'new_order'::text,
        'system'::text
      ]
    )
  );
