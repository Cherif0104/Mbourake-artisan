-- Migration: Corriger l'erreur 42P17 (invalid_object_definition) lors de l'ajout de produits
-- Cause possible : trigger ou fonction update_updated_at_column mal définie ou corrompue

-- 1. S'assurer que la fonction update_updated_at_column existe avec la signature correcte
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2. Recréer le trigger sur products (au cas où il serait corrompu)
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Met à jour updated_at sur les triggers BEFORE UPDATE';
