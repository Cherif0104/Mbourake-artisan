# 🚀 Guide de Redéploiement sur Vercel

## 📋 Prérequis

- Compte Vercel actif
- Projet Git (GitHub, GitLab, Bitbucket)
- Variables d'environnement Supabase

---

## ⚡ Redéploiement Rapide

### Option 1 : Via le Dashboard Vercel (Recommandé)

1. **Aller sur [vercel.com](https://vercel.com)**
2. **Cliquer sur "Add New Project"**
3. **Importer votre repository Git**
   - Sélectionner le repository Mbourake
   - Cliquer sur "Import"

4. **Configurer le projet :**
   - **Framework Preset** : Vite
   - **Root Directory** : `./` (racine)
   - **Build Command** : `npm run build` (auto-détecté)
   - **Output Directory** : `dist` (auto-détecté)
   - **Install Command** : `npm install` (auto-détecté)

5. **Ajouter les Variables d'Environnement :**
   - Cliquer sur "Environment Variables"
   - Ajouter les variables suivantes :

   ```
   VITE_SUPABASE_URL=https://votre-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=votre_cle_anon
   ```

6. **Déployer !**
   - Cliquer sur "Deploy"
   - Attendre la fin du build (2-3 minutes)

---

### Option 2 : Via CLI Vercel

1. **Installer Vercel CLI (si pas déjà fait) :**
   ```bash
   npm install -g vercel
   ```

2. **Se connecter à Vercel :**
   ```bash
   vercel login
   ```

3. **Dans le répertoire du projet :**
   ```bash
   cd "d:\DEVLAB & DEVOPS\Mbourake"
   ```

4. **Déployer :**
   ```bash
   vercel
   ```
   
   - Suivre les prompts :
     - "Set up and deploy?" → **Y**
     - "Which scope?" → Sélectionner votre compte/organisation
     - "Link to existing project?" → **N** (nouveau projet)
     - "Project name?" → **mbourake** (ou autre nom)
     - "Directory?" → **./** (appuyer sur Enter)
     - "Override settings?" → **N**

5. **Ajouter les variables d'environnement :**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```
   
   - Entrer les valeurs à chaque prompt
   - Sélectionner **Production, Preview, Development** pour chaque variable

6. **Redéployer avec les variables :**
   ```bash
   vercel --prod
   ```

---

## 🔐 Variables d'Environnement Requises

### Dans Vercel Dashboard → Settings → Environment Variables

| Variable | Description | Exemple |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | URL de votre projet Supabase | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clé publique (anon) Supabase | `eyJhbGc...` |

**Important :** 
- ✅ Sélectionner **Production**, **Preview**, et **Development** pour chaque variable
- ✅ Vérifier que les variables sont bien définies après l'ajout

---

## ✅ Vérification Post-Déploiement

1. **Vérifier que le build a réussi**
   - Aller dans l'onglet "Deployments" sur Vercel
   - Statut doit être ✅ "Ready"

2. **Tester l'application :**
   - Ouvrir l'URL fournie par Vercel (ex: `mbourake.vercel.app`)
   - Vérifier que la page se charge
   - Tester la connexion/inscription
   - Vérifier les fonctionnalités principales

3. **Vérifier les routes SPA :**
   - Tester `/landing`
   - Tester `/login`
   - Tester `/dashboard` (après connexion)
   - Vérifier qu'il n'y a pas d'erreur 404

---

## 🔧 Configuration Vercel

Le fichier `vercel.json` est déjà configuré avec :
- ✅ Rewrites pour SPA (React Router)
- ✅ Headers de sécurité
- ✅ Cache pour les assets statiques
- ✅ Configuration Vite

**Pas besoin de modifier quoi que ce soit !**

---

## 🐛 Résolution de Problèmes

### Erreur 404 sur les routes
**Solution :** Le `vercel.json` est déjà configuré. Si le problème persiste, vérifier que le fichier est bien dans le repository Git.

### Variables d'environnement non prises en compte
**Solution :**
1. Vérifier que les variables sont bien ajoutées dans Vercel
2. Redéployer après l'ajout : `vercel --prod` ou via Dashboard
3. Les variables commençant par `VITE_` sont exposées côté client

### Erreur de build
**Solution :**
1. Vérifier les logs de build dans Vercel Dashboard
2. Tester en local : `npm run build`
3. Vérifier que toutes les dépendances sont dans `package.json`

### CORS ou erreurs Supabase
**Solution :**
1. Vérifier les URLs dans les variables d'environnement
2. Vérifier les RLS policies dans Supabase
3. Vérifier que les clés Supabase sont correctes

---

## 📝 Commandes Utiles

```bash
# Déployer en production
vercel --prod

# Déployer en preview
vercel

# Voir les variables d'environnement
vercel env ls

# Ajouter une variable
vercel env add VARIABLE_NAME

# Supprimer une variable
vercel env rm VARIABLE_NAME

# Voir les logs de déploiement
vercel logs [deployment-url]

# Lier à un projet existant
vercel link
```

---

## 🌐 Domaines Personnalisés (Optionnel)

Si vous avez un domaine (ex: `mbourake.com`) :

1. Aller dans **Vercel Dashboard → Settings → Domains**
2. Ajouter votre domaine
3. Suivre les instructions pour configurer les DNS
4. Vercel génère automatiquement le certificat SSL

---

## 🔄 Déploiements Automatiques

Par défaut, Vercel déploie automatiquement :
- ✅ **Push sur `main`/`master`** → Déploiement en production
- ✅ **Pull Requests** → Déploiement en preview
- ✅ **Branches** → Déploiement en preview

Vous pouvez modifier ces règles dans **Settings → Git**

---

## 📚 Ressources

- [Documentation Vercel](https://vercel.com/docs)
- [Documentation Vite + Vercel](https://vercel.com/guides/deploying-vite)
- [Variables d'environnement Vercel](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Date de création :** 2025-01-XX  
**Dernière mise à jour :** 2025-01-XX
