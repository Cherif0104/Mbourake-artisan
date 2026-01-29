-- =============================================================================
-- NETTOYAGE DES COMPTES DE TEST / DONNÉES ORPHELINES
-- =============================================================================
-- À exécuter dans Supabase : SQL Editor (Dashboard Supabase > SQL Editor).
-- Conserve UNIQUEMENT les comptes dont l'email est dans la liste ci-dessous.
-- Les autres profils (et toutes leurs données liées) sont supprimés.
--
-- Emails conservés :
--   - contact.cherif.pro@gmail.com
--   - myimmogis@gmail.com
--   - niangcherifoumaraidara@gmail.com
-- =============================================================================

-- Étape 0 : Vérification (exécuter d'abord pour voir ce qui sera supprimé)
-- Décommenter et exécuter uniquement cette partie pour un aperçu sans rien supprimer.
/*
DO $$
DECLARE
  keep_count int;
  delete_count int;
  projects_count int;
BEGIN
  SELECT COUNT(*) INTO keep_count FROM auth.users u
  WHERE u.email IN (
    'contact.cherif.pro@gmail.com',
    'myimmogis@gmail.com',
    'niangcherifoumaraidara@gmail.com'
  );
  SELECT COUNT(*) INTO delete_count FROM public.profiles p
  WHERE p.id NOT IN (
    SELECT id FROM auth.users WHERE email IN (
      'contact.cherif.pro@gmail.com',
      'myimmogis@gmail.com',
      'niangcherifoumaraidara@gmail.com'
    )
  );
  SELECT COUNT(*) INTO projects_count FROM public.projects
  WHERE client_id NOT IN (SELECT id FROM auth.users WHERE email IN ('contact.cherif.pro@gmail.com','myimmogis@gmail.com','niangcherifoumaraidara@gmail.com'))
     OR target_artisan_id NOT IN (SELECT id FROM auth.users WHERE email IN ('contact.cherif.pro@gmail.com','myimmogis@gmail.com','niangcherifoumaraidara@gmail.com'));
  RAISE NOTICE 'Comptes conservés (auth): %', keep_count;
  RAISE NOTICE 'Profils qui seront supprimés: %', delete_count;
  RAISE NOTICE 'Projets concernés (ordre de grandeur): %', projects_count;
END $$;
*/

-- =============================================================================
-- Étape 1 : Tables temporaires (IDs à conserver / à supprimer)
-- =============================================================================

-- IDs des comptes à CONSERVER (auth.users dont l'email est dans la liste)
DROP TABLE IF EXISTS _keep_ids;
CREATE TEMP TABLE _keep_ids AS
SELECT id FROM auth.users
WHERE email IN (
  'contact.cherif.pro@gmail.com',
  'myimmogis@gmail.com',
  'niangcherifoumaraidara@gmail.com'
);

-- Sécurité : ne pas exécuter si aucun compte à conserver (évite une suppression totale)
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM _keep_ids) = 0 THEN
    RAISE EXCEPTION 'Aucun compte "à conserver" trouvé. Vérifiez les emails dans le script avant de lancer les suppressions.';
  END IF;
END $$;

-- IDs des profils à SUPPRIMER (tous les profils dont l'id n'est pas dans _keep_ids)
DROP TABLE IF EXISTS _to_delete;
CREATE TEMP TABLE _to_delete AS
SELECT id FROM public.profiles
WHERE id NOT IN (SELECT id FROM _keep_ids);

-- Projets à supprimer (créés par ou ciblant un compte à supprimer)
DROP TABLE IF EXISTS _projects_to_delete;
CREATE TEMP TABLE _projects_to_delete AS
SELECT id FROM public.projects
WHERE client_id IN (SELECT id FROM _to_delete)
   OR target_artisan_id IN (SELECT id FROM _to_delete);

-- Devis à supprimer (projets à supprimer ou artisan à supprimer)
DROP TABLE IF EXISTS _quotes_to_delete;
CREATE TEMP TABLE _quotes_to_delete AS
SELECT id FROM public.quotes
WHERE project_id IN (SELECT id FROM _projects_to_delete)
   OR artisan_id IN (SELECT id FROM _to_delete);

-- Escrows à supprimer (projets à supprimer)
DROP TABLE IF EXISTS _escrows_to_delete;
CREATE TEMP TABLE _escrows_to_delete AS
SELECT id FROM public.escrows
WHERE project_id IN (SELECT id FROM _projects_to_delete);

-- Factures à supprimer (client ou artisan à supprimer)
DROP TABLE IF EXISTS _invoices_to_delete;
CREATE TEMP TABLE _invoices_to_delete AS
SELECT id FROM public.invoices
WHERE client_id IN (SELECT id FROM _to_delete)
   OR artisan_id IN (SELECT id FROM _to_delete);

-- =============================================================================
-- Étape 2 : Suppressions (ordre respectant les clés étrangères)
-- =============================================================================

-- Notifications (si la table existe ; sinon commenter la ligne)
DELETE FROM public.notifications WHERE user_id IN (SELECT id FROM _to_delete);

-- Dépenses
DELETE FROM public.expenses WHERE user_id IN (SELECT id FROM _to_delete);

-- Révisions de devis (demandées par un compte à supprimer)
DELETE FROM public.quote_revisions WHERE requested_by IN (SELECT id FROM _to_delete);
-- Révisions liées aux devis qu'on supprime
DELETE FROM public.quote_revisions WHERE quote_id IN (SELECT id FROM _quotes_to_delete);

-- Avis
DELETE FROM public.reviews
WHERE client_id IN (SELECT id FROM _to_delete)
   OR artisan_id IN (SELECT id FROM _to_delete);

-- Messages (expéditeur à supprimer ou projet à supprimer)
DELETE FROM public.messages
WHERE sender_id IN (SELECT id FROM _to_delete)
   OR project_id IN (SELECT id FROM _projects_to_delete);

-- Audit logs (projets, devis, escrows, factures)
DELETE FROM public.project_audit_logs WHERE project_id IN (SELECT id FROM _projects_to_delete);
DELETE FROM public.project_audit_logs WHERE user_id IN (SELECT id FROM _to_delete);
DELETE FROM public.quote_audit_logs WHERE quote_id IN (SELECT id FROM _quotes_to_delete);
DELETE FROM public.quote_audit_logs WHERE user_id IN (SELECT id FROM _to_delete);
DELETE FROM public.escrow_audit_logs WHERE escrow_id IN (SELECT id FROM _escrows_to_delete);
DELETE FROM public.escrow_audit_logs WHERE user_id IN (SELECT id FROM _to_delete);
DELETE FROM public.invoice_audit_logs WHERE invoice_id IN (SELECT id FROM _invoices_to_delete);
DELETE FROM public.invoice_audit_logs WHERE user_id IN (SELECT id FROM _to_delete);

-- Factures
DELETE FROM public.invoices WHERE id IN (SELECT id FROM _invoices_to_delete);

-- Escrows
DELETE FROM public.escrows WHERE id IN (SELECT id FROM _escrows_to_delete);

-- Devis
DELETE FROM public.quotes WHERE id IN (SELECT id FROM _quotes_to_delete);

-- Projets
DELETE FROM public.projects WHERE id IN (SELECT id FROM _projects_to_delete);

-- Portefeuilles crédits artisans
DELETE FROM public.artisan_credit_wallets WHERE artisan_id IN (SELECT id FROM _to_delete);

-- Affiliations chambres des métiers
DELETE FROM public.artisan_affiliations WHERE artisan_id IN (SELECT id FROM _to_delete);

-- Documents de vérification
DELETE FROM public.verification_documents
WHERE artisan_id IN (SELECT id FROM _to_delete)
   OR reviewed_by IN (SELECT id FROM _to_delete);

-- Favoris (si la table existe : client_id = user, artisan_id = artisan)
DELETE FROM public.favorites WHERE client_id IN (SELECT id FROM _to_delete);
DELETE FROM public.favorites WHERE artisan_id IN (SELECT id FROM _to_delete);

-- Artisans (profil artisan = id ou user_id)
DELETE FROM public.artisans WHERE id IN (SELECT id FROM _to_delete);
DELETE FROM public.artisans WHERE user_id IN (SELECT id FROM _to_delete);

-- Profils
DELETE FROM public.profiles WHERE id IN (SELECT id FROM _to_delete);

-- =============================================================================
-- Nettoyage des tables temporaires
-- =============================================================================
DROP TABLE IF EXISTS _keep_ids;
DROP TABLE IF EXISTS _to_delete;
DROP TABLE IF EXISTS _projects_to_delete;
DROP TABLE IF EXISTS _quotes_to_delete;
DROP TABLE IF EXISTS _escrows_to_delete;
DROP TABLE IF EXISTS _invoices_to_delete;

-- Fin du script. Les comptes Auth (auth.users) des anciens comptes ont déjà été
-- supprimés par vous ; seules les données public (profiles, projects, etc.)
-- ont été nettoyées ici. Si un compte Auth orphelin apparaît encore dans le
-- Dashboard Auth, supprimez-le manuellement (Authentication > Users).
