# 🔍 DIAGNOSTIC COMPLET - PARCOURS AUTHENTIFICATION & REDIRECTIONS

**Date :** 2025-01-XX  
**Version analysée :** Codebase actuelle  
**Objectif :** Identifier et corriger les problèmes de flux d'authentification et de redirection

---

## 📊 RÉSUMÉ EXÉCUTIF

### Problèmes Critiques Identifiés
1. ❌ **Vérification de profil incomplète** : `category_id` vérifié au mauvais endroit
2. ❌ **Gestion OAuth instable** : `isOAuthInProgress` jamais réinitialisé
3. ⚠️ **Logique de redirection fragmentée** : Plusieurs `useEffect` concurrents
4. ⚠️ **Risque de boucles de redirection** : Plusieurs composants redirigent
5. ⚠️ **État de rôle non synchronisé** : Perte possible après OAuth

---

## 🔴 PROBLÈME 1 : Vérification de profil incomplète et incohérente

### Description
La fonction `isProfileComplete` vérifie `profile.category_id` pour les artisans, mais `category_id` est stocké dans la table `artisans`, pas dans `profiles`.

### Code problématique

**OnboardPage.tsx (lignes 285-294)**
```typescript
const isProfileComplete = useCallback((profile: any): boolean => {
  if (!profile) return false;
  const requiredFields = ['role', 'full_name', 'location'];
  const hasRequiredFields = requiredFields.every(
    field => profile[field] && profile[field].toString().trim().length > 0
  );
  if (!hasRequiredFields) return false;
  if (profile.role === 'artisan' && !profile.category_id) return false; // ❌ PROBLÈME ICI
  return true;
}, []);
```

**Dashboard.tsx (lignes 47-56)**
```typescript
const isProfileComplete = (profile: any): boolean => {
  if (!profile) return false;
  const requiredFields = ['role', 'full_name', 'location'];
  const hasRequiredFields = requiredFields.every(
    field => profile[field] && profile[field].toString().trim().length > 0
  );
  if (!hasRequiredFields) return false;
  if (profile.role === 'artisan' && !profile.category_id) return false; // ❌ PROBLÈME ICI
  return true;
};
```

### Analyse
- Dans `useProfile.ts`, `category_id` est stocké dans la table `artisans` (ligne 101)
- La table `profiles` a un champ `category_id` dans le schéma, mais il n'est jamais rempli
- La vérification échoue toujours pour les artisans car `profile.category_id` est toujours `null`

### Impact
- Les artisans avec un profil complet sont considérés comme incomplets
- Redirections infinies vers `/onboard?mode=signup&step=profile`
- Impossible d'accéder au dashboard pour les artisans

---

## 🔴 PROBLÈME 2 : Gestion OAuth instable

### Description
Le flag `isOAuthInProgress` est défini à `true` lors du démarrage de l'authentification Google, mais n'est jamais réinitialisé après le retour OAuth réussi.

### Code problématique

**OnboardPage.tsx (lignes 383-395)**
```typescript
const handleGoogleAuth = async () => {
  setLoading(true);
  setError(null);
  setIsOAuthInProgress(true); // ✅ Défini à true
  
  try {
    await auth.signInWithGoogle(authMode);
    // ❌ PROBLÈME : Pas de réinitialisation après succès
  } catch (e: any) {
    setError(e?.message ?? 'Erreur lors de la connexion avec Google');
    setLoading(false);
    setIsOAuthInProgress(false); // ✅ Réinitialisé seulement en cas d'erreur
  }
};
```

**OnboardPage.tsx (lignes 297-351)**
```typescript
useEffect(() => {
  // Ne rien faire pendant le chargement initial
  if (auth.loading || profileLoading || isOAuthInProgress) return; // ❌ Bloque les redirections
  // ...
}, [auth.user?.id, auth.loading, profileLoading, isOAuthInProgress, ...]);
```

### Analyse
- Après un retour OAuth réussi, `isOAuthInProgress` reste à `true`
- Le `useEffect` principal ne s'exécute jamais car `isOAuthInProgress === true`
- Les redirections sont bloquées indéfiniment

