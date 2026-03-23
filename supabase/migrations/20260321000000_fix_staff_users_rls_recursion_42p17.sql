-- Correction récursion RLS staff_users (support Supabase SU-341750)
-- La politique super_admin_staff_via_staff faisait un SELECT sur staff_users dans sa condition
-- -> récursion infinie 42P17. Solution: fonctions SECURITY DEFINER qui contournent RLS.

-- 1) Fonction SECURITY DEFINER: vérifie si un user est dans staff_users (sans déclencher RLS)
CREATE OR REPLACE FUNCTION public.is_staff_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.staff_users WHERE auth_user_id = p_user_id LIMIT 1);
END;
$$;

-- 2) Fonction: vérifie si user est SUPER_ADMIN dans staff_users
CREATE OR REPLACE FUNCTION public.is_super_admin_staff(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff_users
    WHERE auth_user_id = p_user_id AND role = 'SUPER_ADMIN'
    LIMIT 1
  );
END;
$$;

-- 3) Supprimer la politique récursive
DROP POLICY IF EXISTS "super_admin_staff_via_staff" ON public.staff_users;

-- 4) Recréer une politique équivalente SANS SELECT sur staff_users
CREATE POLICY "super_admin_staff_full_access"
  ON public.staff_users FOR ALL
  USING (public.is_super_admin_staff(auth.uid()))
  WITH CHECK (public.is_super_admin_staff(auth.uid()));

-- 5) Recréer les politiques select/update en utilisant la fonction pour cohérence
DROP POLICY IF EXISTS "staff_users_select_own" ON public.staff_users;
DROP POLICY IF EXISTS "staff_users_update_own" ON public.staff_users;

CREATE POLICY "staff_users_select_own"
  ON public.staff_users FOR SELECT
  USING (auth_user_id = auth.uid() OR public.is_super_admin_staff(auth.uid()));

CREATE POLICY "staff_users_update_own"
  ON public.staff_users FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());
