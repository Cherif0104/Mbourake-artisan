-- Permettre à l'artisan authentifié de créer sa ligne wallet (useProfile, crédits de bienvenue).
-- Auparavant seuls SELECT/UPDATE existaient → POST 403 si l'init profil tentait un insert.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artisan_credit_wallets'
      AND policyname = 'Artisan insert own wallet'
  ) THEN
    CREATE POLICY "Artisan insert own wallet"
    ON public.artisan_credit_wallets
    FOR INSERT
    TO public
    WITH CHECK (artisan_id = auth.uid());
  END IF;
END $$;
