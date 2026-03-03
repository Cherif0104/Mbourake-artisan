-- Dashboard partenaire v1 : l'admin d'une chambre peut mettre à jour sa fiche (nom, région, contact)
DROP POLICY IF EXISTS "Chambre admin updates own" ON chambres_metier;
CREATE POLICY "Chambre admin updates own"
  ON chambres_metier FOR UPDATE
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());
