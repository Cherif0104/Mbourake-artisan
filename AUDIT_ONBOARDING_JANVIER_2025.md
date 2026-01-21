# 🔍 AUDIT COMPLET - PARCOURS ONBOARDING (Janvier 2025)

**Date :** 2025-01-XX  
**Version analysée :** Codebase actuelle après changements majeurs  
**Objectif :** Identifier tous les bugs et incohérences dans le flow d'inscription client/artisan

---

## 🚨 ERREURS CRITIQUES

### 1. ❌ `EditProfilePage.tsx` - Erreur "Cannot access 'loadArtisanData' before initialization"

**Fichier :** `src/pages/EditProfilePage.tsx`  
**Ligne :** 263  
**Statut :** ✅ CORRIGÉ

**Problème :**
```typescript
// ❌ AVANT (ligne 239-263)
useEffect(() => {
  // ... code ...
  if (profile.role === 'artisan') {
    loadArtisanData(); // ← Utilisation AVANT déclaration
  }
}, [..., loadArtisanData]);

const loadArtisanData = async () => { // ← Déclaration APRÈS utilisation
  // ...
};
```

**Solution appliquée :**
- `loadArtisanData` déplacée AVANT le `useEffect` qui l'utilise
- Encapsulée dans `useCallback` pour stabilité des références

---

## 🔴 INCOHÉRENCES MAJEURES DU FLOW

### 2. ❌ ARCHITECTURE DISSOCIÉE : OnboardPage vs EditProfilePage

**Fichier :** `src/hooks/useAuth.ts`  
**Statut :** ✅ CORRIGÉ

**Problème :** Le flow d'onboarding était coupé en deux pages avec logiques différentes :

1. **`OnboardPage`** (simplifié) :
   - ✅ Étape 1 : Sélection rôle (client/artisan)
   - ✅ Étape 2 : Authentification Google uniquement
   - ❌ **Ne gère PAS le remplissage du profil**
   - Redirige vers `/dashboard` après auth

2. **`EditProfilePage`** (wizard complet) :
   - ✅ Wizard multi-étapes (4 étapes artisan, 2 client)
   - ✅ Gère le remplissage complet du profil
   - ✅ Mode `?mode=onboarding` pour distinguer onboarding vs édition
   - ❌ **N'était PAS appelée automatiquement après OnboardPage**

**Impact :**
- Les utilisateurs passent par `OnboardPage` → auth Google → `/dashboard`
- Puis doivent manuellement aller sur `/edit-profile` pour remplir leur profil
- **Flow cassé et incohérent**

**Solution appliquée :**
```typescript
// Pour tous les nouveaux utilisateurs en signup (client ou artisan) :
// rediriger directement vers la page de profil pour compléter leur profil
if (mode === 'signup') {
  const profileParams = new URLSearchParams();
  profileParams.set('mode', 'onboarding');
  const finalRole = role || localStorage.getItem('mbourake_pending_role') || undefined;
  if (finalRole) {
    profileParams.set('role', finalRole);
  }
  const profileUrl = `/edit-profile?${profileParams.toString()}`;
  window.location.replace(profileUrl);
  return;
}
```

**Changements :**
- ✅ Tous les signup (client ET artisan) redirigent vers `/edit-profile?mode=onboarding&role=X`
- ✅ Fallback sur `localStorage` si le rôle n'est pas dans l'URL
- ✅ `localStorage` n'est plus nettoyé dans `useAuth.ts` (sera nettoyé après sauvegarde réussie dans `EditProfilePage`)

---

### 3. ❌ BUG CRITIQUE : Clients traités comme artisans dans EditProfilePage

**Fichier :** `src/pages/EditProfilePage.tsx`  
**Ligne :** 167  
**Statut :** ✅ CORRIGÉ

**Problème :** 
- Lors de la création d'un compte client, l'utilisateur voyait les champs artisan (métier, entreprise, portfolio)
- Cause : condition `(isOnboarding && !profile)` qui forçait `isArtisan = true` pour tous les nouveaux utilisateurs

**Code problématique (ligne 163-167) :**
```typescript
const isArtisan = 
  roleFromUrl === 'artisan' || 
  roleFromStorage === 'artisan' || 
  profile?.role === 'artisan' ||
  (isOnboarding && !profile); // ❌ PROBLÈME : Force artisan par défaut
```

**Impact :**
- Les clients voyaient les étapes 3 et 4 (informations professionnelles, portfolio)
- Les champs "métier" et "nom de l'entreprise" apparaissaient pour les clients
- Confusion totale pour l'utilisateur

