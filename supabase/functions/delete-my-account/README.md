# Fonction delete-my-account

Permet à un utilisateur de supprimer son compte et toutes ses données (base + Storage + Auth).

## CORS et erreur « preflight doesn't pass access control check »

L’erreur CORS en production vient du fait que la **prérequête OPTIONS** (sans token) doit recevoir **200 OK** avec les en-têtes CORS. Si la fonction est déployée avec vérification JWT activée, la plateforme Supabase renvoie **401** avant même d’exécuter le code, donc pas d’en-têtes CORS → le navigateur bloque.

**Solution** : la fonction doit être déployée avec `verify_jwt = false`. C’est déjà configuré dans `supabase/config.toml` pour `delete-my-account`. Il suffit de **redéployer** la fonction (via la CLI) pour que la config soit appliquée. Si l’erreur persiste, dans le Dashboard Supabase → Edge Functions → delete-my-account → Settings, vérifier que « Enforce JWT verification » est **désactivé**.

## Déploiement (à faire après chaque modification de la fonction)

1. **CLI Supabase** : soit installer globalement (`npm i -g supabase` puis `supabase login`), soit utiliser `npx` (le script `npm run deploy:delete-account` utilise déjà `npx supabase`).

2. **Lier le projet** (une fois) : exécuter **deux commandes séparées** (ne pas enchaîner avec `>>`) :
   ```bash
   npx supabase login
   ```
   (Ouvrir le lien dans le navigateur, se connecter, puis **copier le token qui commence par `sbp_`** et le coller dans le terminal quand c’est demandé. Ne pas utiliser la clé « anon » ou « service_role » du projet.)
   ```bash
   npx supabase link --project-ref snhoxuqaskgoownshvgr
   ```

3. **Déployer la fonction** (le `config.toml` applique déjà `verify_jwt = false`) :
   ```bash
   npm run deploy:delete-account
   ```
   ou :
   ```bash
   supabase functions deploy delete-my-account
   ```

4. **Secrets** : la fonction utilise `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (généralement déjà définis pour le projet). Vérifier dans Dashboard → Edge Functions → delete-my-account → Settings → Secrets.

Après déploiement, tester « Supprimer mon compte » depuis Paramètres sur https://www.mbourake.com.

---

## Dépannage

- **« Invalid access token format. Must be like sbp_0102...1920 »**  
  Un token invalide est enregistré (variable d’environnement ou fichier du CLI). À faire :

  1. **Supprimer la variable d’environnement** (si elle pointe vers une mauvaise valeur) :
     ```powershell
     $env:SUPABASE_ACCESS_TOKEN = $null
     ```
     (Pour la retirer définitivement : Paramètres Windows → Variables d’environnement → supprimer `SUPABASE_ACCESS_TOKEN`.)

  2. **Supprimer le token enregistré par le CLI** (fichier ou trousseau) :
     ```powershell
     Remove-Item -Force -ErrorAction SilentlyContinue "$env:USERPROFILE\.supabase\access-token"
     ```

  3. **Obtenir un token valide** : aller sur https://app.supabase.com/account/tokens → **Generate new token** (bouton principal, pas le menu déroulant). Le token doit commencer par `sbp_` (pas `sbp_v0_`).

  4. **Se reconnecter** :
     ```powershell
     npx supabase login
     ```
     Ouvrir le lien dans le navigateur, se connecter, puis coller le **nouveau** token quand le terminal le demande. Ne pas utiliser la clé « anon » ou « service_role » du projet.

- **« failed to parse environment file: .env (unexpected character '»' in variable name) »**  
  Souvent causé par un **BOM UTF-8** en début de fichier (invisible) ou par des guillemets typographiques `»`/`«` dans un nom de variable.  
  **À faire** : enregistrer `.env` **sans BOM** (Notepad : « Enregistrer sous » → encodage « UTF-8 » sans BOM ; ou en PowerShell : `$c=[IO.File]::ReadAllText('.env'); [IO.File]::WriteAllText('.env',$c,(New-Object System.Text.UTF8Encoding $false))`). Vérifier aussi qu’aucune ligne n’a de `»` ou `«` dans le nom de la variable (uniquement lettres, chiffres, underscore).
