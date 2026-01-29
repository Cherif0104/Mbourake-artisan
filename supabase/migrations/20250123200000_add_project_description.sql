-- Description textuelle du projet (alternative ou complément au message vocal)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;
COMMENT ON COLUMN projects.description IS 'Description écrite du besoin client (optionnel)';
