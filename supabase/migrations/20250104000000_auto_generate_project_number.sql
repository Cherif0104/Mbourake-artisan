-- Migration: Génération automatique du numéro de projet
-- Format: ANNEE-NNNNNNNN (ex: 2026-00000001)

-- Supprimer les anciens triggers et fonctions s'ils existent
DROP TRIGGER IF EXISTS trigger_generate_project_number ON projects CASCADE;
DROP TRIGGER IF EXISTS set_project_number_trigger ON projects CASCADE;
DROP TRIGGER IF EXISTS trigger_set_project_number ON projects CASCADE;
DROP FUNCTION IF EXISTS generate_project_number() CASCADE;
DROP FUNCTION IF EXISTS set_project_number() CASCADE;

-- Créer une séquence pour les numéros de projet par année
CREATE SEQUENCE IF NOT EXISTS project_number_seq START 1;

-- Fonction pour générer le numéro de projet
CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  current_year INTEGER;
  seq_val INTEGER;
  project_num TEXT;
BEGIN
  -- Obtenir l'année courante
  current_year := EXTRACT(YEAR FROM NOW());
  
  -- Obtenir la prochaine valeur de la séquence
  seq_val := nextval('project_number_seq');
  
  -- Générer le numéro au format ANNEE-NNNNNNNN (8 chiffres)
  project_num := current_year || '-' || LPAD(seq_val::TEXT, 8, '0');
  
  RETURN project_num;
END;
$$;

-- Trigger pour générer automatiquement le project_number lors de l'insertion
CREATE OR REPLACE FUNCTION set_project_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Générer le numéro seulement si il n'est pas déjà défini
  IF NEW.project_number IS NULL OR NEW.project_number = '' THEN
    NEW.project_number := generate_project_number();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_set_project_number ON projects;
CREATE TRIGGER trigger_set_project_number
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION set_project_number();

-- Commentaire pour documentation
COMMENT ON FUNCTION generate_project_number() IS 'Génère un numéro de projet au format ANNEE-NNNNNNNN';
COMMENT ON FUNCTION set_project_number() IS 'Trigger pour définir automatiquement le numéro de projet lors de l''insertion';
