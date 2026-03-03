-- Remet le rôle admin pour les comptes super administrateurs (évite qu'un compte soit resté en artisan/client après un bug).
-- À personnaliser : ajouter l'email du compte super admin à restaurer.
UPDATE profiles
SET role = 'admin', updated_at = NOW()
WHERE email IN (
  'techsupport@senegel.org'
  -- Ajouter d'autres emails super admin si besoin
)
AND role != 'admin';
