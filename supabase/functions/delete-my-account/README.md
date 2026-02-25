# Fonction delete-my-account

Permet à un utilisateur de supprimer son compte et toutes ses données (base + Storage + Auth).

## Déploiement sur ton projet Supabase

La 404 en local signifie que la fonction n’est pas déployée sur le projet utilisé par l’app (`VITE_SUPABASE_URL`).

1. **CLI Supabase** : installe-la si besoin (`npm i -g supabase`), puis connecte-toi avec `supabase login`.

2. **Lier le projet** (à la racine du repo) :
   ```bash
   supabase link --project-ref snhoxuqaskgoownshvgr
   ```
   (Remplace par ton Project Ref si différent : Dashboard Supabase → Settings → General → Reference ID.)

3. **Déployer la fonction** (avec `verify_jwt = false` pour que la prérequête CORS OPTIONS réussisse) :
   ```bash
   supabase functions deploy delete-my-account --no-verify-jwt
   ```

4. **Secrets** : la fonction utilise `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY`. Ils sont en général déjà définis pour le projet. Vérifie dans Dashboard → Edge Functions → delete-my-account → Settings → Secrets.

Après déploiement, réessaie « Supprimer mon compte » depuis l’app (en dev le proxy Vite enverra la requête à Supabase).
