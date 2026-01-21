# Configuration Supabase Storage

## Buckets à créer

### 1. Bucket `audio`
- **Usage** : Stocker les enregistrements vocaux (demandes et messages)
- **Public** : Non (privé)
- **Policies** :
  - Les utilisateurs authentifiés peuvent uploader
  - Les utilisateurs peuvent lire les fichiers de leurs projets

### 2. Bucket `photos`
- **Usage** : Stocker les photos (projets, portfolio, avis)
- **Public** : Oui (pour affichage)
- **Policies** :
  - Les utilisateurs authentifiés peuvent uploader
  - Tous peuvent lire

### 3. Bucket `documents`
- **Usage** : Stocker les documents PDF (factures proforma, devis PDF, etc.)
- **Public** : Oui (pour affichage)
- **Policies** :
  - Les utilisateurs authentifiés peuvent uploader
  - Tous peuvent lire

### 4. Bucket `videos`
- **Usage** : Stocker les fichiers vidéo (portfolio, projets, etc.)
- **Public** : Oui (pour affichage)
- **MIME Types acceptés** : video/mp4, video/quicktime, video/x-msvideo, video/webm, video/ogg, etc.
- **Policies** :
  - Les utilisateurs authentifiés peuvent uploader
  - Tous peuvent lire

## Configuration via SQL (à exécuter dans Supabase Dashboard)

```sql
-- Créer le bucket audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', false)
ON CONFLICT (id) DO NOTHING;

-- Créer le bucket photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Créer le bucket documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policies pour le bucket audio
CREATE POLICY "Users can upload audio"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'audio' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can read own audio"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'audio' AND
    auth.role() = 'authenticated'
  );

-- Policies pour le bucket photos
CREATE POLICY "Users can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'photos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can read photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

-- Policies pour le bucket documents
CREATE POLICY "Users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can read documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');
```

## Configuration via l'interface Supabase

1. Aller dans **Storage** dans le dashboard Supabase
2. Créer les buckets `audio`, `photos` et `documents`
3. Configurer les policies d'accès selon les besoins
4. **Important** : Le bucket `documents` doit accepter le type MIME `application/pdf`

