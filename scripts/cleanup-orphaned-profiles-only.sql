-- =============================================================================
-- NETTOYAGE UNIQUEMENT DES DONNÉES ORPHELINES
-- =============================================================================
-- Supprime UNIQUEMENT les profils (et toutes leurs données) qui n'ont plus de
-- compte Auth : id présent dans public.profiles mais absent de auth.users.
-- Tous les comptes qui ont encore une connexion (email dans Auth) sont conservés.
--
-- À exécuter dans Supabase : SQL Editor (Dashboard > SQL Editor).
-- Idéal pour retirer les "fantômes" (ex-artisans de test dont l'email a été
-- supprimé dans Authentication) des listes de catégories et de la recherche.
-- =============================================================================

-- Étape 0 : Vérification (exécuter d'abord pour voir ce qui sera supprimé)
-- Décommenter et exécuter uniquement cette partie pour un aperçu sans rien supprimer.
/*
DO $$
DECLARE
  orphan_count int;
  projects_count int;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM public.profiles p
  WHERE p.id NOT IN (SELECT id FROM auth.users);
  SELECT COUNT(*) INTO projects_count FROM public.projects
  WHERE client_id NOT IN (SELECT id FROM auth.users)
     OR target_artisan_id NOT IN (SELECT id FROM auth.users);
  RAISE NOTICE 'Profils orphelins qui seront supprimés: %', orphan_count;
  RAISE NOTICE 'Projets concernés (ordre de grandeur): %', projects_count;
END $$;
*/

-- =============================================================================
-- Étape 1 : IDs des profils orphelins (présents en public, absents de Auth)
-- =============================================================================

DROP TABLE IF EXISTS _to_delete;
CREATE TEMP TABLE _to_delete AS
SELECT id FROM public.profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- (Si _to_delete est vide, les suppressions ci-dessous ne toucheront aucune ligne.)

-- Projets à supprimer (créés par ou ciblant un profil orphelin)
DROP TABLE IF EXISTS _projects_to_delete;
CREATE TEMP TABLE _projects_to_delete AS
SELECT id FROM public.projects
WHERE client_id IN (SELECT id FROM _to_delete)
   OR target_artisan_id IN (SELECT id FROM _to_delete);

-- Devis à supprimer
DROP TABLE IF EXISTS _quotes_to_delete;
CREATE TEMP TABLE _quotes_to_delete AS
SELECT id FROM public.quotes
WHERE project_id IN (SELECT id FROM _projects_to_delete)
   OR artisan_id IN (SELECT id FROM _to_delete);

-- Escrows à supprimer
DROP TABLE IF EXISTS _escrows_to_delete;
CREATE TEMP TABLE _escrows_to_delete AS
SELECT id FROM public.escrows
WHERE project_id IN (SELECT id FROM _projects_to_delete);

-- Factures à supprimer (table optionnelle : si elle n'existe pas, table vide)
DROP TABLE IF EXISTS _invoices_to_delete;
CREATE TEMP TABLE _invoices_to_delete (id uuid);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    INSERT INTO _invoices_to_delete
    SELECT id FROM public.invoices
    WHERE client_id IN (SELECT id FROM _to_delete) OR artisan_id IN (SELECT id FROM _to_delete);
  END IF;
END $$;

-- =============================================================================
-- Étape 2 : Suppressions (ordre respectant les clés étrangères)
-- Tables optionnelles (notifications, invoices, favorites) : exécutées seulement si elles existent.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    DELETE FROM public.notifications WHERE user_id IN (SELECT id FROM _to_delete);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
    DELETE FROM public.expenses WHERE user_id IN (SELECT id FROM _to_delete);
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_revisions') THEN
    DELETE FROM public.quote_revisions WHERE requested_by IN (SELECT id FROM _to_delete);
    DELETE FROM public.quote_revisions WHERE quote_id IN (SELECT id FROM _quotes_to_delete);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    DELETE FROM public.reviews WHERE client_id IN (SELECT id FROM _to_delete) OR artisan_id IN (SELECT id FROM _to_delete);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    DELETE FROM public.messages WHERE sender_id IN (SELECT id FROM _to_delete);
    DELETE FROM public.messages WHERE project_id IN (SELECT id FROM _projects_to_delete);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_audit_logs') THEN
    DELETE FROM public.project_audit_logs WHERE project_id IN (SELECT id FROM _projects_to_delete);
    DELETE FROM public.project_audit_logs WHERE user_id IN (SELECT id FROM _to_delete);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_audit_logs') THEN
    DELETE FROM public.quote_audit_logs WHERE quote_id IN (SELECT id FROM _quotes_to_delete);
    DELETE FROM public.quote_audit_logs WHERE user_id IN (SELECT id FROM _to_delete);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'escrow_audit_logs') THEN
    DELETE FROM public.escrow_audit_logs WHERE escrow_id IN (SELECT id FROM _escrows_to_delete);
    DELETE FROM public.escrow_audit_logs WHERE user_id IN (SELECT id FROM _to_delete);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_audit_logs') THEN
    DELETE FROM public.invoice_audit_logs WHERE invoice_id IN (SELECT id FROM _invoices_to_delete);
    DELETE FROM public.invoice_audit_logs WHERE user_id IN (SELECT id FROM _to_delete);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    DELETE FROM public.invoices WHERE id IN (SELECT id FROM _invoices_to_delete);
  END IF;
END $$;
DELETE FROM public.escrows WHERE id IN (SELECT id FROM _escrows_to_delete);
DELETE FROM public.quotes WHERE id IN (SELECT id FROM _quotes_to_delete);
DELETE FROM public.projects WHERE id IN (SELECT id FROM _projects_to_delete);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'artisan_credit_wallets') THEN
    DELETE FROM public.artisan_credit_wallets WHERE artisan_id IN (SELECT id FROM _to_delete);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'artisan_affiliations') THEN
    DELETE FROM public.artisan_affiliations WHERE artisan_id IN (SELECT id FROM _to_delete);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'verification_documents') THEN
    DELETE FROM public.verification_documents WHERE artisan_id IN (SELECT id FROM _to_delete) OR reviewed_by IN (SELECT id FROM _to_delete);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'favorites') THEN
    DELETE FROM public.favorites WHERE client_id IN (SELECT id FROM _to_delete);
    DELETE FROM public.favorites WHERE artisan_id IN (SELECT id FROM _to_delete);
  END IF;
END $$;
DELETE FROM public.artisans WHERE id IN (SELECT id FROM _to_delete);
DELETE FROM public.artisans WHERE user_id IN (SELECT id FROM _to_delete);
DELETE FROM public.profiles WHERE id IN (SELECT id FROM _to_delete);

DROP TABLE IF EXISTS _to_delete;
DROP TABLE IF EXISTS _projects_to_delete;
DROP TABLE IF EXISTS _quotes_to_delete;
DROP TABLE IF EXISTS _escrows_to_delete;
DROP TABLE IF EXISTS _invoices_to_delete;

-- Les profils orphelins et leurs données ont été supprimés.
-- Les tables optionnelles (notifications, invoices, invoice_audit_logs, favorites)
-- sont ignorées si elles n'existent pas dans votre projet.
