-- Appliquer dans Supabase Dashboard → SQL Editor
-- Quand une révision est acceptée, le projet passe en "Devis accepté" (trigger, contourne RLS).

CREATE OR REPLACE FUNCTION set_project_quote_accepted_on_revision_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'accepted' AND NEW.status = 'accepted' THEN
    UPDATE projects
    SET status = 'quote_accepted',
        updated_at = NOW()
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_revision_accepted_update_project ON quote_revisions;
CREATE TRIGGER trigger_revision_accepted_update_project
  AFTER UPDATE OF status ON quote_revisions
  FOR EACH ROW
  EXECUTE FUNCTION set_project_quote_accepted_on_revision_accepted();

COMMENT ON FUNCTION set_project_quote_accepted_on_revision_accepted() IS
  'Met le projet en quote_accepted lorsque l''artisan accepte une révision (contourne RLS projects).';
