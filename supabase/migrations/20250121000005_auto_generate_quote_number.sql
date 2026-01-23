-- Migration: Génération automatique du numéro de devis
-- Date: 2025-01-21
-- Format: ANNEE-NNN (ex: 2026-001)

-- Supprimer les anciens triggers et fonctions s'ils existent
DROP TRIGGER IF EXISTS trigger_generate_quote_number ON quotes CASCADE;
DROP TRIGGER IF EXISTS trigger_set_quote_number ON quotes CASCADE;
DROP FUNCTION IF EXISTS generate_quote_number() CASCADE;
DROP FUNCTION IF EXISTS set_quote_number() CASCADE;

-- Créer une séquence pour les numéros de devis par année
CREATE SEQUENCE IF NOT EXISTS quote_number_seq START 1;

-- Fonction pour générer le numéro de devis
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  current_year INTEGER;
  seq_val INTEGER;
  quote_num TEXT;
BEGIN
  -- Obtenir l'année courante
  current_year := EXTRACT(YEAR FROM NOW());
  
  -- Obtenir la prochaine valeur de la séquence
  seq_val := nextval('quote_number_seq');
  
  -- Générer le numéro au format ANNEE-NNN (3 chiffres)
  quote_num := current_year || '-' || LPAD(seq_val::TEXT, 3, '0');
  
  RETURN quote_num;
END;
$$;

-- Trigger pour générer automatiquement le quote_number lors de l'insertion
CREATE OR REPLACE FUNCTION set_quote_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Générer le numéro seulement si il n'est pas déjà défini
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := generate_quote_number();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
CREATE TRIGGER trigger_set_quote_number
  BEFORE INSERT ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_number();

-- Commentaires pour documentation
COMMENT ON FUNCTION generate_quote_number() IS 'Génère un numéro de devis au format ANNEE-NNN';
COMMENT ON FUNCTION set_quote_number() IS 'Trigger pour définir automatiquement le numéro de devis lors de l''insertion';
COMMENT ON COLUMN quotes.quote_number IS 'Numéro de devis généré automatiquement (format: ANNEE-NNN)';
