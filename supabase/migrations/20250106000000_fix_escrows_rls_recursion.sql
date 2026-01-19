-- Migration: Corriger la récursion infinie dans la politique RLS des escrows
-- Le problème: La politique INSERT vérifie la table escrows elle-même, créant une récursion infinie
-- La solution: Utiliser une fonction SECURITY DEFINER qui peut lire la table sans déclencher RLS

-- Supprimer l'ancienne politique problématique
DROP POLICY IF EXISTS "Clients can create escrows for their own projects" ON public.escrows;

-- Créer une fonction SECURITY DEFINER pour vérifier l'existence d'escrows actifs
-- Cette fonction peut lire la table escrows sans déclencher RLS
CREATE OR REPLACE FUNCTION public.check_active_escrow_exists(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier s'il existe un escrow actif pour ce projet
  -- Cette fonction s'exécute avec les privilèges du créateur, donc elle peut lire la table
  -- même si RLS est activé
  RETURN EXISTS (
    SELECT 1 FROM public.escrows e
    WHERE e.project_id = p_project_id
    AND e.status IN ('pending', 'held', 'advance_paid')
  );
END;
$$;

-- Recréer la politique INSERT en utilisant la fonction SECURITY DEFINER
CREATE POLICY "Clients can create escrows for their own projects"
ON public.escrows FOR INSERT
TO authenticated
WITH CHECK (
  -- Vérifier que le projet appartient au client authentifié
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = escrows.project_id
    AND projects.client_id = auth.uid()
  )
  -- S'assurer qu'il n'y a pas déjà un escrow actif pour ce projet
  -- Utiliser la fonction SECURITY DEFINER au lieu de NOT EXISTS direct
  AND NOT public.check_active_escrow_exists(escrows.project_id)
);

-- Commentaire sur la fonction
COMMENT ON FUNCTION public.check_active_escrow_exists(UUID) IS 
  'Vérifie s''il existe un escrow actif pour un projet donné. Fonction SECURITY DEFINER pour éviter la récursion RLS.';