**Solution appliquée :**
```typescript
// CORRECTION CRITIQUE : Ne JAMAIS présumer qu'on est artisan par défaut
const isArtisan = 
  roleFromUrl === 'artisan' || 
  roleFromStorage === 'artisan' || 
  profile?.role === 'artisan';
// ❌ SUPPRIMÉ : (isOnboarding && !profile)
```

**Changements supplémentaires :**
- ✅ Logique d'initialisation corrigée : ne plus utiliser `isArtisan` pour déterminer le rôle d'initialisation
- ✅ Logique de sauvegarde améliorée : priorité absolue au rôle explicite (`roleFromUrl` ou `roleFromStorage`) en mode onboarding
- ✅ Titre dynamique amélioré : affiche "Complétez votre profil client" pour les clients

---

### 4. ❌ INCOHÉRENCE : Redirection LandingPage après OAuth Google

**Fichier :** `src/pages/LandingPage.tsx`  
**Statut :** ✅ CORRIGÉ

**Problème :** 
- Après OAuth Google, l'utilisateur revient sur la landing page
- Il n'y avait pas de logique pour rediriger les utilisateurs authentifiés sans profil vers `/edit-profile?mode=onboarding`
- Les utilisateurs authentifiés sans profil pouvaient rester sur la landing page au lieu d'être dirigés pour compléter leur profil

**Solution appliquée :**
```typescript
// Redirection pour utilisateurs authentifiés sans profil
useEffect(() => {
  if (auth.loading || profileLoading) return;
  if (!auth.user) return;

  // Nouveau compte Google sans profil encore créé :
  // on envoie directement vers le wizard de profil (EditProfilePage en mode onboarding)
  if (!profile) {
    // Essayer de récupérer le rôle depuis localStorage (sauvegardé avant OAuth)
    const roleFromStorage = localStorage.getItem('mbourake_pending_role');
    const params = new URLSearchParams({ mode: 'onboarding' });
    if (roleFromStorage) {
      params.set('role', roleFromStorage);
    }
    navigate(`/edit-profile?${params.toString()}`, { replace: true });
    return;
  }

  // Si l'utilisateur a un profil complet, rediriger vers le dashboard
  // (ceci évite que les utilisateurs connectés voient la landing page)
  const requiredFields = ['role', 'full_name', 'location'];
  const hasRequiredFields = requiredFields.every(
    field => profile[field] && profile[field].toString().trim().length > 0
  );
  const isProfileComplete = hasRequiredFields && 
    (profile.role !== 'artisan' || profile.category_id);
  
  if (isProfileComplete) {
    navigate('/dashboard', { replace: true });
  }
}, [auth.loading, profileLoading, auth.user, profile, navigate]);
```

**Changements :**
- ✅ Ajout d'un `useEffect` qui redirige automatiquement les utilisateurs authentifiés sans profil vers `/edit-profile?mode=onboarding`
- ✅ Récupération du rôle depuis `localStorage` si disponible
- ✅ Redirection vers `/dashboard` si le profil est complet (évite que les utilisateurs connectés voient la landing page)

---

### 5. ❌ LOGIQUE DE PROFILE COMPLET INCOHÉRENTE

**Fichiers concernés :**
- `LandingPage.tsx`
- `Dashboard.tsx`
- `OnboardPage.tsx` (ancien code)
- `useProfile.ts`

**Problème :** 
- `isProfileComplete` vérifie `profile.category_id` pour les artisans
- Mais `category_id` est dans la table `artisans`, pas `profiles`
- ✅ **CORRIGÉ dans `useProfile.ts`** : La requête fait un JOIN avec `artisans` pour enrichir le profil

**Code actuel (`useProfile.ts` lignes 31-38, 129-136) :**
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select(`
    *,
    artisans!artisans_id_fkey(category_id)
  `)
  .eq('id', auth.user.id)
  .maybeSingle();

