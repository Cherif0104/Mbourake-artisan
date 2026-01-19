# Guide de Diagnostic pour ID : `bf479d31-81c3-4fb1-b218-9a302e1ffb7a`

## 🔍 Script de Diagnostic Automatique

Un script a été créé pour vérifier cet ID dans toutes les tables de la base de données.

### Utilisation

```bash
# Avec l'ID spécifique
npm run diagnose bf479d31-81c3-4fb1-b218-9a302e1ffb7a

# Ou directement
node scripts/diagnose-id.js bf479d31-81c3-4fb1-b218-9a302e1ffb7a
```

**Note**: Assurez-vous que votre fichier `.env.local` contient :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 📋 Vérifications Manuelles

### 1. Dans Supabase Dashboard

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Table Editor**

#### Vérifier dans chaque table :

**Table `projects`:**
```sql
SELECT id, title, project_number, status, client_id, created_at
FROM projects
WHERE id = 'bf479d31-81c3-4fb1-b218-9a302e1ffb7a';
```

**Table `quotes`:**
```sql
SELECT id, project_id, artisan_id, amount, status, created_at
FROM quotes
WHERE id = 'bf479d31-81c3-4fb1-b218-9a302e1ffb7a'
   OR project_id = 'bf479d31-81c3-4fb1-b218-9a302e1ffb7a';
```

**Table `escrows`:**
```sql
SELECT id, project_id, total_amount, status, created_at
FROM escrows
WHERE id = 'bf479d31-81c3-4fb1-b218-9a302e1ffb7a'
   OR project_id = 'bf479d31-81c3-4fb1-b218-9a302e1ffb7a';
```

**Table `notifications`:**
```sql
SELECT id, type, title, data, created_at
FROM notifications
WHERE id = 'bf479d31-81c3-4fb1-b218-9a302e1ffb7a'
   OR (data->>'project_id')::uuid = 'bf479d31-81c3-4fb1-b218-9a302e1ffb7a'
   OR (data->>'quote_id')::uuid = 'bf479d31-81c3-4fb1-b218-9a302e1ffb7a';
```

**Table `profiles`:**
```sql
SELECT id, full_name, email, role, created_at
FROM profiles
WHERE id = 'bf479d31-81c3-4fb1-b218-9a302e1ffb7a';
```

### 2. Vérifier les Politiques RLS (Row Level Security)

Si l'ID est un projet et qu'il ne charge pas, vérifiez les politiques RLS :

1. **Supabase Dashboard** → **Authentication** → **Policies**
2. Sélectionnez la table `projects`
3. Vérifiez que les politiques suivantes existent :

```sql
-- Artisans peuvent voir les projets ouverts
CREATE POLICY "Artisans can view open projects"
ON projects FOR SELECT
TO authenticated
USING (
  status = 'open' 
  OR target_artisan_id = auth.uid()
);

-- Clients peuvent voir leurs propres projets
CREATE POLICY "Clients can view own projects"
ON projects FOR SELECT
TO authenticated
USING (client_id = auth.uid());
```

### 3. Vérifier dans la Console du Navigateur

1. Ouvrez votre application en localhost
2. Ouvrez la console (F12)
3. Cherchez les logs contenant cet ID
4. Notez les erreurs affichées

### 4. Erreurs Communes et Solutions

#### ❌ "Projet introuvable" (PGRST116)
- **Cause**: Le projet n'existe pas dans la base de données
- **Solution**: Vérifier dans Supabase Dashboard si le projet existe

#### ❌ "Permission refusée" (42501)
- **Cause**: Les politiques RLS bloquent l'accès
- **Solution**: Vérifier les politiques RLS et s'assurer que l'utilisateur connecté a les droits

#### ❌ "Cannot coerce the result to a single JSON object"
- **Cause**: Erreur lors d'une mise à jour Supabase
- **Solution**: Vérifier que la requête utilise `.update()` sans `.select().single()` après

## 📝 Informations à Fournir

Pour un diagnostic plus précis, indiquez :

1. **Où avez-vous vu cet ID ?**
   - Console du navigateur
   - URL de la page
   - Message d'erreur
   - Notification

2. **Quelle action provoque le problème ?**
   - Chargement d'une page
   - Acceptation de devis
   - Création de projet
   - Navigation depuis une notification

3. **Quel est le message d'erreur exact ?**

4. **En tant que qui êtes-vous connecté ?**
   - Client
   - Artisan
   - Admin

## 🛠️ Actions Correctives Rapides

Si c'est un problème de projet qui ne charge pas :

1. Vérifiez que vous êtes bien connecté
2. Vérifiez que le projet existe dans Supabase
3. Vérifiez les politiques RLS
4. Videz le cache du navigateur (Ctrl+Shift+R)
5. Réessayez après quelques secondes
