-- Migration: Créer le bucket documents pour les PDF et autres documents
-- Permet d'uploader des factures proforma, devis PDF, etc.

-- Supprimer les policies si elles existent déjà (pour éviter les erreurs en cas de réexécution)
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;

-- Créer le bucket documents (public pour permettre l'accès aux devis)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policies pour le bucket documents
-- Les utilisateurs authentifiés peuvent uploader
CREATE POLICY "Users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
  );

-- Tous peuvent lire les documents (pour afficher les devis/factures)
CREATE POLICY "Anyone can read documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

-- Les utilisateurs peuvent supprimer leurs propres documents
CREATE POLICY "Users can delete own documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
