# Audit du parcours projet – Création → Terminé

**Date** : 27 janvier 2025  
**Contexte** : Multiples discussions et modifications ; parcours « archi-fonctionnel » dégradé (notifications temps réel, paiement → clôture, annotations/notation).

---

## 1. Parcours actuel (carte)

| Étape | Action | Route / Cible | Problèmes repérés |
|-------|--------|----------------|-------------------|
| **1. Création** | `CreateProjectPage` → succès | `navigate('/dashboard')` | OK |
| **2. Devis** | Client accepte devis | `navigate(/projects/:id/payment)` | OK |
| **3. Paiement** | Deux entrées : (A) page dédiée, (B) modal EscrowBanner | Voir §2 | Doublons, thank-you inutilisée |
| **4. Post-paiement** | Redirection / affichage | `#section-suite-post-paiement` ou refresh | Incohérences selon entrée |
| **5. Suivi / travaux** | `/suivi`, `/work`, `/completion` | Tous → `ProjectSuiviPage` → redirect `/projects/:id` | Redirections inutiles, perte de scroll |
| **6. Clôture** | Client / artisan « Demander clôture » ; client « Confirmer » | `ProjectDetailsPage` (section suite post-paiement) | « Voir le suivi » redirige vers même page |
| **7. Terminé** | Admin clôture → `completed` ; client note | `RatingModal` sur fiche projet | Notation jamais auto-ouverte |

---

## 2. Conflits et doublons

### 2.1 Pages supprimées vs nouvelles (git)

- **Supprimées** : `ProjectCompletionPage`, `ProjectWorkPage`
- **Nouvelles** : `ProjectThankYouPage`, `ProjectSuiviPage`

`/work` et `/completion` pointent désormais vers `ProjectSuiviPage`, qui ne fait qu’un **redirect** vers `/projects/:id`. Les anciennes pages dédiées n’existent plus ; la logique « suivi / travaux / clôture » est tout entière dans `ProjectDetailsPage`.

### 2.2 Thank-you jamais utilisée

- Route : `/projects/:id/thank-you` → `ProjectThankYouPage`.
- **Aucun lien** ni `navigate` vers thank-you depuis le flux paiement.
- `ProjectPaymentPage` : après succès → `navigate(/projects/:id#section-suite-post-paiement)`.
- `EscrowBanner` + `PaymentModal` : succès → `confirmDeposit` + `onRefresh` ; pas de redirection.

Conséquence : **thank-you est morte** dans le parcours actuel.

### 2.3 Deux chemins de paiement

| Entrée | Où | Après succès |
|--------|-----|--------------|
| **A** | « Procéder au paiement » / acceptation devis → `ProjectPaymentPage` | Redirect `project#section-suite-post-paiement` |
| **B** | `EscrowBanner` « Payer » → `PaymentModal` | `confirmDeposit` + `onRefresh` ; rester sur fiche ; **pas de scroll** vers la section |

Donc : pas de « page clôture » dédiée après paiement ; soit redirect vers section (A), soit simple refresh (B) sans mise en avant de la section suite post-paiement.

### 2.4 « Voir le suivi » → round-trip inutile

- CTA « Voir le suivi du projet » : `navigate(/projects/:id/suivi)`.
- `ProjectSuiviPage` : `navigate(/projects/:id, { replace: true })`.
- Résultat : on revient sur la **même** fiche projet, **sans** hash, scroll perdu. L’utilisateur est déjà sur la fiche ; le clic ne fait qu’un aller-retour sans gain.

---

## 3. Notifications temps réel

### 3.1 Subscription Realtime

- `useNotifications` : abonnement `postgres_changes` sur `notifications` (INSERT, `user_id=eq.${user.id}`).
- Rafraîchissement liste + `unreadCount` à la réception. **Son** : `new Audio('/notification.mp3')` → fichier **absent** (`public/`), donc 404 silencieux.

### 3.2 Cloche et périmètre d’usage

- **`NotificationBell`** : rendu **uniquement** dans `Dashboard.tsx`.
- Aucun layout partagé pour les routes protégées ; chaque page a son propre header.

Donc :

- **Cloche visible** : seulement sur `/dashboard`.
- **`useNotifications`** (donc Realtime) : Dashboard, ChatPage, ConversationsPage, NotificationsPage.
- **Sans cloche ni hook** : ProjectDetailsPage, CreateProjectPage, ProjectPaymentPage, ProjectThankYouPage, ProjectSuiviPage, etc.

