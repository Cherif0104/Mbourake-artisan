# Audit des workflows admin (Mbourake)

Audit minimal des pages admin après mise en place du layout unifié (sidebar + routes imbriquées). Les URLs restent `/admin`, `/admin/users`, `/admin/projects`, etc.

## Checklist par page

### AdminVerifications (`/admin/verifications`)
- **Liste** : artisans avec statut de vérification (pending, verified, rejected), chargée depuis `artisans` + `verification_documents` + `profiles`.
- **Filtres** : recherche (nom, email), filtre par statut (tous, en attente, vérifiés, non vérifiés).
- **Actions** : Valider (handleVerify) → met à jour `artisans` et `verification_documents`, envoie notification `verification_approved`. Rejeter (handleReject) → motif de rejet, notification `verification_rejected`.
- **Corrections** : ajout de toasts succès/erreur (useToastContext) après validation et rejet.

### AdminDisputes (`/admin/disputes`)
- **Liste** : projets en statut `disputed` avec client, artisan, escrow.
- **Filtres** : recherche (titre, numéro, noms).
- **Actions** : Résoudre (handleResolve) avec type de résolution (remboursement client, paiement artisan, partage). Met à jour `escrows` et `projects`, envoie notifications aux deux parties.
- **Corrections** : ajout d’un toast succès après résolution.

### AdminEscrows (`/admin/escrows`)
- **Liste** : tous les escrows avec projet et profil client.
- **Filtres** : recherche (titre, numéro), filtre par statut (all, held, released, refunded, refund_pending).
- **Actions** : Approuver remboursement (handleApproveRefund), Rejeter remboursement (handleRejectRefund). Utilise `confirm()` pour la confirmation. Pas de modification des montants (consultation + validation des demandes de remboursement).

### AdminClosures (`/admin/closures`)
- **Liste** : projets en `completion_requested` avec `client_confirmed_closure_at` renseigné.
- **Actions** : Clôturer et verser (handleCloseAndPay) → escrow en `released`, projet en `completed`, notification client + artisan (notifyArtisanPaymentReceived). Toasts déjà présents.

### AdminAffiliations (`/admin/affiliations`)
- **Liste** : `artisan_affiliations` avec profil artisan (nom, avatar).
- **Filtres** : statut (all, pending, verified, rejected), recherche (nom artisan, nom structure, numéro).
- **Actions** : Vérifier (handleVerify), Rejeter (handleReject) avec motif. Toasts utilisés.
- **Corrections** : le contexte toast expose `success` et `error`, pas `showSuccess`/`showError`. Utilisation de `success: showSuccess, error: showError` pour rester cohérent avec le code existant.

## Layout admin

- **Routes** : une seule route parente `/admin` avec `AdminDashboard` (layout avec sidebar + zone de contenu). Enfants : `users`, `projects`, `escrows`, `verifications`, `affiliations`, `disputes`, `closures`.
- **Sidebar** : toujours visible sur toutes les pages admin ; le contenu principal affiche soit la Vue d’ensemble (stats, quick actions) quand `pathname === '/admin'`, soit `<Outlet />` (page listée ci‑dessus).

## RLS

Aucune migration RLS ajoutée dans le cadre de cet audit. Les lectures/écritures admin passent par le client Supabase avec le JWT de l’utilisateur dont le profil a `role = 'admin'`. En cas de blocage (403) sur une action, vérifier les politiques RLS des tables concernées pour le rôle admin ou le recours à une Edge Function avec service_role.
