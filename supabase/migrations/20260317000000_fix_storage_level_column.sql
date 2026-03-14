-- Migration: Corriger l'erreur 500 "record new has no field level" sur l'upload Storage
-- Référence: https://github.com/supabase/supabase/issues/35700
--
-- À exécuter manuellement depuis le Dashboard Supabase > SQL Editor
-- (Le schéma storage est protégé, la migration MCP ne peut pas l'appliquer)
--
-- Si vous avez l'erreur "must be owner of table objects", contactez le support Supabase
-- ou ouvrez un ticket : ce bug affecte les projets après l'incident Storage de mai 2025.

ALTER TABLE storage.objects
ADD COLUMN IF NOT EXISTS level integer;

UPDATE storage.objects
SET level = storage.get_level(name)
WHERE level IS NULL;

COMMENT ON COLUMN storage.objects.level IS 'Profondeur du chemin (nombre de segments) pour les requêtes par préfixe';
