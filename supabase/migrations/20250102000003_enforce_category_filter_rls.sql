-- Migration: RLS Policy pour filtrer les projets par catégorie pour les artisans
-- Garantit que les artisans ne voient QUE les projets de leur catégorie au niveau base de données

-- Fonction helper pour obtenir la catégorie d'un artisan
CREATE OR REPLACE FUNCTION get_artisan_category_id(artisan_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  category_id_val INTEGER;
BEGIN
  SELECT category_id INTO category_id_val
  FROM artisans
  WHERE id = artisan_user_id;
  
  RETURN category_id_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vérifier si les RLS policies existent déjà sur projects
-- Supprimer les anciennes policies si elles existent et ne filtrent pas par catégorie
DO $$
BEGIN
  -- Supprimer les policies qui permettent aux artisans de voir tous les projets
  DROP POLICY IF EXISTS "Artisans can view open projects" ON projects;
  DROP POLICY IF EXISTS "Artisans can view projects in their category" ON projects;
END $$;

-- Nouvelle RLS Policy pour les artisans : voir UNIQUEMENT les projets de leur catégorie
-- OU les projets qui leur sont spécifiquement ciblés
CREATE POLICY "Artisans can view projects in their category only"
  ON projects FOR SELECT
  USING (
    -- Les artisans peuvent voir:
    -- 1. Les projets de leur catégorie (category_id = artisan.category_id)
    -- 2. Les projets qui leur sont spécifiquement ciblés (target_artisan_id = artisan.id)
    -- 3. Les projets où ils ont déjà soumis un devis
    EXISTS (
      SELECT 1 FROM artisans
      WHERE artisans.id = auth.uid()
      AND (
        projects.category_id = artisans.category_id
        OR projects.target_artisan_id = artisans.id
        OR EXISTS (
          SELECT 1 FROM quotes
          WHERE quotes.project_id = projects.id
          AND quotes.artisan_id = artisans.id
        )
      )
    )
    -- Les clients peuvent voir leurs propres projets
    OR client_id = auth.uid()
    -- Les admins peuvent tout voir
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMENT ON POLICY "Artisans can view projects in their category only" ON projects IS 
  'Les artisans ne peuvent voir que les projets de leur catégorie, les projets ciblés pour eux, ou les projets où ils ont soumis un devis';