### Impact
- Blocage des redirections après OAuth
- Utilisateur coincé sur la page d'onboarding
- Expérience utilisateur dégradée

---

## ⚠️ PROBLÈME 3 : Logique de redirection fragmentée et conflictuelle

### Description
Plusieurs `useEffect` modifient `currentStep` de manière concurrente, créant des race conditions.

### Code problématique

**OnboardPage.tsx - useEffect principal (lignes 297-351)**
```typescript
useEffect(() => {
  if (auth.loading || profileLoading || isOAuthInProgress) return;
  
  if (!auth.user) {
    setCurrentStep((prevStep) => {
      // Logique complexe de redirection
      if (prevStep === 'profile') {
        return authMode === 'signup' ? 'role' : 'auth';
      }
      // ...
    });
    return;
  }
  
  if (profile && isProfileComplete(profile)) {
    navigate('/dashboard', { replace: true });
    return;
  }
  
  setCurrentStep((prevStep) => {
    // Logique complexe de transition
    if (prevStep === 'auth') {
      // ...
    }
    return prevStep;
  });
}, [auth.user?.id, auth.loading, profileLoading, isOAuthInProgress, ...]);
```

**OnboardPage.tsx - useEffect secondaire (lignes 375-380)**
```typescript
useEffect(() => {
  if (urlStep === 'profile' && auth.user?.id && !isProfileComplete(profile || {})) {
    setCurrentStep('profile'); // ⚠️ Peut entrer en conflit avec le premier useEffect
  }
}, [urlStep, auth.user?.id, profile?.id, isProfileComplete]);
```

**OnboardPage.tsx - useEffect pour profileStep (lignes 354-358)**
```typescript
useEffect(() => {
  if (currentStep === 'profile' && role && profileStep === 1 && authMode === 'signup') {
    setProfileStep(2); // ⚠️ Modifie profileStep indépendamment
  }
}, [currentStep, role, profileStep, authMode]);
```

### Analyse
- 3 `useEffect` différents modifient l'état de navigation
- Race conditions possibles entre ces effets
- Ordre d'exécution non garanti
- Logique difficile à déboguer

### Impact
- Comportement imprévisible
- Transitions d'états incorrectes
- Difficulté de maintenance

---

## ⚠️ PROBLÈME 4 : Redirections multiples et concurrentes

### Description
Plusieurs composants redirigent vers différentes routes, créant un risque de boucles.

### Points de redirection identifiés

1. **Dashboard.tsx (lignes 59-64)**
```typescript
useEffect(() => {
  if (auth.loading || profileLoading) return;
  if (auth.user && profile && !isProfileComplete(profile)) {
    navigate('/onboard?mode=signup&step=profile', { replace: true });
  }
}, [auth.user, auth.loading, profile, profileLoading, navigate]);
```

2. **OnboardPage.tsx (lignes 319-322)**
```typescript
if (profile && isProfileComplete(profile)) {
  navigate('/dashboard', { replace: true });
  return;
}
```

3. **PrivateRoute.tsx (ligne 24)**
```typescript
if (!auth.user) {
  return <Navigate to={`/onboard?mode=login&redirect=${encodeURIComponent(currentPath)}`} replace />;
}
```

