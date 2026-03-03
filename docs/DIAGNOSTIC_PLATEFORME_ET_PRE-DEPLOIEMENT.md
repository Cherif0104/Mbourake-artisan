# Diagnostic plateforme Mbourake & pré-déploiement production

**Date :** Février 2025  
**Constat :** ~98 % fonctionnel. Ce document liste les écarts à corriger, les améliorations prioritaires et la checklist avant déploiement final.

---

## 1. Profil artisan : notations et cohérence avec la page publique

### Constat
- **Clic sur la photo de profil** (depuis le dashboard / menu) → route **`/profile`** (ProfilePage).
- **Depuis la boutique / fiche artisan** → route **`/artisans/:id`** (ArtisanPublicProfilePage).

Sur **ProfilePage** (mon profil), la section **Avis clients** et les **stats (note, nombre d’avis)** existent déjà dans le code (hero + bloc « Avis clients »). Ce qui manque ou peut prêter à confusion :

- **Produits marketplace** : visibles uniquement sur la page publique (`/artisans/:id`), pas sur `/profile`. L’artisan qui consulte son propre profil ne voit pas « ce qu’il a publié depuis la marketplace ».
- **Visibilité des notations** : si la section est bas dans la page (portfolio, certifications, contact, stats, puis avis), l’utilisateur peut avoir l’impression de « ne pas voir les notations » sans scroller.

### Recommandations

| Priorité | Action |
|----------|--------|
| **Haute** | Sur **ProfilePage** (vue artisan), ajouter une section **« Mes produits »** (marketplace) comme sur ArtisanPublicProfilePage : même source (produits de l’artisan), même rendu type cartes. |
| **Haute** | Remonter ou mettre en avant la section **« Avis clients »** sur ProfilePage (ex. juste après le hero ou après « À propos ») pour que les notations soient visibles sans scroll long. |
| **Moyenne** | Option UX : faire en sorte que le **clic sur la photo/avatar** (artisan connecté) mène vers **`/artisans/:id`** au lieu de `/profile`, pour avoir exactement la même vue que les clients (produits + références + téléphone + notations). Sinon, garder `/profile` mais avec le même contenu (produits + avis bien visibles). |

---

## 2. Redirections et retour intempestif vers la landing

### Constat
- En quittant l’app (changement d’onglet, mise en arrière-plan) puis en revenant, certains utilisateurs sont renvoyés vers la **landing** ou une autre page au lieu de rester sur la page en cours.

### Causes possibles

1. **useAuth** : à chaque événement **SIGNED_IN** (y compris après refresh de token), une redirection vers `/dashboard` ou `/admin` est faite via `window.location.replace`. Si le navigateur/PWA déclenche un refresh de session au retour de l’app, cela peut provoquer un rechargement et une redirection.
2. **Session expirée** : si le token expire en arrière-plan, **PrivateRoute** redirige vers `/onboard?mode=login&redirect=...`. Si la restauration de session est lente, l’utilisateur peut voir brièvement la landing ou l’onboard.
3. **PWA** : en « standalone », au retour après fermeture, l’app peut repartir sur **start_url** (`/` dans le manifest) au lieu de la dernière route.

### Recommandations

| Priorité | Action |
|----------|--------|
| **Haute** | **Persister la dernière route** : dans **sessionStorage**, sauvegarder `pathname + search` à chaque changement de route (ex. dans un composant global ou Router). Au chargement de l’app, si l’utilisateur est connecté et que la route actuelle est `/`, restaurer la dernière route (sauf cas spéciaux : logout, compte supprimé). |
| **Moyenne** | Dans **useAuth**, éviter un **SIGNED_IN** de type « refresh token » de déclencher une redirection full-page si l’utilisateur est déjà sur une page privée (ex. distinguer premier sign-in vs refresh). |
| **Moyenne** | **Manifest PWA** : garder `start_url: "/"` pour le premier lancement, mais s’appuyer sur la route restaurée (ci‑dessus) pour ne pas « perdre » la page en cours au retour. |

---

## 3. Notifications : instantanéité et expérience type « app native »

### Constat
- **useNotifications** : abonnement **Realtime** (Supabase) aux nouvelles notifications → en **production** il est actif ; en **DEV** il est désactivé (éviter le bruit WebSocket).
- Un **son** est déjà joué à la réception (fichier `/notification.mp3` + fallback Web Audio).
- **Limitations** : pas de **Web Push** quand l’app est en arrière-plan ou fermée ; pas de **badge** sur l’icône PWA ; pas de **son répétitif** type « appel » jusqu’à prise en compte par l’artisan.

### Recommandations

| Priorité | Action |
|----------|--------|
| **Haute** | **Activer le Realtime en production** : confirmer que `import.meta.env.DEV` est bien `false` en build prod pour que l’abonnement Supabase soit actif et que les notifications soient instantanées dans l’app ouverte. |
| **Haute** | **Web Push (PWA)** : mettre en place un **service worker** qui reçoit des **Push** (VAPID), affiche une notification native (titre, corps, clic → ouvrir l’app sur la bonne page). Permet « nouveau projet », « nouveau message », etc. même app fermée. |
| **Moyenne** | **Son répétitif pour « nouveau projet »** : pour les artisans, tant qu’une notification `new_project` n’est pas lue/ouverte, jouer un son en boucle (ou 2–3 répétitions) type « appel », avec possibilité de couper dès ouverture de l’app ou de la notification. |
| **Moyenne** | **Badge** : utiliser l’API **Badge** (navigator.setAppBadge) si disponible pour afficher le nombre de non-lus sur l’icône PWA. |
| **Basse** | **Options utilisateur** : paramètre « Sons de notification » (on/off) et éventuellement « Son type appel pour nouvelles demandes ». |

