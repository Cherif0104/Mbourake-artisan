# Création d’un compte administrateur Mbouraké

Deux options : **script Node** (recommandé, crée le compte de A à Z) ou **SQL** (pour promouvoir un utilisateur déjà existant).

---

## Option 1 : Script Node (création complète)

Le script crée l’utilisateur dans Auth et le profil avec `role = 'admin'`.

### 1. Récupérer la clé service role

- Supabase Dashboard → **Settings** → **API**
- Section **Project API keys** → copier **service_role** (secret, ne pas l’exposer côté client)

### 2. Définir les variables d’environnement

**Windows (PowerShell)**  
```powershell
$env:VITE_SUPABASE_URL = "https://VOTRE_PROJECT_REF.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJ..."
```

**Windows (cmd)**  
```cmd
set VITE_SUPABASE_URL=https://VOTRE_PROJECT_REF.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Linux / macOS**  
```bash
export VITE_SUPABASE_URL="https://VOTRE_PROJECT_REF.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

*(Vous pouvez aussi utiliser un fichier `.env` à la racine avec `VITE_SUPABASE_URL` et y ajouter `SUPABASE_SERVICE_ROLE_KEY` pour les scripts, puis charger ce fichier avant d’exécuter le script si vous utilisez un outil qui le lit.)*

### 3. Exécuter le script

À la racine du projet :

```bash
node scripts/create-admin.mjs <email> <mot_de_passe> [nom_affiché]
```

**Exemple :**  
```bash
node scripts/create-admin.mjs admin@mbourake.com MonMotDePasse123 "Super Admin"
```

- Si l’email n’existe pas : création du compte Auth + profil admin.
- Si l’email existe déjà : le profil est mis à jour en `role = 'admin'`.

Ensuite, connectez-vous sur la plateforme avec cet email et le mot de passe, puis allez sur **`/admin`**.

---

## Option 2 : SQL (utilisateur déjà créé)

Si vous avez déjà créé un utilisateur (connexion Google ou **Authentication → Add user** dans le Dashboard Supabase), vous pouvez le promouvoir en admin via le SQL Editor.

### 1. Appliquer la migration (si ce n’est pas déjà fait)

```bash
supabase db push
```

ou exécuter à la main le contenu de  
`supabase/migrations/20260228100000_promote_user_to_admin.sql`  
dans **Supabase → SQL Editor**.

### 2. Appeler la fonction

Dans le **SQL Editor** :

```sql
SELECT public.promote_user_to_admin('votre-email@example.com');
```

Remplacez par l’email du compte à promouvoir. Le profil associé passera en `role = 'admin'`. La prochaine connexion avec ce compte donnera accès à **`/admin`**.

---

## Sécurité

- La clé **service_role** contourne les RLS : ne l’utilisez que dans des scripts ou un backend, jamais dans le code front (navigateur).
- Une fois le premier admin créé, vous pourrez créer d’autres admins depuis l’interface admin (quand la gestion des utilisateurs le permet) ou en réutilisant ce script/SQL.
