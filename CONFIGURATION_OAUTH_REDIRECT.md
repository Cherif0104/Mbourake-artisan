# Configuration OAuth Google - URLs de redirection

## Problème
Si l'authentification Google ne démarre pas et vous renvoie à la page d'accueil, c'est probablement que l'URL de redirection n'est pas configurée dans Supabase.

## Solution

### 1. Aller dans Supabase Dashboard
1. Connectez-vous à votre projet Supabase : https://supabase.com/dashboard
2. Sélectionnez votre projet **Mbourake**

### 2. Configurer les URLs de redirection
1. Allez dans **Settings** → **Authentication**
2. Scrollez jusqu'à **URL Configuration**
3. Dans la section **Redirect URLs**, ajoutez les URLs suivantes :

#### Pour le développement local (localhost:3002) :
```
http://localhost:3002/profile-setup
http://localhost:3002/login
http://localhost:3002/dashboard
```

#### Pour la production (si vous avez un domaine) :
```
https://votre-domaine.com/profile-setup
https://votre-domaine.com/login
https://votre-domaine.com/dashboard
```

### 3. Vérifier la configuration Google OAuth
1. Toujours dans **Settings** → **Authentication**
2. Allez dans **Providers** → **Google**
3. Vérifiez que :
   - ✅ Google est activé
   - ✅ Client ID et Client Secret sont configurés
   - ✅ Les URLs de redirection autorisées dans Google Console incluent :
     - `https://[votre-projet-supabase].supabase.co/auth/v1/callback`

### 4. Vérifier Google Cloud Console
1. Allez dans [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. Allez dans **APIs & Services** → **Credentials**
4. Cliquez sur votre **OAuth 2.0 Client ID**
5. Dans **Authorized redirect URIs**, vérifiez que vous avez :
   ```
   https://[votre-projet-supabase].supabase.co/auth/v1/callback
   ```

## Test
Après avoir configuré les URLs :
1. Redémarrez le serveur de développement
2. Essayez de vous connecter avec Google
3. Vérifiez la console du navigateur pour les logs

## Erreurs courantes

### "redirect_uri_mismatch"
- **Cause** : L'URL de redirection n'est pas dans la liste autorisée
- **Solution** : Ajoutez l'URL exacte dans Supabase Dashboard

### "OAuth error"
- **Cause** : Configuration Google OAuth incorrecte
- **Solution** : Vérifiez Client ID et Client Secret dans Supabase

### Redirection vers la page d'accueil
- **Cause** : URL de redirection non configurée dans Supabase
- **Solution** : Ajoutez les URLs ci-dessus dans Supabase Dashboard
