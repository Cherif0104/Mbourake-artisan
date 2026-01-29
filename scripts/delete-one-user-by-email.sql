-- =============================================================================
-- SUPPRESSION D'UN SEUL COMPTE PAR EMAIL (données public uniquement)
-- =============================================================================
-- À exécuter dans Supabase : SQL Editor.
-- Modifier la variable ci-dessous avec l'email du compte à supprimer.
-- Après exécution, supprimer l'utilisateur dans Authentication > Users si besoin.
-- =============================================================================

DO $$
DECLARE
  -- Modifier ici l'email du compte à supprimer
  target_email text := 'exemple@email.com';
  uid uuid;
BEGIN
  -- Récupérer l'id du compte (auth.users)
  SELECT id INTO uid FROM auth.users WHERE email = target_email;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur trouvé avec l''email: %', target_email;
  END IF;

  RAISE NOTICE 'Suppression des données pour user_id: % (%)', uid, target_email;

  -- Suppressions dans l'ordre (clés étrangères)
  DELETE FROM public.notifications WHERE user_id = uid;
  DELETE FROM public.expenses WHERE user_id = uid;
  DELETE FROM public.quote_revisions WHERE requested_by = uid;
  DELETE FROM public.reviews WHERE client_id = uid OR artisan_id = uid;
  DELETE FROM public.messages WHERE sender_id = uid;
  DELETE FROM public.messages WHERE project_id IN (SELECT id FROM public.projects WHERE client_id = uid OR target_artisan_id = uid);
  DELETE FROM public.project_audit_logs WHERE user_id = uid OR project_id IN (SELECT id FROM public.projects WHERE client_id = uid OR target_artisan_id = uid);
  DELETE FROM public.quote_audit_logs WHERE user_id = uid OR quote_id IN (SELECT id FROM public.quotes WHERE artisan_id = uid OR project_id IN (SELECT id FROM public.projects WHERE client_id = uid OR target_artisan_id = uid));
  DELETE FROM public.quote_revisions WHERE quote_id IN (SELECT id FROM public.quotes WHERE artisan_id = uid OR project_id IN (SELECT id FROM public.projects WHERE client_id = uid OR target_artisan_id = uid));
  DELETE FROM public.escrow_audit_logs WHERE escrow_id IN (SELECT id FROM public.escrows WHERE project_id IN (SELECT id FROM public.projects WHERE client_id = uid OR target_artisan_id = uid));
  DELETE FROM public.invoice_audit_logs WHERE user_id = uid OR invoice_id IN (SELECT id FROM public.invoices WHERE client_id = uid OR artisan_id = uid);
  DELETE FROM public.invoices WHERE client_id = uid OR artisan_id = uid;
  DELETE FROM public.escrows WHERE project_id IN (SELECT id FROM public.projects WHERE client_id = uid OR target_artisan_id = uid);
  DELETE FROM public.quotes WHERE artisan_id = uid OR project_id IN (SELECT id FROM public.projects WHERE client_id = uid OR target_artisan_id = uid);
  DELETE FROM public.project_audit_logs WHERE project_id IN (SELECT id FROM public.projects WHERE client_id = uid OR target_artisan_id = uid);
  DELETE FROM public.projects WHERE client_id = uid OR target_artisan_id = uid;
  DELETE FROM public.artisan_credit_wallets WHERE artisan_id = uid;
  DELETE FROM public.artisan_affiliations WHERE artisan_id = uid;
  DELETE FROM public.verification_documents WHERE artisan_id = uid OR reviewed_by = uid;
  DELETE FROM public.favorites WHERE client_id = uid OR artisan_id = uid;
  DELETE FROM public.artisans WHERE id = uid OR user_id = uid;
  DELETE FROM public.profiles WHERE id = uid;

  RAISE NOTICE 'Données public supprimées pour %. Supprimez l''utilisateur dans Authentication > Users si besoin.', target_email;
END $$;
