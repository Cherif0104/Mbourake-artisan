-- Trigger pour mettre à jour automatiquement la note moyenne des artisans
-- Migration: Mise à jour automatique rating après notation

CREATE OR REPLACE FUNCTION update_artisan_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculer la moyenne pour l'artisan concerné
  UPDATE artisans
  SET 
    rating_avg = (
      SELECT COALESCE(AVG(rating::numeric), 0)
      FROM reviews
      WHERE artisan_id = COALESCE(NEW.artisan_id, OLD.artisan_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.artisan_id, OLD.artisan_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger après insertion, mise à jour ou suppression d'une review
DROP TRIGGER IF EXISTS trigger_update_artisan_rating_insert ON reviews;
DROP TRIGGER IF EXISTS trigger_update_artisan_rating_update ON reviews;
DROP TRIGGER IF EXISTS trigger_update_artisan_rating_delete ON reviews;

CREATE TRIGGER trigger_update_artisan_rating_insert
  AFTER INSERT ON reviews
  FOR EACH ROW
  WHEN (NEW.artisan_id IS NOT NULL)
  EXECUTE FUNCTION update_artisan_rating();

CREATE TRIGGER trigger_update_artisan_rating_update
  AFTER UPDATE ON reviews
  FOR EACH ROW
  WHEN (NEW.artisan_id IS NOT NULL OR OLD.artisan_id IS NOT NULL)
  EXECUTE FUNCTION update_artisan_rating();

CREATE TRIGGER trigger_update_artisan_rating_delete
  AFTER DELETE ON reviews
  FOR EACH ROW
  WHEN (OLD.artisan_id IS NOT NULL)
  EXECUTE FUNCTION update_artisan_rating();

COMMENT ON FUNCTION update_artisan_rating() IS 'Met à jour automatiquement la note moyenne d''un artisan après modification des reviews';
