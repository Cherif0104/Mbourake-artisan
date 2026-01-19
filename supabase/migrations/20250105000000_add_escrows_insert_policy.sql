-- Migration: Ajouter la politique RLS pour permettre aux clients de créer des escrows

-- Politique pour permettre aux clients de créer des escrows pour leurs propres projets
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
  AND NOT EXISTS (
    SELECT 1 FROM public.escrows e
    WHERE e.project_id = escrows.project_id
    AND e.status IN ('pending', 'held', 'advance_paid')
  )
);

-- Politique pour permettre aux clients de mettre à jour leurs propres escrows (pour le paiement initial)
CREATE POLICY "Clients can update own escrows for payment"
ON public.escrows FOR UPDATE
TO authenticated
USING (
  -- L'utilisateur peut mettre à jour un escrow si c'est le client du projet associé
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = escrows.project_id
    AND projects.client_id = auth.uid()
  )
)
WITH CHECK (
  -- Même vérification pour WITH CHECK
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = escrows.project_id
    AND projects.client_id = auth.uid()
  )
);
