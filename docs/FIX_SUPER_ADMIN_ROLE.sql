-- Rétablir un compte en super administrateur (à exécuter dans Supabase SQL Editor)
-- Remplacez 'EMAIL_DU_COMPTE@exemple.com' par l'email du compte à repasser en admin.

UPDATE profiles
SET role = 'admin'
WHERE email = 'EMAIL_DU_COMPTE@exemple.com';

-- Vérifier le résultat :
-- SELECT id, email, full_name, role FROM profiles WHERE email = 'EMAIL_DU_COMPTE@exemple.com';