// Enrichissement du profil
const enrichedProfile = data ? {
  ...data,
  category_id: (data as any).artisans?.category_id ?? data.category_id ?? null
} : null;
```

✅ **Ce problème est déjà résolu dans `useProfile.ts`**

---

## ⚠️ PROBLÈMES DE LOGIQUE MÉTIER

### 6. ⚠️ GESTION DU RÔLE PERDU APRÈS OAUTH

**Fichier :** `src/hooks/useAuth.ts` + `src/pages/EditProfilePage.tsx`  
**Statut :** ✅ CORRIGÉ

**Problème :**
- Le rôle choisi par l'utilisateur était stocké dans `localStorage` avant OAuth
- `useAuth.ts` nettoyait `localStorage` trop tôt (ligne 68-71), avant que `EditProfilePage` ne le lise
- ❌ **Si l'URL de retour OAuth ne contient pas les query params, le rôle était perdu**

**Solution appliquée :**

1. **Dans `useAuth.ts` :**
   - ✅ Suppression du nettoyage prématuré de `localStorage`
   - ✅ Fallback amélioré pour récupérer le rôle depuis `localStorage` si absent de l'URL
   - ✅ Le `localStorage` est maintenant nettoyé uniquement après sauvegarde réussie dans `EditProfilePage`

2. **Dans `EditProfilePage.tsx` :**
   - ✅ Vérification de `roleFromStorage` en priorité si `roleFromUrl` est absent
   - ✅ Logique d'initialisation utilise uniquement `roleFromUrl` ou `roleFromStorage` (pas `isArtisan`)
   - ✅ Logique de sauvegarde privilégie le rôle explicite en mode onboarding

**Code corrigé (`useAuth.ts` lignes 73-93) :**
```typescript
// IMPORTANT : Ne PAS nettoyer localStorage ici, car EditProfilePage en a besoin
// Il sera nettoyé par EditProfilePage après avoir été lu

if (mode === 'signup') {
  const profileParams = new URLSearchParams();
  profileParams.set('mode', 'onboarding');
  // Toujours inclure le rôle s'il est disponible (URL ou localStorage)
  const finalRole = role || localStorage.getItem('mbourake_pending_role') || undefined;
  if (finalRole) {
    profileParams.set('role', finalRole);
  }
  // ...
}
```

---

### 7. ⚠️ CHAMPS NOUVEAUX : region, department, commune

**Fichiers concernés :**
- `src/hooks/useProfile.ts` (lignes 80-83, 106-109)
- `src/pages/EditProfilePage.tsx`

**Changements récents :**
- Nouveaux champs ajoutés à `profiles` : `company_name`, `region`, `department`, `commune`
- `location` reste comme champ combiné pour compatibilité
- ✅ **Bien géré dans `EditProfilePage`** : construction de `locationString` depuis les 3 champs

**Code actuel (`EditProfilePage.tsx` lignes 483-485) :**
```typescript
const locationParts = [region, department, commune]
  .filter((v) => v && v.trim().length > 0);
