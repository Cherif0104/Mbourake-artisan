-- =============================================================================
-- Fonction : promouvoir un utilisateur en admin par son email
-- =============================================================================
-- À utiliser depuis le SQL Editor Supabase si un utilisateur existe déjà
-- (créé via la plateforme ou Authentication > Users) et doit devenir admin.
--
-- Exemple : SELECT public.promote_user_to_admin('admin@example.com');
-- =============================================================================

CREATE OR REPLACE FUNCTION public.promote_user_to_admin(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'promote_user_to_admin: email requis';
  END IF;

  SELECT id INTO uid FROM auth.users WHERE email = trim(lower(p_email));
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur Auth avec l''email: %', p_email;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, updated_at)
  VALUES (
    uid,
    trim(lower(p_email)),
    COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = uid), 'Administrateur'),
    'admin',
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = now();

  RAISE NOTICE 'Utilisateur % promu admin (id: %)', p_email, uid;
END;
$$;

COMMENT ON FUNCTION public.promote_user_to_admin(text) IS
  'Promouvoir un utilisateur existant (auth.users) en administrateur (profiles.role = admin). À exécuter depuis le SQL Editor avec un email valide.';
