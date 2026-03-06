-- Rendre le bucket audio lisible par tous (URL publique) pour que les messages vocaux
-- des devis et révisions (artisan → client) soient jouables côté client sans auth.
-- Sans cela, la balise <audio src="getPublicUrl(...)"> est chargée sans JWT et le son reste vide.
-- À appliquer : supabase db push  ou  exécuter ce fichier dans le SQL Editor du Dashboard.

-- Rendre le bucket public si il existe
UPDATE storage.buckets
SET public = true
WHERE id = 'audio';

-- Créer le bucket si il n'existe pas (certains projets ne l'ont peut-être pas en migration)
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Permettre la lecture par tous (nécessaire pour que l'URL publique fonctionne)
DROP POLICY IF EXISTS "Users can read own audio" ON storage.objects;
CREATE POLICY "Anyone can read audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audio');