---

## 4. Pages blanches

### Constat
- **ErrorBoundary** existe et enveloppe l’app ; il affiche une UI de fallback en cas d’erreur React.
- **LandingPage** : timeout 3 s pour afficher la landing même si auth/profile chargent encore (éviter écran blanc au premier chargement).
- Pages blanches possibles : erreur non capturée (promesse, async), route lazy qui échoue, ou auth/profile qui restent en loading.

### Recommandations

| Priorité | Action |
|----------|--------|
| **Haute** | S’assurer que **toutes les routes** sont bien enveloppées par l’**ErrorBoundary** existant (vérifier dans App.tsx). |
| **Moyenne** | Pour les **routes lazy** (si utilisées), prévoir un **Suspense** avec fallback (spinner ou squelette) pour éviter un écran vide pendant le chargement du chunk. |
| **Moyenne** | **Timeout de chargement** : sur les pages sensibles (Dashboard, Profile, Projects), après X secondes sans réponse (auth ou données), afficher un message « Problème de chargement » avec bouton « Réessayer » au lieu de rester sur un spinner infini. |
| **Basse** | Logger les erreurs (ErrorBoundary, window.onerror, unhandledrejection) vers un service (ex. Sentry) en production pour diagnostiquer les pages blanches. |

---

## 5. Problèmes de redirection à rendre plus propres

- **PrivateRoute** : redirection vers `/onboard?mode=login&redirect=...` → OK ; vérifier que **après login** le paramètre `redirect` est bien appliqué (Dashboard et useAuth gèrent déjà `mbourake_pending_redirect`).
- **Admin** : les utilisateurs avec `profile.role === 'admin'` sont redirigés de `/dashboard` vers `/admin` → cohérent.
- Vérifier qu’aucun effet (useEffect) ne fait un `navigate('/')` ou `navigate('/dashboard')` sans condition claire (ex. uniquement après logout ou erreur explicite).

---

## 6. Checklist pré-déploiement et pré-mises à jour

### 6.1 Base de données et backend
- [ ] Toutes les **migrations** Supabase exécutées et testées (y compris Sprint 1 RBAC si déployé).
- [ ] **RLS** et politiques testés pour les rôles client / artisan / admin.
- [ ] **Fonctions** (notifications, suppression compte, etc.) déployées et testées (env prod).
- [ ] **Seeds** ou jeux de données de test désactivés ou séparés en prod.

### 6.2 Configuration et secrets
- [ ] Variables d’environnement **production** (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, etc.) définies et sans clés de dev.
- [ ] **CORS** et **URLs autorisées** configurés côté Supabase (auth, redirects).
- [ ] Pas de `console.log` sensibles ou de clés en dur dans le build.

### 6.3 Build et déploiement
- [ ] `npm run build` sans erreur ; pas d’avertissements bloquants.
- [ ] **PWA** : manifest et service worker (si utilisé) valides ; `start_url` et `scope` cohérents.
- [ ] **HTTPS** obligatoire en prod (PWA et auth).

### 6.4 Fonctionnalités critiques
- [ ] **Auth** : inscription, connexion, déconnexion, reset password (si activé).
- [ ] **Parcours projet** : création → devis → acceptation → paiement → travaux → clôture → notation.
- [ ] **Marketplace** : liste produits, fiche produit, panier, commande (si activé).
- [ ] **Admin** : accès réservé, RBAC si activé, pas d’accès aux routes admin sans droit.
- [ ] **Invitations** : lien d’invitation (artisan/client) et attribution organisation.

### 6.5 UX et robustesse
- [ ] **Redirection après login** : `redirect` vers la page demandée (ex. fiche artisan, création projet).
- [ ] **Compte suspendu** : redirection vers page dédiée, pas de blocage silencieux.
- [ ] **Erreurs réseau** : message clair (bannière offline déjà présente) et pas de crash.
- [ ] **Notifications** : en prod, réception en temps réel quand l’app est ouverte ; son joué.

### 6.6 Pré-mises à jour (avant chaque release)
- [ ] **Changelog** ou liste des changements pour la release.
- [ ] **Tests smoke** : login, une création de projet, une vue admin (si applicable).
- [ ] **Sauvegarde / rollback** : possibilité de revenir à la version précédente (build, DB si migrations).
- [ ] **Feature flags** : si des modules sont livrés en désactivé (ex. ERP admin), vérifier qu’ils ne cassent pas l’app.

---

## 7. Synthèse des actions par priorité

### À faire en priorité (avant ou juste après mise en production)
1. **Profil artisan** : afficher les produits marketplace et mettre en avant la section Avis/notations sur `/profile`.
2. **Persistance de la route** : éviter le retour systématique à la landing au retour dans l’app.
3. **Notifications** : confirmer Realtime en prod ; préparer Web Push + service worker pour notifications en arrière-plan.
4. **Pages blanches** : ErrorBoundary sur tout l’app ; timeouts de chargement sur les pages clés.

### Ensuite (expérience « app native »)
5. Son répétitif pour nouvelles demandes (artisans).
6. Badge sur l’icône PWA.
7. Ajustement des redirections auth (éviter refresh token qui recharge la page).

### Maintenance et suivi
8. Checklist pré-déploiement à chaque release.
9. Logging des erreurs en prod pour analyser les pages blanches et les bugs résiduels.

---

*Document généré à partir de l’analyse du code (App, routes, ProfilePage, ArtisanPublicProfilePage, useAuth, useNotifications, ErrorBoundary, manifest PWA). À mettre à jour au fil des corrections.*
