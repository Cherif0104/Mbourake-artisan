# 🔧 Configuration Git pour Déploiement

## Commandes pour Initialiser et Pousser vers GitHub

### 1. Initialiser Git (si pas déjà fait)
```bash
git init
```

### 2. Ajouter tous les fichiers
```bash
git add .
```

### 3. Premier commit
```bash
git commit -m "Initial commit - Mbourake v2.0.0"
```

### 4. Ajouter le remote GitHub
```bash
git remote add origin https://github.com/Cherif0104/Mbourake.git
```

### 5. Renommer la branche principale
```bash
git branch -M main
```

### 6. Pousser vers GitHub
```bash
git push -u origin main
```

## Si le repository existe déjà

```bash
git remote set-url origin https://github.com/Cherif0104/Mbourake.git
git push -u origin main --force
```

## Vérifier la configuration

```bash
git remote -v
```

Vous devriez voir :
```
origin  https://github.com/Cherif0104/Mbourake.git (fetch)
origin  https://github.com/Cherif0104/Mbourake.git (push)
```

## Secrets GitHub (pour CI/CD)

Si vous utilisez GitHub Actions, ajoutez ces secrets dans :
**Settings → Secrets and variables → Actions**

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