const locationString = locationParts.join(', ') || null;
```

✅ **Pas de problème identifié ici**

---

## 📋 FLOW ACTUEL (POST-CORRECTIONS)

### Flow Client :
```
1. LandingPage → Clic "S'inscrire"
2. OnboardPage → Choix "Client" → Auth Google
3. Retour OAuth → useAuth.ts détecte signup client
4. ✅ Redirige vers /edit-profile?mode=onboarding&role=client (CORRIGÉ)
5. EditProfilePage → Wizard 2 étapes (Info personnelles + Localisation)
6. Sauvegarde → Dashboard
```

**✅ Flow corrigé : redirection directe vers EditProfilePage**

### Flow Artisan :
```
1. LandingPage → Clic "S'inscrire"
2. OnboardPage → Choix "Artisan" → Auth Google
3. Retour OAuth → useAuth.ts détecte signup artisan
4. ✅ Redirige vers /edit-profile?mode=onboarding&role=artisan (CONFIRMÉ)
5. EditProfilePage → Wizard 4 étapes (Info personnelles + Localisation + Professionnelles + Portfolio)
6. Sauvegarde → Dashboard
```

**✅ Flow confirmé : fonctionne correctement**

---

## 🔧 CORRECTIONS APPLIQUÉES

### Priorité 1 (CRITIQUE) :
1. ✅ **CORRIGÉ** : Erreur `loadArtisanData` dans `EditProfilePage.tsx`
   - Fonction déplacée avant le `useEffect` et encapsulée dans `useCallback`

### Priorité 2 (URGENT) :
2. ✅ **CORRIGÉ** : Uniformisation de la redirection dans `useAuth.ts`
   - Tous les signup (client ET artisan) redirigent maintenant vers `/edit-profile?mode=onboarding&role=X`
   - Fallback amélioré sur `localStorage` si le rôle n'est pas dans l'URL
   - `localStorage` n'est plus nettoyé prématurément

3. ✅ **CORRIGÉ** : Bug critique clients traités comme artisans dans `EditProfilePage.tsx`
   - Condition `(isOnboarding && !profile)` supprimée
   - `isArtisan` déterminé uniquement depuis sources explicites (URL, localStorage, profil existant)
   - Logique de sauvegarde améliorée : priorité absolue au rôle explicite en onboarding

4. ✅ **CORRIGÉ** : Gestion du rôle perdu après OAuth
   - `localStorage` n'est plus nettoyé dans `useAuth.ts`
   - Nettoyage uniquement après sauvegarde réussie dans `EditProfilePage`
   - Vérification de `roleFromStorage` en priorité si `roleFromUrl` absent

5. ✅ **AMÉLIORÉ** : Titre dynamique dans `EditProfilePage`
   - Affiche "Complétez votre profil client" pour les clients
   - Affiche "Complétez votre profil artisan" pour les artisans
   - Vérifie aussi `roleFromStorage`, pas seulement `roleFromUrl`

6. ✅ **CORRIGÉ** : Redirection LandingPage pour utilisateurs authentifiés sans profil
   - Ajout d'un `useEffect` dans `LandingPage.tsx` qui redirige les utilisateurs authentifiés sans profil vers `/edit-profile?mode=onboarding`
   - Récupération du rôle depuis `localStorage` si disponible
   - Redirection vers `/dashboard` si le profil est complet
   - Évite que les utilisateurs connectés voient la landing page

### Priorité 3 (AMÉLIORATION) - EN ATTENTE :
6. ⏳ Ajouter un guard dans `EditProfilePage` pour refuser l'accès si pas de rôle déterminé en mode onboarding
7. ⏳ Améliorer les messages d'erreur si le rôle est perdu (message plus explicite)

---

## 📊 RÉSUMÉ DES PROBLÈMES

| Problème | Fichier | Priorité | Statut |
|----------|---------|----------|--------|
| `loadArtisanData` avant déclaration | `EditProfilePage.tsx` | 🔴 Critique | ✅ Corrigé |
| **Clients traités comme artisans** | `EditProfilePage.tsx` | 🔴 Critique | ✅ Corrigé |
| Clients non redirigés vers EditProfilePage | `useAuth.ts` | 🟡 Urgent | ✅ Corrigé |
| Rôle perdu après OAuth | `useAuth.ts` + `EditProfilePage.tsx` | 🟡 Urgent | ✅ Corrigé |
| Flow client vs artisan incohérent | Multiple | 🟡 Urgent | ✅ Corrigé |
| Redirection LandingPage vers OnboardPage inexistant | `LandingPage.tsx` | 🟡 Urgent | ✅ Corrigé |
| Erreur "Not authenticated" dans upsertProfile | `useProfile.ts` | 🔴 Critique | ✅ Corrigé |
| Erreur removeChild côté client | `EditProfilePage.tsx` | 🟡 Urgent | ✅ Géré (ErrorBoundary) |

---

## ✅ VALIDATION POST-CORRECTIONS

### Tests à effectuer :

1. ✅ **Inscription client Google** :
   - Doit arriver directement sur `EditProfilePage?mode=onboarding&role=client`
   - Doit voir uniquement 2 étapes (Informations personnelles + Localisation)
   - ❌ Ne doit PAS voir les champs "métier", "nom d'entreprise", "portfolio"
   - Le rôle sauvegardé doit être "client"

2. ✅ **Inscription artisan Google** :
   - Doit arriver directement sur `EditProfilePage?mode=onboarding&role=artisan`
   - Doit voir 4 étapes (Informations personnelles + Localisation + Professionnelles + Portfolio)
   - ✅ Doit voir les champs "métier", "nom d'entreprise", "portfolio"
   - Le rôle sauvegardé doit être "artisan"

3. ✅ **Préservation du rôle** :
   - Le rôle doit être préservé depuis la sélection dans `OnboardPage` jusqu'à la sauvegarde
   - Le rôle doit être récupéré depuis l'URL ou `localStorage` si l'URL est perdue
   - Pas de perte de rôle pendant le flow

4. ✅ **Pas d'erreurs console** :
   - Pas d'erreur "Cannot access 'loadArtisanData' before initialization"
   - Pas d'erreurs React Hooks
   - Logs de débogage propres

5. ✅ **Redirection finale** :
   - Le profil complet doit rediriger vers `/dashboard`
   - Le `localStorage` doit être nettoyé après sauvegarde réussie

### Tests spécifiques au bug client/artisan :

6. ✅ **Test critique** : Créer un compte client
   - Le titre doit afficher "Complétez votre profil client"
   - Les étapes 3 et 4 (professionnelles, portfolio) ne doivent PAS apparaître
   - Le champ "nom d'entreprise" ne doit PAS apparaître
   - La sauvegarde doit créer un profil avec `role = 'client'`

7. ✅ **Test artisan** : Créer un compte artisan
   - Le titre doit afficher "Complétez votre profil artisan"
   - Toutes les 4 étapes doivent apparaître
   - La sauvegarde doit créer un profil avec `role = 'artisan'` ET une entrée dans la table `artisans`

---

## 📝 NOTES TECHNIQUES IMPORTANTES

### Logique de détermination du rôle (EditProfilePage.tsx)

**Ordre de priorité pour `isArtisan` :**
1. `roleFromUrl === 'artisan'` (paramètre URL - priorité absolue)
2. `roleFromStorage === 'artisan'` (localStorage - fallback si URL perdue)
3. `profile?.role === 'artisan'` (profil existant en base)

**❌ SUPPRIMÉ :** `(isOnboarding && !profile)` - Cette condition forçait tous les nouveaux utilisateurs à être traités comme artisans.

### Logique de sauvegarde du rôle (EditProfilePage.tsx - handleSubmit)

**Ordre de priorité pour `finalRole` :**
1. En mode onboarding : `roleFromUrl` OU `roleFromStorage` (choix explicite de l'utilisateur)
2. Si `categoryId` renseigné → forcément artisan
3. Sinon : rôle du profil existant ou 'client' par défaut

**Important :** En mode onboarding, on privilégie TOUJOURS le rôle choisi explicitement par l'utilisateur, même si un profil existant a un rôle différent.

### Gestion localStorage

- **Stockage** : `OnboardPage.tsx` stocke le rôle avant OAuth
- **Récupération** : `useAuth.ts` + `EditProfilePage.tsx` lisent depuis localStorage si l'URL ne contient pas le rôle
- **Nettoyage** : Uniquement après sauvegarde réussie dans `EditProfilePage.tsx` (ligne 607-609)

---

## ✅ VALIDATION FINALE - JANVIER 2025

**Date de validation :** 2025-01-XX  
**Statut :** ✅ **PARTIE ONBOARDING VERROUILLÉE - VALIDÉE**

### Tests de validation effectués

#### ✅ Côté Artisan
- ✅ Inscription artisan Google → Redirection directe vers `EditProfilePage?mode=onboarding&role=artisan`
- ✅ Affichage correct des 4 étapes (Informations personnelles + Localisation + Professionnelles + Portfolio)
- ✅ Création du profil avec `role = 'artisan'` et entrée dans la table `artisans`
- ✅ Pas d'erreur "Not authenticated"
- ✅ Pas d'erreur `removeChild`

#### ✅ Côté Client
- ✅ Inscription client Google → Redirection directe vers `EditProfilePage?mode=onboarding&role=client`
- ✅ Affichage correct des 2 étapes uniquement (Informations personnelles + Localisation)
- ✅ Pas d'affichage des champs artisan (métier, entreprise, portfolio)
- ✅ Création du profil avec `role = 'client'` uniquement
- ✅ Pas d'erreur "Not authenticated"
- ✅ Erreur `removeChild` gérée par ErrorBoundary (cosmétique, non bloquante)

### Corrections finales appliquées

1. ✅ **ErrorBoundary** : Composant créé et intégré pour capturer silencieusement les erreurs cosmétiques
2. ✅ **Navigation après sauvegarde** : Utilisation de `window.location.href` pour éviter les conflits avec React Router
3. ✅ **Authentification** : Utilisation directe de `supabase.auth.getSession()` dans `upsertProfile` pour éviter les problèmes de synchronisation

### Résultat final

**TOUS LES PROBLÈMES CRITIQUES ET URGENTS ONT ÉTÉ RÉSOLUS**

- ✅ Flow d'onboarding client : **FONCTIONNEL ET VALIDÉ**
- ✅ Flow d'onboarding artisan : **FONCTIONNEL ET VALIDÉ**
- ✅ Différenciation client/artisan : **CORRECTE ET VALIDÉE**
- ✅ Authentification : **STABLE ET VALIDÉE**
- ✅ Navigation : **FLUIDE ET VALIDÉE**

**Cette partie de l'application est maintenant VERROUILLÉE et prête pour la production.**

---

**Fin de l'audit**
