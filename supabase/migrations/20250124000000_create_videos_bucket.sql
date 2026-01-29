-- Migration: Créer le bucket videos pour les vidéos de projets
-- Le bucket "photos" refuse video/mp4 ; les vidéos doivent aller dans un bucket dédié.

INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Optionnel: autoriser uniquement les MIME types vidéo (si la colonne existe)
-- ALTER TABLE storage.buckets add column if not exists allowed_mime_types text[];
-- UPDATE storage.buckets SET allowed_mime_types = ARRAY['video/mp4','video/webm','video/quicktime','video/x-msvideo'] WHERE id = 'videos';

-- Policies pour le bucket videos
CREATE POLICY "Users can upload videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'videos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can read videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

CREATE POLICY "Users can delete own videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'videos' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
