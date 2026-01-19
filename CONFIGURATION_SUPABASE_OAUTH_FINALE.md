# Configuration Supabase OAuth - URLs de redirection FINALE

## Domaine de production
**Production :** `https://www.mbourake.com`

## URLs de redirection à configurer dans Supabase

### 1. Accéder à Supabase Dashboard
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet **Mbourake**
3. Allez dans **Settings** → **Authentication**
4. Scrollez jusqu'à **URL Configuration**

### 2. Configurer les Redirect URLs

Dans la section **Redirect URLs**, ajoutez **TOUTES** ces URLs (une par ligne) :

#### Pour le développement local :
```
http://localhost:3002/onboard?mode=signup
http://localhost:3002/onboard?mode=login
http://localhost:3002/onboard
http://localhost:3002/dashboard
```

#### Pour la production (www.mbourake.com) :
```
https://www.mbourake.com/onboard?mode=signup
https://www.mbourake.com/onboard?mode=login
https://www.mbourake.com/onboard
https://www.mbourake.com/dashboard
```

**⚠️ IMPORTANT :** 
- Ajoutez les URLs avec ET sans paramètres de requête
- Cliquez sur **Save** après avoir ajouté toutes les URLs
- Les URLs doivent être exactes (respecter la casse, les paramètres, etc.)
- Ne pas oublier le `?mode=signup` et `?mode=login`

### 3. Site URL (URL de base)

Dans la même section, configurez le **Site URL** :

**Développement :**
```
http://localhost:3002
```

**Production :**
```
https://www.mbourake.com
```

### 4. Vérifier la configuration Google OAuth

1. Toujours dans **Settings** → **Authentication**
2. Allez dans **Providers** → **Google**
3. Vérifiez que :
   - ✅ **Enable Google provider** est activé
   - ✅ **Client ID (for OAuth)** est rempli
   - ✅ **Client Secret (for OAuth)** est rempli

### 5. Vérifier Google Cloud Console

1. Allez sur https://console.cloud.google.com/
2. Sélectionnez votre projet
3. Allez dans **APIs & Services** → **Credentials**
4. Cliquez sur votre **OAuth 2.0 Client ID**
5. Dans **Authorized redirect URIs**, vérifiez que vous avez :
   ```
   https://[votre-projet-supabase].supabase.co/auth/v1/callback
   ```
   
   **Exemple :** Si votre projet Supabase est `snhoxuqaskgoownshvgr`, l'URL sera :
   ```
   https://snhoxuqaskgoownshvgr.supabase.co/auth/v1/callback
   ```

## Pourquoi ces URLs sont nécessaires

- `/onboard?mode=signup` : **CRITIQUE** - Redirection après OAuth lors de l'inscription (page de sélection de rôle)
- `/onboard?mode=login` : Redirection après OAuth lors de la connexion
- `/onboard` : Redirection générique (fallback)
- `/dashboard` : Redirection après authentification réussie si le profil est complet

## Flux attendu après configuration

1. **Landing Page** → Clic sur "S'inscrire"
2. **Page d'authentification** (`/onboard?mode=signup`) → Clic sur "S'inscrire avec Google"
3. **Google OAuth** → Sélection du compte
4. **Retour automatique** → `/onboard?mode=signup` (page de sélection de rôle)
5. **Sélection du rôle** → Formulaire de complétion du profil
6. **Profil complété** → Dashboard

**✅ Plus de retour à la landing page après OAuth !**

## Test après configuration

1. Redémarrez le serveur de développement
2. Ouvrez la console du navigateur (F12)
3. Cliquez sur "S'inscrire avec Google"
4. Vérifiez les logs dans la console :
   - `[useAuth] Google OAuth redirectTo configuré: http://localhost:3002/onboard?mode=signup`
   - `[useAuth] Google OAuth initié avec succès`
5. Après avoir choisi votre compte Google, vous devriez être redirigé vers `/onboard?mode=signup` (page de sélection de rôle)
6. **Vous ne devriez PAS être redirigé vers la landing page (`/`)**

## Erreurs courantes

### "redirect_uri_mismatch"
- **Cause :** L'URL de redirection n'est pas dans la liste autorisée
- **Solution :** Ajoutez l'URL exacte dans Supabase Dashboard (voir étape 2)

### Redirection vers la landing page (`/`) au lieu de `/onboard?mode=signup`
- **Cause :** L'URL `/onboard?mode=signup` n'est pas dans les Redirect URLs de Supabase
- **Solution :** Ajoutez **TOUTES** les URLs listées ci-dessus dans Supabase Dashboard
- **Vérification :** Vérifiez que l'URL est bien sauvegardée (cliquez sur Save)

### "OAuth provider not enabled"
- **Cause :** Google OAuth n'est pas activé dans Supabase
- **Solution :** Activez Google dans Settings → Authentication → Providers → Google

## Notes importantes

- ⚠️ **Ne pas oublier de sauvegarder** après avoir ajouté les URLs
- ⚠️ Les URLs de production doivent être ajoutées **avant** le déploiement
- ⚠️ Vérifiez que le domaine `www.mbourake.com` est bien configuré dans votre hébergeur
- ⚠️ Pour la production, utilisez **toujours HTTPS**
- ⚠️ Les paramètres de requête (`?mode=signup`) sont **importants** - ne les oubliez pas

## Checklist de configuration

- [ ] URLs de développement ajoutées dans Supabase
- [ ] URLs de production ajoutées dans Supabase
- [ ] Site URL configuré (développement et production)
- [ ] Google OAuth activé dans Supabase
- [ ] Client ID et Client Secret configurés
- [ ] URL de callback configurée dans Google Cloud Console
- [ ] **Save** cliqué dans Supabase Dashboard
- [ ] Test effectué : redirection vers `/onboard?mode=signup` après OAuth
- [ ] Pas de redirection vers la landing page après OAuth
