-- Migration: Ajouter les nouveaux rôles 'partner' et 'chambre_metier' à l'enum user_role

-- Note: PostgreSQL ne permet pas de modifier directement un enum existant
-- Il faut créer un nouveau type, mettre à jour la table, et supprimer l'ancien type

-- Créer le nouveau type avec toutes les valeurs
DO $$ BEGIN
    CREATE TYPE user_role_new AS ENUM ('client', 'artisan', 'admin', 'partner', 'chambre_metier');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Mettre à jour la colonne profiles.role pour utiliser le nouveau type
ALTER TABLE profiles ALTER COLUMN role TYPE user_role_new USING role::text::user_role_new;

-- Supprimer l'ancien type
DROP TYPE IF EXISTS user_role;

-- Renommer le nouveau type
ALTER TYPE user_role_new RENAME TO user_role;

-- Vérifier que la contrainte fonctionne toujours
COMMENT ON TYPE user_role IS 'Rôles utilisateurs: client, artisan, admin, partner (fournisseurs), chambre_metier (chambres de métier)';
