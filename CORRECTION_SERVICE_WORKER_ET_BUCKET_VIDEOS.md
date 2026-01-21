# Corrections : Service Worker et Bucket Videos

## 🔴 Problèmes Identifiés

### 1. Erreur Service Worker : `chrome-extension` scheme
**Erreur** : `Failed to execute 'put' on 'Cache': Request scheme 'chrome-extension' is unsupported`

**Cause** : Le service worker essayait de mettre en cache des requêtes provenant d'extensions Chrome (schéma `chrome-extension://`), ce qui n'est pas supporté par l'API Cache.

**Solution** : Ajout de vérifications pour ignorer les schémas non supportés avant de tenter la mise en cache.

### 2. Erreur Upload Vidéo : Bucket `videos` introuvable
**Erreur** : `StorageApiError: Bucket not found`

**Cause** : Le bucket `videos` n'a pas encore été créé dans Supabase. La migration SQL n'a pas été appliquée.

**Solution** : Appliquer la migration SQL `APPLIQUER_MIGRATION_VIDEOS.sql` dans Supabase.

---

## ✅ Corrections Appliquées

### 1. Service Worker (`public/service-worker.js`)

**Modifications** :
- ✅ Ignorer les requêtes avec schémas non supportés (`chrome-extension:`, `moz-extension:`, etc.)
- ✅ Vérifier que la requête utilise le schéma `http` ou `https` avant la mise en cache
- ✅ Vérifier que la réponse est de type `basic` (requêtes CORS peuvent être `opaque`)
- ✅ Ajouter gestion d'erreur avec `.catch()` pour éviter les erreurs non gérées

**Code ajouté** :
```javascript
// Ignorer les schémas non supportés
if (url.protocol === 'chrome-extension:' || 
    url.protocol === 'moz-extension:' || 
    url.protocol === 'safari-extension:' ||
    !url.protocol.startsWith('http')) {
  return;
}

// Vérifier avant de mettre en cache
if (response.status === 200 && response.type === 'basic') {
  if (request.url.startsWith('http')) {
    cache.put(request, responseToCache).catch((err) => {
      console.warn('Failed to cache request:', request.url, err);
    });
  }
}
```

### 2. Bucket Videos

**Fichier de migration** : `APPLIQUER_MIGRATION_VIDEOS.sql`

**Action requise** : ⚠️ **À APPLIQUER DANS SUPABASE**

1. Aller dans **Supabase Dashboard** → **SQL Editor**
2. Copier-coller le contenu de `APPLIQUER_MIGRATION_VIDEOS.sql`
3. Exécuter la requête
4. Vérifier que le bucket a été créé :
   ```sql
   SELECT id, name, public, allowed_mime_types 
   FROM storage.buckets 
   WHERE id = 'videos';
   ```

---

## 📋 Vérifications

### Service Worker
- ✅ Plus d'erreurs `chrome-extension` dans la console
- ✅ Le service worker fonctionne normalement
- ✅ Les requêtes légitimes sont toujours mises en cache

### Bucket Videos
- ⚠️ **À FAIRE** : Appliquer la migration SQL
- ✅ Après application, les uploads de vidéos fonctionneront
- ✅ Support de tous les formats vidéo (mp4, mov, avi, webm, etc.)

---

## 🎯 Statut

- ✅ **Service Worker** : Corrigé et déployé
- ⚠️ **Bucket Videos** : Code prêt, migration à appliquer dans Supabase

---

**Date** : 2025-01-21  
**Fichiers modifiés** :
- `public/service-worker.js` (corrigé)
- `APPLIQUER_MIGRATION_VIDEOS.sql` (déjà créé précédemment)
