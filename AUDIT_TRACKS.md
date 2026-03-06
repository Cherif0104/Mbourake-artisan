# Audit – Bugs, conflits, redirections et incohérences

**Date :** 5 mars 2026  
**Objectif :** Repérer les bugs, conflits de redirection, incohérences et points à corriger.

---

## 1. Conflits de redirection

### 1.1 Flux après login (useAuth + Dashboard)

- **useAuth** : après `SIGNED_IN`, redirection vers `/dashboard` (avec éventuel `?redirect=...`). Utilise `window.location.replace()` (rechargement).
- **Dashboard** : `useEffect` lit `redirect` dans l’URL et fait `navigate(redirect, { replace: true })` une fois le profil prêt.
- **Risque** : si le profil met du temps à charger, l’utilisateur reste sur `/dashboard` avec `?redirect=...` jusqu’à la redirection. Pas de conflit direct, mais le `redirect` peut être perdu si l’utilisateur change de page avant la fin du chargement.
- **Recommandation** : considérer un indicateur de chargement « Redirection en cours… » quand `redirect` est présent.

### 1.2 LastRoutePersistence vs landing

- **LastRoutePersistence** : quand l’utilisateur est sur `/`, restaure la dernière route sauvegardée (sauf si `recherche=1` dans l’URL).
- **Cas limite** : utilisateur non connecté sur `/` avec une dernière route sauvegardée (ex. `/marketplace`) → il est redirigé vers `/marketplace`. Comportement voulu.
- **Pas de conflit** identifié avec le flux OAuth : après login, on arrive sur `/dashboard`, pas sur `/`.

### 1.3 Admin

- Admin technique : `useAuth` envoie directement vers `/admin` (pas de passage par `/dashboard`).
- **AdminRoute** : si pas admin → `Navigate to="/dashboard"` ou `/onboard`.
- **Dashboard** : si `profile.role === 'admin'` → `navigate('/admin', { replace: true })`.
- Pas de boucle : on ne redirige pas depuis `/admin` vers `/dashboard` dans ce flux.

### 1.4 EditProfilePage – rechargement complet (corrigé)

- **Fichier** : `src/pages/EditProfilePage.tsx`.
- **Comportement** : après sauvegarde du profil, redirection via `window.location.href` (rechargement complet).
- **Correction appliquée** : remplacement par `navigate('/dashboard' | '/profile', { replace: true })` après 800 ms, sans rechargement.

---

## 2. Bugs potentiels

### 2.1 RevisionsPage – lien « Voir le projet » (corrigé)

- **Fichier** : `src/pages/RevisionsPage.tsx`.
- **Risque** : si `revision.project_id` était `null`/`undefined`, URL devenait `/projects/undefined`.
- **Correction appliquée** : utilisation de `revision.project_id || revision.projects?.id` avec fallback `navigate('/revisions')` si absent.

### 2.2 CreditsPage et route /credits désactivée

- Quand **CREDITS_ENABLED = false**, la route `/credits` rend `<Navigate to="/dashboard" replace />` (dans `App.tsx`). **CreditsPage** n’est jamais montée pour cette route.
- **CreditsPage** contient un `useEffect` qui redirige vers `/onboard?mode=signup` si `!auth.user`. Ce code ne s’exécute pas pour `/credits` quand les crédits sont désactivés. **Pas de bug.**

### 2.3 NotificationBell – données manquantes

- **Fichier** : `src/components/NotificationBell.tsx`.
- Les `navigate()` utilisent `data?.project_id`. Si `data` ou `project_id` est absent, certains `case` ne redirigent pas (comportement correct). Pour `quote_revision_responded` (l.95–97), si `data?.project_id` est absent, aucune redirection n’est faite (reste sur la page actuelle). À documenter ou à prévoir un fallback vers `/dashboard` ou `/revisions` selon le type.

### 2.4 RequestRevisionPage – plusieurs redirections

- Plusieurs appels à `navigate('/dashboard')` ou `navigate(\`/projects/${projectId}\`)` selon les cas d’erreur ou de succès. Vérifier qu’il n’y a pas de double navigation (ex. `navigate` dans un `useEffect` et dans un handler appelé juste après). À valider au clavier / en test.

