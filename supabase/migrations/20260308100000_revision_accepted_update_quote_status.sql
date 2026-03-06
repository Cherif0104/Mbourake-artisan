-- Quand une révision est acceptée, mettre à jour aussi quotes.status = 'accepted'
-- pour que la lecture directe (et les écrans clôture/notation) retrouvent le devis accepté.

CREATE OR REPLACE FUNCTION set_project_quote_accepted_on_revision_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'accepted' AND NEW.status = 'accepted' THEN
    UPDATE projects
    SET status = 'quote_accepted',
        updated_at = NOW()
    WHERE id = NEW.project_id;

    UPDATE quotes
    SET status = 'accepted'
    WHERE id = NEW.quote_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_project_quote_accepted_on_revision_accepted() IS
  'Met le projet en quote_accepted et le devis en accepted lorsque l''artisan accepte une révision (contourne RLS).';
