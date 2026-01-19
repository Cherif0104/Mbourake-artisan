# Correction : Devis Non Visible et Erreur "Invalid key"

## 🔴 Problèmes Identifiés

1. **Erreur "Invalid key" persiste** : Le nom de fichier n'est toujours pas nettoyé correctement avant l'upload
2. **Erreur 409 (Conflict)** : Un devis existe déjà mais n'est pas visible côté client
3. **Devis créé mais non affiché** : Le devis existe en base de données mais n'apparaît pas dans l'interface

## ✅ Corrections Appliquées

### 1. Amélioration du Nettoyage de Nom de Fichier

**Fichier modifié : `src/lib/fileUtils.ts`**

- ✅ Limite de longueur réduite à 150 caractères (au lieu de 200) pour éviter de dépasser la limite de 255 caractères avec le chemin complet
- ✅ Normalisation des accents améliorée
- ✅ Remplacement de TOUS les caractères spéciaux (pas seulement certains)
- ✅ Ajout d'un identifiant si le nom est trop court

```typescript
// Limite à 150 caractères pour éviter: artisanId/proformas/[150 chars] + extension
.substring(0, 150);
```

### 2. Réorganisation de l'Ordre des Opérations

**Fichier modifié : `src/components/QuoteForm.tsx`**

- ✅ **Vérification du devis existant AVANT les uploads** : Évite d'uploader des fichiers si un devis existe déjà
- ✅ Messages de log améliorés pour le débogage

**Ordre avant** :
1. Upload audio
2. Upload PDF
3. Vérifier devis existant ❌

**Ordre après** :
1. Vérifier devis existant ✅
2. Upload audio
3. Upload PDF

### 3. Amélioration de la Récupération des Devis

**Fichier modifié : `src/pages/ProjectDetailsPage.tsx`**

- ✅ **Relation explicite** : Utilise `profiles!quotes_artisan_id_fkey` pour éviter les ambiguïtés
- ✅ **Fallback** : Si la relation échoue, récupère les devis sans les profils
- ✅ **Logs améliorés** : Meilleur débogage en cas d'erreur

```typescript
// Relation explicite
.select(`
  *,
  profiles!quotes_artisan_id_fkey (
    id,
    full_name,
    avatar_url,
    role
  )
`)

// Fallback si erreur
if (qError) {
  // Réessayer sans relation
  const { data: qDataFallback } = await supabase
    .from('quotes')
    .select('*')
    .eq('project_id', id);
}
```

## 🧪 Tests à Effectuer

### 1. Test Upload PDF avec Caractères Spéciaux

1. ✅ Ouvrir le formulaire de devis
2. ✅ Uploader un PDF avec un nom contenant :
   - Accents (é, à, è, etc.)
   - Espaces
   - Caractères spéciaux (&, (), ', etc.)
   - Nom long (>100 caractères)
3. ✅ Vérifier qu'il n'y a plus d'erreur "Invalid key"
4. ✅ Vérifier que le fichier est bien uploadé dans Supabase Storage

### 2. Test Création de Devis

1. ✅ Créer un devis normalement
2. ✅ Vérifier qu'il apparaît côté client immédiatement
3. ✅ Vérifier qu'il apparaît côté artisan

### 3. Test Devis Existant

1. ✅ Essayer de créer un deuxième devis pour le même projet
2. ✅ Vérifier que le message d'erreur est clair : "Vous avez déjà soumis un devis..."
3. ✅ Vérifier que l'upload ne se fait pas si un devis existe déjà

### 4. Test Affichage Côté Client

1. ✅ En tant qu'artisan, créer un devis
2. ✅ En tant que client, aller sur la page du projet
3. ✅ Vérifier que le devis apparaît dans la liste
4. ✅ Vérifier que les informations de l'artisan (nom, avatar) sont affichées

## 🔍 Diagnostic des Devis Non Visibles

Si un devis n'apparaît toujours pas côté client, vérifier :

### 1. Dans Supabase Dashboard (SQL Editor)

```sql
-- Vérifier si le devis existe
SELECT id, project_id, artisan_id, status, created_at
FROM quotes
WHERE project_id = 'ID_DU_PROJET'
ORDER BY created_at DESC;

-- Vérifier les profils associés
SELECT q.*, p.full_name, p.avatar_url
FROM quotes q
LEFT JOIN profiles p ON q.artisan_id = p.id
WHERE q.project_id = 'ID_DU_PROJET';
```

### 2. Vérifier les Policies RLS

Les policies RLS doivent permettre :
- ✅ Clients de voir tous les devis de leurs projets
- ✅ Artisans de voir leurs propres devis
- ✅ Admin de voir tous les devis

### 3. Vérifier les Relations

Si `profiles(*)` échoue, le fallback récupère les devis sans les profils, mais l'affichage peut être incomplet.

## 📋 Checklist de Vérification

- [ ] Le nom de fichier PDF est bien nettoyé (pas de caractères spéciaux)
- [ ] La vérification du devis existant se fait AVANT les uploads
- [ ] Les devis s'affichent côté client avec les informations de l'artisan
- [ ] Les logs de la console ne montrent plus d'erreur "Invalid key"
- [ ] Les devis créés apparaissent immédiatement après création

## 🎯 Statut

✅ **Corrections appliquées** :
- Nettoyage de nom de fichier amélioré
- Ordre des opérations réorganisé
- Récupération des devis améliorée avec fallback

⚠️ **À tester** : Vérifier que les devis s'affichent correctement côté client

---

**Date** : 2025-01-04  
**Fichiers modifiés** :
- `src/lib/fileUtils.ts` (amélioré)
- `src/components/QuoteForm.tsx` (réorganisé)
- `src/pages/ProjectDetailsPage.tsx` (amélioré)