Conséquence : **pas d’instantanéité des notifications** sur fiche projet, paiement, création projet, etc. Dès qu’on quitte Dashboard (ou Chat/Conversations/Notifications), plus de cloche ni d’UI pour les nouvelles notifications.

---

## 4. Paiement → clôture → notation

### 4.1 Paiement réussi → suite

- **Page paiement** : redirect `#section-suite-post-paiement` + toast. OK.
- **Modal** (EscrowBanner) : refresh seulement. Pas de redirect, pas de scroll. L’utilisateur peut ne pas voir tout de suite la section « Suite post-paiement ».

### 4.2 Clôture

- **Demander clôture** (client) : `handleClientRequestClosure` → `completion_requested` + `client_confirmed_closure_at`.
- **Artisan demande d’abord** : `handleRequestCompletion` → `completion_requested` ; puis client **Confirmer** → `handleCompleteProject` → `client_confirmed_closure_at`.
- Admin : `AdminClosures` → clôture + paiement artisan.

Logique cohérente. Point faible : **CTA « Voir le suivi »** renvoie vers la même page (cf. §2.4).

### 4.3 Notation (système d’« annotation »)

- **`RatingModal`** : « Noter l’artisan » avec note + commentaire.
- Ouverture **uniquement** au clic sur « Noter l’artisan » (projet `completed`).
- Commentaire dans le code : *« s’affiche automatiquement après clôture »* → **non implémenté** ; aucun `useEffect` / logique pour ouvrir le modal à l’arrivée sur un projet terminé non encore noté.

---

## 5. Récapitulatif des problèmes

| # | Problème | Sévérité |
|---|----------|----------|
| 1 | Notifications temps réel : cloche uniquement sur Dashboard ; pas de cloche sur fiche projet, paiement, etc. | **Haute** |
| 2 | `/notification.mp3` absent → pas de son sur nouvelle notification | Moyenne |
| 3 | Thank-you jamais atteinte dans le flux | Moyenne |
| 4 | « Voir le suivi » → redirect vers même page, perte de scroll | Haute |
| 5 | Paiement via modal : pas de redirect ni scroll vers section suite post-paiement | Haute |
| 6 | Notation jamais ouverte automatiquement après clôture | Moyenne |
| 7 | Doublon / confusion : `/suivi`, `/work`, `/completion` → même redirect | Faible |
| 8 | Notifications `project_completed` / clôture : `getNotificationTarget` envoie vers `#devis` au lieu de la section clôture/suivi | Moyenne |

---

## 6. Corrections prioritaires recommandées

### P0 – Impact direct parcours et UX

1. **Cloche + Realtime sur toutes les pages protégées**  
   - Introduire un **layout partagé** pour les routes sous `PrivateRoute` avec header (ou barre) commun incluant `NotificationBell`.  
   - Ou, à défaut, inclure `NotificationBell` dans le header de chaque page protégée majeure (fiche projet, paiement, etc.) pour restaurer l’« instantanéité » des notifications.

2. **« Voir le suivi »**  
   - Ne plus faire `navigate(/suivi)`.  
   - Remplacer par un **scroll** vers `#section-suite-post-paiement` sur la fiche projet (déjà utilisée après paiement).  
   - Adapter tous les CTA « Voir le suivi du projet » (section suite post-paiement + barre fixe bas de page).

3. **Paiement via modal (EscrowBanner)**  
   - Après `confirmDeposit` + `onRefresh` : **fermer le modal**, puis **naviguer** vers `/projects/:id#section-suite-post-paiement` (ou au minimum scroll vers cette section si on reste sur la fiche).  
   - Aligner l’UX avec la page paiement dédiée.

### P1 – Cohérence et clarté

4. **Thank-you**  
   - Soit l’intégrer au flux : après succès paiement (page ou modal) → redirect `/thank-you` puis auto-redirect (ex. 3 s) vers `#section-suite-post-paiement`, comme déjà prévu dans `ProjectThankYouPage`.  
   - Soit la retirer (route + page) si vous simplifiez en ne gardant que la redirect vers la section.

5. **Notation auto**  
   - Sur fiche projet, quand `status === 'completed'`, aucun avis existant pour ce client/artisan, et projet déjà chargé : **ouvrir** `RatingModal` automatiquement (ex. `useEffect` sur `project`, `status`, `reviews`).  
   - Conserver la possibilité de « Plus tard » / fermeture.

