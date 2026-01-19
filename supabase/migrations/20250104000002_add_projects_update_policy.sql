-- Migration: Ajouter les politiques RLS UPDATE pour la table projects
-- Permet aux clients de mettre à jour leurs propres projets (annulation, etc.)

-- Les clients peuvent mettre à jour leurs propres projets
-- (statut, détails, etc.)
CREATE POLICY "Clients can update their own projects"
ON projects FOR UPDATE
TO authenticated
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);

-- Les artisans peuvent mettre à jour certains champs des projets où ils sont impliqués
-- (par exemple, si un projet leur est assigné directement)
-- Note: Actuellement, les artisans ne modifient pas directement les projets,
-- mais cette politique permet la flexibilité future
-- CREATE POLICY "Artisans can update assigned projects"
-- ON projects FOR UPDATE
-- TO authenticated
-- USING (target_artisan_id = auth.uid())
-- WITH CHECK (target_artisan_id = auth.uid());
