-- Migration: Correction du type de colonne quote_number
-- Date: 2025-01-21
-- 
-- PROBLÈME : La colonne quote_number est de type INTEGER mais on essaie d'insérer
-- des valeurs TEXT au format "2026-000" générées par un trigger.
--
-- SOLUTION : Changer le type de la colonne de INTEGER à TEXT

-- Vérifier le type actuel de la colonne
DO $$
DECLARE
  current_type TEXT;
BEGIN
  SELECT data_type INTO current_type
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = 'quotes' 
    AND column_name = 'quote_number';
  
  -- Si la colonne est INTEGER ou NUMERIC, la convertir en TEXT
  IF current_type IN ('integer', 'bigint', 'smallint', 'numeric') THEN
    ALTER TABLE quotes 
    ALTER COLUMN quote_number TYPE TEXT USING quote_number::TEXT;
    
    RAISE NOTICE 'Colonne quote_number convertie de % à TEXT', current_type;
  ELSIF current_type = 'text' OR current_type = 'varchar' THEN
    RAISE NOTICE 'Colonne quote_number est déjà de type TEXT, aucune action nécessaire';
  ELSE
    RAISE NOTICE 'Type de colonne quote_number inattendu: %, vérifiez manuellement', current_type;
  END IF;
END $$;

-- Commentaire pour documentation
COMMENT ON COLUMN quotes.quote_number IS 'Numéro de devis généré automatiquement (format: ANNEE-NNN)';
