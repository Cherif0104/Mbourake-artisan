-- Migration: Création du bucket videos pour les fichiers vidéo
-- Date: 2025-01-21

-- Créer le bucket videos (public pour permettre l'accès aux vidéos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  NULL, -- Pas de limite de taille
  ARRAY[
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/webm',
    'video/ogg',
    'video/3gpp',
    'video/x-matroska',
    'video/*' -- Accepter tous les types vidéo
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Permettre l'upload aux utilisateurs authentifiés
DROP POLICY IF EXISTS "Users can upload videos" ON storage.objects;
CREATE POLICY "Users can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos');

-- Policy: Permettre la lecture publique
DROP POLICY IF EXISTS "Public can read videos" ON storage.objects;
CREATE POLICY "Public can read videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'videos');

-- Policy: Permettre la suppression aux utilisateurs authentifiés (leurs propres fichiers)
DROP POLICY IF EXISTS "Users can delete their own videos" ON storage.objects;
CREATE POLICY "Users can delete their own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Commentaire
COMMENT ON TABLE storage.buckets IS 'Bucket videos créé pour stocker les fichiers vidéo (portfolio, projets, etc.)';
