-- Migration: Notifier l'artisan lorsqu'une demande de révision est créée
-- L'insertion depuis le client peut être bloquée par la RLS sur notifications (user_id ≠ auth.uid()).
-- Ce trigger crée la notification côté serveur (SECURITY DEFINER) pour l'artisan.

CREATE OR REPLACE FUNCTION notify_artisan_revision_requested()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_artisan_id UUID;
  v_client_name TEXT;
BEGIN
  -- Récupérer l'artisan du devis
  SELECT artisan_id INTO v_artisan_id
  FROM quotes
  WHERE id = NEW.quote_id
  LIMIT 1;

  IF v_artisan_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Nom du client (demandeur)
  SELECT COALESCE(full_name, 'Un client') INTO v_client_name
  FROM profiles
  WHERE id = NEW.requested_by
  LIMIT 1;

  INSERT INTO notifications (user_id, type, title, message, data, is_read)
  VALUES (
    v_artisan_id,
    'quote_revision_requested',
    'Nouvelle demande de révision',
    v_client_name || ' a demandé une révision de votre devis',
    jsonb_build_object(
      'project_id', NEW.project_id,
      'quote_id', NEW.quote_id,
      'revision_id', NEW.id
    ),
    false
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION notify_artisan_revision_requested() IS 'Crée une notification pour l''artisan lors de l''insertion d''une demande de révision (quote_revisions)';

DROP TRIGGER IF EXISTS trigger_notify_artisan_revision_requested ON quote_revisions;
CREATE TRIGGER trigger_notify_artisan_revision_requested
  AFTER INSERT ON quote_revisions
  FOR EACH ROW
  EXECUTE FUNCTION notify_artisan_revision_requested();