### Scénario de boucle possible
1. Utilisateur sur `/dashboard` → Profil incomplet → Redirige vers `/onboard?mode=signup&step=profile`
2. `OnboardPage` détecte profil complet (à cause du bug #1) → Redirige vers `/dashboard`
3. `Dashboard` détecte profil incomplet → Redirige vers `/onboard`
4. **Boucle infinie** 🔄

### Impact
- Boucles de redirection infinies
- Expérience utilisateur catastrophique
- Performance dégradée

---

## ⚠️ PROBLÈME 5 : État de rôle non synchronisé

### Description
Pour le mode `signup`, le rôle vient du state local, pas du profil. En cas de retour après OAuth, le rôle peut être perdu.

### Code problématique

**OnboardPage.tsx (lignes 275-280)**
```typescript
// Déterminer le rôle si login et profil existe déjà
useEffect(() => {
  if (authMode === 'login' && profile?.role) {
    setRole(profile.role);
  }
}, [authMode, profile]);
```

**OnboardPage.tsx (lignes 162)**
```typescript
const [role, setRole] = useState<ProfileRole | null>(null);
```

### Analyse
- Pour `signup`, le rôle est stocké dans le state local
- Après OAuth, si l'utilisateur revient sur `/onboard`, le state local est perdu
- Le rôle n'est récupéré que pour `login`, pas pour `signup`

### Impact
- Perte du rôle après retour OAuth en mode signup
- Impossible de continuer le flow de profil
- Expérience utilisateur dégradée

---

## ✅ SOLUTIONS PROPOSÉES

### Solution 1 : Corriger la vérification de profil

**Option A : Requête jointe pour récupérer `category_id`**
```typescript
const isProfileComplete = useCallback(async (profile: any): boolean => {
  if (!profile) return false;
  const requiredFields = ['role', 'full_name', 'location'];
  const hasRequiredFields = requiredFields.every(
    field => profile[field] && profile[field].toString().trim().length > 0
  );
  if (!hasRequiredFields) return false;
  
  // Pour les artisans, vérifier category_id dans la table artisans
  if (profile.role === 'artisan') {
    const { data: artisan } = await supabase
      .from('artisans')
      .select('category_id')
      .eq('id', profile.id)
      .single();
    if (!artisan?.category_id) return false;
  }
  return true;
}, []);
```

**Option B : Modifier `useProfile` pour inclure `category_id` dans le profil**
```typescript
// Dans useProfile.ts, modifier la requête pour joindre artisans
const { data, error } = await supabase
  .from('profiles')
  .select(`
    *,
    artisans!artisans_id_fkey(category_id)
  `)
  .eq('id', auth.user.id)
  .maybeSingle();
```

**Recommandation : Option B** (plus performante, évite les requêtes multiples)

---

### Solution 2 : Réinitialiser `isOAuthInProgress` après OAuth

**Modification dans OnboardPage.tsx**
```typescript
// Réinitialiser isOAuthInProgress quand l'utilisateur est connecté après OAuth
useEffect(() => {
  if (auth.user && isOAuthInProgress) {
    // Délai pour s'assurer que le profil est chargé
    const timer = setTimeout(() => {
      setIsOAuthInProgress(false);
    }, 500);
    return () => clearTimeout(timer);
  }
}, [auth.user?.id, isOAuthInProgress]);
```

---

### Solution 3 : Centraliser la logique de redirection

**Créer un hook `useOnboardNavigation`**
```typescript
function useOnboardNavigation() {
  const auth = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const authMode = searchParams.get('mode') === 'login' ? 'login' : 'signup';
  const urlStep = searchParams.get('step');
  
  // Logique centralisée de détermination du step
  const determineStep = useCallback((): OnboardStep => {
    if (auth.loading || profileLoading) return currentStep; // Garder l'état actuel
    
    if (!auth.user) {
      return authMode === 'signup' ? 'role' : 'auth';
    }
    
    if (profile && isProfileComplete(profile)) {
      navigate('/dashboard', { replace: true });
      return currentStep; // Ne pas changer, redirection en cours
    }
    
    if (urlStep === 'profile') return 'profile';
    
    if (authMode === 'login') {
      return profile?.role ? 'profile' : 'auth';
    }
    
    // Signup flow
    return role ? 'auth' : 'role';
  }, [auth.user, profile, profileLoading, authMode, urlStep, role]);
  
  return { currentStep: determineStep(), ... };
}
```

---

### Solution 4 : Ajouter des guards pour éviter les boucles

**Dans Dashboard.tsx**
```typescript
const [hasRedirected, setHasRedirected] = useState(false);

useEffect(() => {
  if (auth.loading || profileLoading) return;
  if (hasRedirected) return; // Guard pour éviter les redirections multiples
  
  if (auth.user && profile && !isProfileComplete(profile)) {
    setHasRedirected(true);
    navigate('/onboard?mode=signup&step=profile', { replace: true });
  }
}, [auth.user, auth.loading, profile, profileLoading, navigate, hasRedirected]);
```

**Dans OnboardPage.tsx**
```typescript
const [hasRedirectedToDashboard, setHasRedirectedToDashboard] = useState(false);

useEffect(() => {
  if (auth.loading || profileLoading || isOAuthInProgress) return;
  if (hasRedirectedToDashboard) return; // Guard
  
  if (profile && isProfileComplete(profile)) {
    setHasRedirectedToDashboard(true);
    navigate('/dashboard', { replace: true });
  }
}, [auth.user, profile, isProfileComplete, hasRedirectedToDashboard]);
```

---

### Solution 5 : Persister le rôle dans l'URL ou localStorage

**Option A : Stocker dans l'URL**
```typescript
const handleRoleSelect = (selectedRole: ProfileRole) => {
  setRole(selectedRole);
  setSearchParams(prev => {
    prev.set('role', selectedRole);
    return prev;
  });
  setCurrentStep('auth');
};

// Récupérer depuis l'URL au montage
useEffect(() => {
  const roleFromUrl = searchParams.get('role') as ProfileRole | null;
  if (roleFromUrl && ['client', 'artisan'].includes(roleFromUrl)) {
    setRole(roleFromUrl);
  }
}, []);
```

**Option B : Stocker dans localStorage**
```typescript
const handleRoleSelect = (selectedRole: ProfileRole) => {
  setRole(selectedRole);
  localStorage.setItem('onboard_role', selectedRole);
  setCurrentStep('auth');
};

// Récupérer depuis localStorage au montage
useEffect(() => {
  const savedRole = localStorage.getItem('onboard_role') as ProfileRole | null;
  if (savedRole && ['client', 'artisan'].includes(savedRole)) {
    setRole(savedRole);
  }
}, []);
```

**Recommandation : Option A** (plus propre, pas de nettoyage nécessaire)

---

## 🎯 PLAN D'ACTION RECOMMANDÉ

### Priorité 1 (Critique)
1. ✅ Corriger `isProfileComplete` pour vérifier `category_id` dans `artisans`
2. ✅ Réinitialiser `isOAuthInProgress` après OAuth réussi

### Priorité 2 (Important)
3. ✅ Centraliser la logique de redirection
4. ✅ Ajouter des guards pour éviter les boucles

### Priorité 3 (Amélioration)
5. ✅ Persister le rôle dans l'URL

---

## 📝 NOTES TECHNIQUES

### Structure de données
- `profiles.category_id` : Existe dans le schéma mais n'est jamais rempli
- `artisans.category_id` : Source de vérité pour les artisans
- **Recommandation** : Utiliser uniquement `artisans.category_id` et supprimer `profiles.category_id` du schéma si possible

### Flux OAuth
1. Utilisateur clique sur "S'inscrire avec Google"
2. `handleGoogleAuth` → `setIsOAuthInProgress(true)`
3. Redirection vers Google
4. Retour sur `/onboard?mode=signup`
5. `useAuth` détecte la session
6. **PROBLÈME** : `isOAuthInProgress` reste à `true`
7. Les redirections sont bloquées

### Flux de redirection actuel
```
Dashboard → Profil incomplet → /onboard?mode=signup&step=profile
OnboardPage → Profil complet → /dashboard
PrivateRoute → Pas connecté → /onboard?mode=login
```

**Risque** : Boucle si `isProfileComplete` retourne des résultats incohérents

---

## 🔧 FICHIERS À MODIFIER

1. `src/pages/OnboardPage.tsx`
   - Corriger `isProfileComplete`
   - Réinitialiser `isOAuthInProgress`
   - Centraliser la logique de redirection
   - Persister le rôle

2. `src/pages/Dashboard.tsx`
   - Corriger `isProfileComplete`
   - Ajouter guard pour éviter les boucles

3. `src/hooks/useProfile.ts` (Optionnel)
   - Modifier pour inclure `artisans.category_id` dans le profil

---

## ✅ VALIDATION

Après corrections, tester :
1. ✅ Inscription artisan avec Google OAuth
2. ✅ Inscription artisan avec email/password
3. ✅ Connexion artisan existant
4. ✅ Vérification que les artisans avec profil complet accèdent au dashboard
5. ✅ Vérification qu'il n'y a pas de boucles de redirection
6. ✅ Vérification que `isOAuthInProgress` est bien réinitialisé

---

**Fin du diagnostic**
