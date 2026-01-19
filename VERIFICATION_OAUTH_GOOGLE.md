# Vérification Configuration Google OAuth

## Problème
Si en cliquant sur "S'inscrire avec Google", l'authentification ne démarre pas et vous êtes renvoyé à la page d'accueil, c'est probablement un problème de configuration.

## Solutions appliquées dans le code

1. ✅ Ajout d'un flag `isOAuthInProgress` pour empêcher les redirections pendant OAuth
2. ✅ Amélioration de la gestion d'erreurs avec messages explicites
3. ✅ Redirection explicite vers l'URL Google OAuth

## Vérifications à faire dans Supabase

### 1. Vérifier les URLs de redirection autorisées

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet **Mbourake**
3. Allez dans **Settings** → **Authentication**
4. Scrollez jusqu'à **URL Configuration**
5. Dans **Redirect URLs**, ajoutez ces URLs :

```
http://localhost:3002/profile-setup
http://localhost:3002/login
http://localhost:3002/dashboard
```

**Important** : Cliquez sur **Save** après avoir ajouté les URLs.

### 2. Vérifier que Google OAuth est activé

1. Toujours dans **Settings** → **Authentication**
2. Allez dans **Providers** → **Google**
3. Vérifiez que :
   - ✅ **Enable Google provider** est activé
   - ✅ **Client ID (for OAuth)** est rempli
   - ✅ **Client Secret (for OAuth)** est rempli

### 3. Vérifier Google Cloud Console

1. Allez sur https://console.cloud.google.com/
2. Sélectionnez votre projet
3. Allez dans **APIs & Services** → **Credentials**
4. Cliquez sur votre **OAuth 2.0 Client ID**
5. Dans **Authorized redirect URIs**, vérifiez que vous avez :

```
https://[votre-projet-supabase].supabase.co/auth/v1/callback
```

**Exemple** : Si votre projet Supabase est `snhoxuqaskgoownshvgr`, l'URL sera :
```
https://snhoxuqaskgoownshvgr.supabase.co/auth/v1/callback
```

## Test après configuration

1. Redémarrez le serveur de développement
2. Ouvrez la console du navigateur (F12)
3. Cliquez sur "S'inscrire avec Google"
4. Vérifiez les logs dans la console :
   - `[LoginPage] Bouton Google cliqué`
   - `[useAuth] signInWithGoogle appelé avec mode: signup`
   - `[useAuth] Google OAuth redirectTo configuré: http://localhost:3002/profile-setup`
   - `[useAuth] Google OAuth initié avec succès`
   - `[useAuth] URL de redirection Google: https://...`

## Erreurs courantes

### "redirect_uri_mismatch"
- **Cause** : L'URL de redirection n'est pas dans la liste autorisée
- **Solution** : Ajoutez l'URL dans Supabase Dashboard (voir étape 1)

### "OAuth provider not enabled"
- **Cause** : Google OAuth n'est pas activé dans Supabase
- **Solution** : Activez Google dans Settings → Authentication → Providers

### Redirection vers la page d'accueil
- **Cause** : Le `useEffect` redirige avant que OAuth ne démarre
- **Solution** : Déjà corrigé avec le flag `isOAuthInProgress`

## Logs à vérifier

Si le problème persiste, vérifiez ces logs dans la console :

```
[LoginPage] Bouton Google cliqué
[LoginPage] handleGoogleLogin appelé avec mode: signup
[useAuth] signInWithGoogle appelé avec mode: signup
[useAuth] Google OAuth redirectTo configuré: http://localhost:3002/profile-setup
[useAuth] Google OAuth initié avec succès
[useAuth] URL de redirection Google: https://accounts.google.com/...
```

Si vous ne voyez pas ces logs, le problème vient du code.
Si vous voyez une erreur, suivez les instructions ci-dessus.
