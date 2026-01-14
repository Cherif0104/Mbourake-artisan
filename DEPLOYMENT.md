# 🚀 Guide de Déploiement Mbourake

## Préparation du Déploiement

### 1. Variables d'Environnement Requises

Créez un fichier `.env` à la racine du projet avec :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon_supabase
```

### 2. Configuration Supabase

#### Buckets Storage
Assurez-vous que les buckets suivants existent :
- `photos` (public)
- `audio` (public)

#### Politiques RLS
Vérifiez que toutes les politiques RLS sont activées et correctement configurées.

#### Triggers
Les triggers suivants doivent être actifs :
- `set_project_number_trigger` - Génère automatiquement les numéros de projet
- `set_quote_number_trigger` - Génère automatiquement les numéros de devis

### 3. Build de Production

```bash
# Installer les dépendances
npm install

# Build
npm run build
```

Le dossier `dist/` contiendra les fichiers de production.

## Déploiement sur Vercel

### Option 1: Via GitHub (Recommandé)

1. **Push vers GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/Cherif0104/Mbourake.git
git branch -M main
git push -u origin main
```

2. **Connecter sur Vercel**
   - Allez sur [vercel.com](https://vercel.com)
   - Importez le repository GitHub
   - Configurez les variables d'environnement
   - Déployez !

### Option 2: Via CLI Vercel

```bash
npm i -g vercel
vercel login
vercel
```

## Déploiement sur Netlify

1. **Via GitHub**
   - Connectez votre repo sur Netlify
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Ajoutez les variables d'environnement

2. **Via CLI**
```bash
npm i -g netlify-cli
netlify login
netlify deploy --prod
```

## Déploiement sur GitHub Pages

1. **Installer gh-pages**
```bash
npm install --save-dev gh-pages
```

2. **Ajouter dans package.json**
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

3. **Déployer**
```bash
npm run deploy
```

## Configuration Post-Déploiement

### 1. Vérifier les URLs Supabase
Assurez-vous que les URLs Supabase sont accessibles depuis votre domaine de production.

### 2. Configurer CORS
Dans Supabase Dashboard → Settings → API :
- Ajoutez votre domaine de production dans les URLs autorisées

### 3. Vérifier les Buckets Storage
- Vérifiez que les buckets `photos` et `audio` sont publics
- Vérifiez les politiques RLS du storage

## Checklist de Déploiement

- [ ] Variables d'environnement configurées
- [ ] Build de production réussi
- [ ] Buckets Supabase configurés
- [ ] Politiques RLS vérifiées
- [ ] Triggers database actifs
- [ ] CORS configuré dans Supabase
- [ ] Tests de fonctionnalités critiques
- [ ] Notifications en temps réel fonctionnelles

## Support

Pour toute question sur le déploiement, contactez l'équipe de développement.