6. **`/notification.mp3`**  
   - Ajouter un fichier son dans `public/` ou utiliser un asset existant, et garder l’appel dans `useNotifications` pour les INSERT.  
   - Ou supprimer l’appel si vous ne voulez pas de son.

### P2 – Nettoyage

7. **Routes `/work` et `/completion`**  
   - Les garder en alias vers `ProjectSuiviPage` si des liens externes existent, sinon envisager de les supprimer et ne garder que `/suivi` (ou tout supprimer et ne garder que des liens directs vers la fiche + hash).

8. **Notifications clôture / `project_completed`**  
   - Dans `getNotificationTarget` (NotificationsPage) et dans le routage du clic (NotificationBell), envoyer vers `#section-suite-post-paiement` (ou équivalent) pour les types liés à la clôture, au lieu de `#devis`.

---

## 7. Fichiers principaux concernés

| Fichier | Rôle |
|---------|------|
| `App.tsx` | Routes, layout (à ajuster si layout commun) |
| `Dashboard.tsx` | `NotificationBell` actuel |
| `ProjectDetailsPage.tsx` | Section suite post-paiement, CTA clôture/suivi, `RatingModal` |
| `ProjectPaymentPage.tsx` | Redirect après paiement |
| `ProjectThankYouPage.tsx` | Page thank-you (hors flux actuel) |
| `ProjectSuiviPage.tsx` | Redirect vers fiche projet |
| `EscrowBanner.tsx` | Modal paiement, `onSuccess` |
| `PaymentModal.tsx` | `onSuccess` |
| `useNotifications.ts` | Realtime, son |
| `NotificationBell.tsx` | Clic → navigation |
| `NotificationsPage.tsx` | `getNotificationTarget` |

---

## 8. Synthèse

- **Parcours** : de la création à la clôture, la logique est surtout dans `ProjectDetailsPage` ; les anciennes pages « work » / « completion » ont été remplacées par des redirects.
- **Points qui « partent en cacahuètes »** :  
  - **Notifications** : pas de cloche ni Realtime hors Dashboard (et quelques pages).  
  - **Paiement** : double entrée (page vs modal) et comportement différent après succès (redirect vs refresh sans scroll).  
  - **Suivi** : CTA « Voir le suivi » inutile (round-trip, perte de scroll).  
  - **Notation** : jamais automatique après clôture.

En appliquant les corrections P0 puis P1, le parcours redevient lisible, cohérent et à nouveau « archi-fonctionnel » comme décrit avant les changements récents.

---

## 9. Correctifs appliqués (27 janv. 2025)

### P0 – Réalisés

1. **Cloche + Realtime global**  
   - `NotificationBell` déplacée dans `PrivateRoute` : rendue en `fixed top-4 right-4 z-[100]` sur toutes les routes protégées.  
   - Suppression du `NotificationBell` dans le header du `Dashboard`.  
   - Les notifications temps réel sont désormais disponibles sur fiche projet, paiement, création, etc.

2. **« Voir le suivi »**  
   - Tous les CTA « Voir le suivi du projet » dans `ProjectDetailsPage` remplacent `navigate(/projects/:id/suivi)` par un **scroll** vers `#section-suite-post-paiement`.  
   - `ProjectThankYouPage` : le bouton « Voir le suivi » pointe vers ` /projects/:id#section-suite-post-paiement` au lieu de `/suivi`.

3. **Paiement via modal (EscrowBanner)**  
   - Nouveau prop `onPaymentSuccess?: () => void` sur `EscrowBanner`.  
   - Après `confirmDeposit` et `onRefresh`, appel de `onPaymentSuccess?.()`.  
   - `ProjectDetailsPage` passe un callback qui scroll vers `#section-suite-post-paiement` (client uniquement).  
   - `onRefresh` typé `() => void | Promise<void>` et await avant `onPaymentSuccess`.

### À faire (P1 / P2)

- Intégrer ou retirer la page thank-you du flux.  
- Ouvrir automatiquement le `RatingModal` après clôture lorsque le client n’a pas encore noté.  
- Ajouter `/notification.mp3` ou retirer l’appel.  
- Ajuster `getNotificationTarget` pour les notifications clôture → `#section-suite-post-paiement`.  
- Nettoyer les routes `/work` et `/completion` si inutiles.
