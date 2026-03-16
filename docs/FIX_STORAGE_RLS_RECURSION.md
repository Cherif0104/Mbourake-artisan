# Correction récursion RLS (Storage 500 – staff_users)

## Contexte

Le support Supabase a identifié que les uploads Storage (bucket `photos`, etc.) échouent en **500** à cause d’une **récursion infinie** dans les politiques RLS de la table **`staff_users`** :

- Une politique sur `staff_users` fait référence à `staff_users` dans sa condition → PostgreSQL lève `42P17: infinite recursion detected in policy for relation "staff_users"`.
- Certaines politiques Storage font référence à `staff_users`. Lors d’un INSERT dans `storage.objects`, ces politiques sont évaluées, ce qui déclenche la politique récursive sur `staff_users` → l’upload échoue.

## Solution recommandée par Supabase

Déplacer la logique de vérification dans une **fonction `SECURITY DEFINER`** qui lit `staff_users` **sans déclencher RLS** (la fonction s’exécute avec les privilèges du propriétaire, ce qui évite la récursion).

Référence : [Supabase RLS – Using SECURITY DEFINER functions](https://supabase.com/docs/guides/auth/row-level-security#using-security-definer-functions) et [discussion GitHub #22336](https://github.com/orgs/supabase/discussions/22336).

---

## À faire dans le projet

### 1. Politiques Storage : via le Dashboard (obligatoire)

Le schéma **`storage`** est détenu par Supabase. On **ne peut pas** créer ou supprimer des politiques sur `storage.objects` depuis le **SQL Editor** (erreur `42501: must be owner of relation objects`). Il faut passer par l’interface **Storage** du Dashboard.

#### Étapes dans Supabase Dashboard

1. Aller dans **Storage** (menu gauche).
2. Ouvrir le bucket **`photos`** (ou le créer s’il n’existe pas : New bucket → id = `photos`, public = true).
3. Onglet **Policies**.
4. **Supprimer** toutes les politiques qui existent sur ce bucket, en particulier celles qui font référence à une table (ex. `staff_users`, `profiles` dans une condition). C’est elles qui provoquent la récursion.
5. **Créer 3 nouvelles politiques** (New policy → For full customization) avec exactement :

| Nom de la politique | Opération | Definition (Allow if…) |
|---------------------|-----------|-------------------------|
| **Users can upload photos** | **INSERT** | `bucket_id = 'photos'` **and** `auth.role() = 'authenticated'` |
| **Anyone can read photos** | **SELECT** | `bucket_id = 'photos'` |
| **Users can delete own photos** | **DELETE** | `bucket_id = 'photos'` **and** `auth.role() = 'authenticated'` **and** `(storage.foldername(name))[1] = auth.uid()::text` |

Pour chaque politique, utiliser **Policy definition** en mode “With custom expression” et coller l’expression correspondante (sans référence à une table).

Aucune référence à `staff_users` ni à une autre table métier → plus de récursion, les uploads vers `photos` doivent refonctionner.

Le fichier **`supabase/migrations/20260319000000_fix_storage_photos_and_rls_recursion.sql`** contient une **référence** de ces politiques et la création du bucket ; il ne peut pas être exécuté en entier dans le SQL Editor pour la partie `storage.objects`.

### 2. Si vous avez une table `staff_users` (créée à la main ou ailleurs)

Si votre projet contient une table **`staff_users`** (par ex. pour gérer les accès “staff” / dashboard) et que ses politiques RLS référencent cette même table, il faut les corriger pour supprimer la récursion.

À exécuter dans le **SQL Editor** du Dashboard Supabase (adapter les noms de politiques et la structure de `staff_users` si besoin) :

```sql
-- 1) Créer une fonction SECURITY DEFINER qui lit staff_users sans déclencher RLS
CREATE OR REPLACE FUNCTION public.is_staff_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Adapter la colonne (user_id, id, etc.) selon votre schéma staff_users
  RETURN EXISTS (SELECT 1 FROM public.staff_users WHERE user_id = p_user_id LIMIT 1);
END;
$$;

-- 2) Supprimer les anciennes politiques sur staff_users (adapter les noms)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'staff_users' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.staff_users', pol.policyname);
  END LOOP;
END $$;

-- 3) Recréer des politiques qui utilisent la fonction au lieu de lire staff_users directement
-- Exemple : autoriser la lecture si l'utilisateur est lui-même dans staff_users
CREATE POLICY "staff_users_select_own"
  ON public.staff_users FOR SELECT
  USING (public.is_staff_user(auth.uid()));

-- Autres politiques (INSERT/UPDATE/DELETE) selon vos besoins, en utilisant
-- is_staff_user(auth.uid()) ou d’autres conditions, sans SELECT sur staff_users dans la condition.
$$;
```

Vérifier dans **Authentication → Policies** (ou **Database → Tables → staff_users → RLS**) qu’aucune politique sur `staff_users` ne contient de sous-requête sur `staff_users`.

### 3. Vérifier les autres politiques Storage

Dans **Storage → Policies** (ou **SQL** sur `storage.objects`), supprimer toute politique qui fait référence à `staff_users` (ou à une table dont les politiques sont récursives). Les politiques créées par la migration pour `photos` ne font référence qu’à `auth.role()` et `bucket_id`.

Si l’erreur 500 persiste après la migration : dans le Dashboard Supabase, aller dans **Storage** → **Policies** pour le bucket `photos` (ou pour “All buckets”) et **supprimer à la main** toute politique dont la condition utilise une table (ex. `staff_users`, `profiles` avec sous-requête récursive). Garder uniquement des conditions du type `bucket_id = 'photos'` et `auth.role() = 'authenticated'`.

---

## Résumé

| Action | Où |
|--------|-----|
| Créer le bucket `photos` si besoin | SQL Editor (seule la ligne `INSERT INTO storage.buckets` peut passer, selon projet) |
| **Supprimer / recréer les politiques du bucket photos** | **Dashboard → Storage → photos → Policies** (obligatoire, pas le SQL Editor) |
| Corriger les politiques sur `staff_users` si la table existe | SQL Editor (script ci‑dessus) |

Après ces étapes, les uploads (projets, discussions, etc.) vers le bucket `photos` devraient à nouveau répondre sans erreur 500.
