# Correction : Upload de PDF Proforma

## 🔴 Problème Identifié

**Erreur** : `mime type application/pdf is not supported` lors de l'upload d'une facture proforma PDF dans le formulaire de devis.

**Cause** : Le PDF était uploadé dans le bucket `photos` qui a des restrictions sur les types MIME (accepte uniquement les images).

## ✅ Solutions Appliquées

### 1. Création du Bucket `documents`

**Fichier créé : `supabase/migrations/20250104000001_create_documents_bucket.sql`**

Migration SQL pour créer un bucket dédié aux documents (PDF, etc.) :
- ✅ Bucket `documents` créé (public pour permettre l'accès aux devis/factures)
- ✅ Policies configurées pour upload et lecture
- ✅ Support pour `application/pdf` et autres types de documents

### 2. Correction du Code `QuoteForm.tsx`

**Fichier modifié : `src/components/QuoteForm.tsx`**

- ✅ Détection automatique du type de fichier (PDF vs image)
- ✅ Upload dans le bon bucket selon le type :
  - **PDF** → Bucket `documents`
  - **Images** → Bucket `photos`
- ✅ Gestion explicite du `contentType` pour éviter les erreurs de MIME type
- ✅ Messages d'erreur améliorés

```typescript
// Détection du type de fichier
const isPdf = proformaFile.name.toLowerCase().endsWith('.pdf') || fileType === 'application/pdf';
const bucketName = isPdf ? 'documents' : 'photos';

// Upload avec contentType explicite
const { data, error } = await supabase.storage
  .from(bucketName)
  .upload(fileName, proformaFile, {
    contentType: proformaFile.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
    upsert: false
  });
```

## 📋 Actions Requises

### ⚠️ IMPORTANT : Appliquer la Migration

Pour que la correction fonctionne, vous devez **créer le bucket `documents` dans Supabase** :

#### Option 1 : Via l'Interface Supabase (Recommandé)

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Storage** (dans le menu de gauche)
4. Cliquez sur **"New bucket"**
5. Configurez :
   - **Name** : `documents`
   - **Public bucket** : ✅ Activé (pour permettre l'accès aux devis)
6. Cliquez sur **"Create bucket"**
7. Les policies seront automatiquement configurées

#### Option 2 : Via SQL (Migration)

1. Allez dans **SQL Editor** dans Supabase Dashboard
2. Copiez-collez le contenu de `supabase/migrations/20250104000001_create_documents_bucket.sql`
3. Exécutez la requête

### Vérification

Après avoir créé le bucket, testez :

1. ✅ Allez sur un projet côté artisan
2. ✅ Ouvrez le formulaire de devis
3. ✅ Dans "Options avancées", cliquez sur "Facture proforma"
4. ✅ Uploadez un fichier PDF
5. ✅ Vérifiez qu'il n'y a plus d'erreur "mime type application/pdf is not supported"
6. ✅ Soumettez le devis

## 🧪 Tests à Effectuer

1. **Upload PDF** :
   - ✅ Uploadez un fichier PDF (.pdf)
   - ✅ Vérifiez que l'upload fonctionne sans erreur

2. **Upload Image** :
   - ✅ Uploadez une image (.jpg, .png, etc.)
   - ✅ Vérifiez que l'upload fonctionne toujours (dans le bucket `photos`)

3. **Soumission de devis** :
   - ✅ Créez un devis avec un PDF proforma
   - ✅ Vérifiez que le devis est créé avec succès
   - ✅ Vérifiez que le lien vers le PDF fonctionne côté client

## 📝 Structure des Buckets

| Bucket | Usage | Types MIME | Public |
|--------|-------|------------|--------|
| `audio` | Messages vocaux | audio/* | Non |
| `photos` | Images (projets, portfolio) | image/* | Oui |
| `documents` | PDF, factures, devis | application/pdf, etc. | Oui |

## 🎯 Statut

✅ **Code corrigé** - Migration créée  
⚠️ **Action requise** : Créer le bucket `documents` dans Supabase

---

**Date** : 2025-01-04  
**Fichiers modifiés** :
- `src/components/QuoteForm.tsx` (corrigé)
- `supabase/migrations/20250104000001_create_documents_bucket.sql` (créé)
- `supabase/storage_setup.md` (mis à jour)