---

## 3. Incohérences

### 3.1 Navigation : `navigate()` vs `window.location`

- **Majorité** : `navigate()` (React Router) → pas de rechargement.
- **Exceptions** :
  - **useAuth** : `window.location.replace()` après login (volontaire pour repartir sur une session propre).
  - **EditProfilePage** : `window.location.href` après sauvegarde profil → à aligner sur `navigate()`.
  - **useAuth signOut** : `window.location.replace('/')` → cohérent pour vider l’état.
  - **OfflineBanner** : `window.location.reload()` pour « Réessayer » → cohérent.
  - **main.tsx** : `window.location.reload()` après `controllerchange` du Service Worker → cohérent.

### 3.2 Logs de debug en production

- **ProjectDetailsPage** : nombreux `console.log('[DEBUG] ...')` (quotes, annulation, refresh).
- **QuoteForm** : `console.log('[DEBUG QuoteForm] ...')` et `console.warn`.
- **Recommandation** : retirer ces logs ou les conditionner à `import.meta.env.DEV` pour ne pas polluer la console en production.

### 3.3 TODO restant

- **InvoicesPage.tsx** (l.119) : `// TODO: Envoyer l'email avec la facture` → fonctionnalité non implémentée.

---

## 4. Routes et accès

### 4.1 PrivateRoute

- Redirige vers `/onboard?mode=login&redirect=${currentPath}` si non authentifié. Le `redirect` est bien repris après login (via localStorage puis query sur `/dashboard`). **Cohérent.**

### 4.2 RequireNotSuspended

- Redirige vers `/compte-suspendu` avec `replace`. **Cohérent.**

### 4.3 AdminRoute / ChambreMetierRoute / PartnerRoute

- Redirections claires vers `/`, `/dashboard` ou `/onboard` selon le rôle. **Cohérent.**

### 4.4 Route 404

- **App.tsx** : route `path="*"` en dernier rend `NotFoundPage`. **Cohérent.**

---

## 5. Gestion d’erreurs et feedback

- Beaucoup de pages utilisent `showError()` (ToastContext) ou `setError()` local. Les appels API sont souvent dans des `try/catch` avec message utilisateur.
- **Points à surveiller** : endroits où une erreur est seulement `console.error` sans message à l’utilisateur (ex. certaines erreurs dans **ProjectCompletionPage**, **useEscrow**). À passer en revue pour les flux critiques (paiement, clôture, notation).

---

## 6. Synthèse des actions recommandées

| Priorité | Élément | Action | Statut |
|----------|--------|--------|--------|
| Haute | EditProfilePage | Remplacer `window.location.href` par `navigate()` après sauvegarde profil. | **Corrigé** |
| Moyenne | RevisionsPage | Sécuriser le lien « Voir le projet » avec `revision.project_id \|\| revision.projects?.id` et fallback vers `/revisions`. | **Corrigé** |
| Moyenne | Logs DEBUG | Conditionner ou supprimer les `console.log('[DEBUG]'` dans ProjectDetailsPage et QuoteForm. |
| Basse | InvoicesPage | Implémenter ou documenter le TODO « Envoyer l'email avec la facture ». |
| Basse | Dashboard redirect | Optionnel : afficher un court message « Redirection… » quand `?redirect=` est présent. |

---

## 7. Résumé

- **Conflits de redirection** : pas de conflit bloquant identifié. Flux login → dashboard → redirect, admin et LastRoutePersistence sont cohérents. Seule **EditProfilePage** force un rechargement complet.
- **Bugs** : risque sur **RevisionsPage** si `project_id` manquant ; à sécuriser. Autres points (CreditsPage, NotificationBell) sont sous contrôle ou mineurs.
- **Incohérences** : mélange `navigate` / `window.location` limité à quelques cas ; à aligner pour EditProfilePage. Logs de debug à ne pas laisser en production.
- **Fonctionnalités manquantes** : envoi d’email pour la facture (TODO InvoicesPage).

Ce document peut servir de base pour un suivi (tickets, TODO) et des tests ciblés sur les redirections et la clôture de projet.
