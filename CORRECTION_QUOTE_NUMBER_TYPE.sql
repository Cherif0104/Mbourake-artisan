-- ============================================
-- CORRECTION : Type de colonne quote_number
-- ============================================
-- À EXÉCUTER DANS SUPABASE SQL EDITOR
-- Date: 2025-01-21
-- ============================================
-- 
-- PROBLÈME : La colonne quote_number est de type INTEGER mais on essaie d'insérer
-- des valeurs TEXT au format "2026-000" générées par un trigger.
--
-- SOLUTION : Changer le type de la colonne de INTEGER à TEXT
-- ============================================

-- Vérifier le type actuel de la colonne
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'quotes' 
  AND column_name = 'quote_number';

-- Si la colonne est INTEGER, la convertir en TEXT
-- ATTENTION : Cette opération peut prendre du temps si la table est grande
ALTER TABLE quotes 
ALTER COLUMN quote_number TYPE TEXT USING quote_number::TEXT;

-- Vérifier que la conversion a réussi
SELECT 
  column_name, 
  data_type, 
  character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'quotes' 
  AND column_name = 'quote_number';

-- ============================================
-- VÉRIFICATION (optionnel)
-- ============================================
-- Exécutez cette requête pour voir les quote_number existants :
-- SELECT id, quote_number, created_at FROM quotes ORDER BY created_at DESC LIMIT 10;
