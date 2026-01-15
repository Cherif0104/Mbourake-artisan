# 🚀 GUIDE RECRÉATION PROJET VERCEL - MBOURAKÉ

## ✅ FICHIERS VÉRIFIÉS ET PRÊTS

Tous les fichiers sont maintenant configurés correctement pour Vercel :

### ✅ Fichiers de Configuration

1. **`vercel.json`** ✅
   - Version 2 spécifiée
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Rewrites configurés pour SPA
   - Headers de sécurité

2. **`public/_redirects`** ✅
   - Backup pour Netlify/Vercel
   - Route catch-all: `/*    /index.html   200`

3. **`vite.config.ts`** ✅
   - Build optimisé
   - Output directory: `dist`
   - Code splitting configuré

4. **`package.json`** ✅
   - Build script: `npm run build`
   - Toutes les dépendances présentes

---

## 📋 ÉTAPES POUR RECRÉER LE PROJET VERCEL

### ÉTAPE 1: Supprimer l'ancien projet Vercel

1. Aller sur **Vercel Dashboard** : https://vercel.com/dashboard
2. Cliquer sur le projet **mbourake**
3. Aller dans **Settings** → **General**
4. Scroller en bas et cliquer sur **Delete Project**
5. Confirmer la suppression

### ÉTAPE 2: Recréer le projet depuis GitHub

1. Dans Vercel Dashboard, cliquer sur **Add New** → **Project**
2. Importer le repository GitHub **Cherif0104/Mbourake**
3. Vercel détectera automatiquement **Vite** comme framework

### ÉTAPE 3: Configuration du projet (IMPORTANT)

Dans la page de configuration, vérifier/modifier :

#### Framework Preset
- ✅ **Vite** (détecté automatiquement)

#### Root Directory
- Laisser **vide** (ou `./`)

#### Build and Output Settings
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

#### Environment Variables
Ajouter toutes les variables d'environnement nécessaires :
```
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anon
VITE_GOOGLE_CLIENT_ID=votre_client_id_google (si OAuth)
```

### ÉTAPE 4: Déployer

1. Cliquer sur **Deploy**
2. Attendre la fin du build
3. Vérifier que le déploiement réussit

### ÉTAPE 5: Configurer le domaine personnalisé (si nécessaire)

1. Dans le projet Vercel → **Settings** → **Domains**
2. Ajouter `mbourake.com` et `www.mbourake.com`
3. Configurer les DNS selon les instructions Vercel

---

## 🔍 VÉRIFICATIONS POST-DÉPLOIEMENT

### Test 1: Route principale
- ✅ Aller sur `https://www.mbourake.com`
- ✅ Doit afficher la page d'onboarding

### Test 2: Route avec refresh
- ✅ Aller sur `https://www.mbourake.com/landing`
- ✅ **FAIRE UN REFRESH (F5)**
- ✅ Doit afficher la landing page (PAS de 404)

### Test 3: Route login
- ✅ Aller sur `https://www.mbourake.com/login`
- ✅ **FAIRE UN REFRESH (F5)**
- ✅ Doit afficher la page login (PAS de 404)

### Test 4: Route dashboard
- ✅ Se connecter et aller sur `/dashboard`
- ✅ **FAIRE UN REFRESH (F5)**
- ✅ Doit afficher le dashboard (PAS de 404)

### Test 5: Route projet
- ✅ Aller sur `/projects/[id]`
- ✅ **FAIRE UN REFRESH (F5)**
- ✅ Doit afficher les détails du projet (PAS de 404)

---

## 🛠️ CONFIGURATION VERCEL DASHBOARD (À VÉRIFIER)

Dans **Settings** → **Build & Development Settings** :

### Framework Settings
- **Framework Preset**: Vite ✅
- **Build Command**: `npm run build` ✅ (Override activé si nécessaire)
- **Output Directory**: `dist` ✅ (Override activé si nécessaire)
- **Install Command**: `npm install` (par défaut)
- **Development Command**: `vite` (par défaut)

### Root Directory
- Laisser **vide** (ou `./`)

### Node.js Version
- Recommandé: **20.x** ou **22.x**

---

## 🐛 EN CAS DE PROBLÈME

### Si les 404 persistent :

1. **Vérifier `vercel.json`** :
   - Le fichier doit être à la racine du projet
   - Vérifier la syntaxe JSON (pas d'erreurs)

2. **Vérifier `public/_redirects`** :
   - Le fichier doit exister dans `public/`
   - Contenu: `/*    /index.html   200`

3. **Vérifier les logs de build** :
   - Dans Vercel → **Deployments** → Cliquer sur le dernier déploiement
   - Vérifier les **Build Logs** pour erreurs

4. **Forcer un nouveau déploiement** :
   - Dans Vercel → **Deployments** → Cliquer sur **...** → **Redeploy**

5. **Vérifier les variables d'environnement** :
   - S'assurer que toutes les variables sont bien configurées
   - Vérifier qu'elles commencent par `VITE_` pour être exposées au build

---

## ✅ CHECKLIST FINALE

Avant de recréer le projet, vérifier :

- [ ] `vercel.json` existe à la racine
- [ ] `public/_redirects` existe
- [ ] `package.json` contient le script `build`
- [ ] `vite.config.ts` est configuré avec `outDir: 'dist'`
- [ ] Toutes les variables d'environnement sont prêtes
- [ ] Le code est poussé sur GitHub (branche `main`)
- [ ] Aucun fichier sensible n'est dans le repo (vérifier `.gitignore`)

---

## 🎯 RÉSULTAT ATTENDU

Après recréation :
- ✅ Build réussi
- ✅ Toutes les routes fonctionnent
- ✅ **AUCUN 404 après refresh**
- ✅ Routing SPA fonctionnel
- ✅ Service Worker fonctionne (PWA)

---

**Tout est prêt pour la recréation ! 🚀**
