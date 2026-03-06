# Chemins vers la clôture d’un projet

## Un seul écran de clôture

La **clôture effective** (notation + libération du paiement) se fait toujours sur **une seule page** :

| Route | Page | Rôle |
|-------|------|------|
| `/projects/:id/completion` | **ProjectCompletionPage** | **Seule page** où le client peut noter l’artisan et clôturer (bouton « Clôturer et envoyer mon avis »). |

Toutes les autres URLs (détail, paiement, merci, suivi) ne font qu’**afficher** des infos ou **rediriger** vers cette page. Il n’y a pas plusieurs “pages de clôture” différentes.

---

## D’où on peut arriver sur la page de clôture

1. **Détail projet** (`ProjectDetailsPage` – `/projects/:id`)
   - Si statut = `completion_requested` ou `completed` → redirection client vers `/projects/:id/completion`.
   - Boutons « Clôturer le projet » / « Noter l’artisan » → `navigate(/projects/:id/completion)`.

2. **Suivi des travaux** (`ProjectWorkPage` – `/projects/:id/work`)
   - Bouton « Clôturer et envoyer mon avis » (quand projet déjà clôturé côté statut) → `navigate(/projects/:id/completion)`.

3. **Aucun autre chemin** : pas de lien direct vers `/completion` depuis thank-you ou payment.

Donc : **plusieurs entrées possibles** (détail, work), mais **une seule page** qui fait la clôture : **ProjectCompletionPage**.

---

## Comment cette page trouve le “devis accepté”

Sur **ProjectCompletionPage**, le devis accepté (et donc l’artisan à noter) est résolu **toujours de la même façon**, dans cet ordre :

1. **RPC** `get_accepted_quote_artisan_for_project(project_id)` (contourne RLS).
2. **Table `quotes`** : `project_id` + `status = 'accepted'`.
3. **Table `quote_revisions`** : révision `accepted` pour ce `project_id` → puis `quotes` via `quote_id`.
4. **Fallback incohérence** : si le projet est déjà en `payment_received` / `in_progress` / `completion_requested` / `completed` et qu’il n’y a **qu’un seul devis** pour le projet, ce devis est considéré comme accepté (réparation d’anciens flux où `quotes.status` n’était pas mis à `accepted`).

Donc **un seul algorithme**, quel que soit le lien (détail ou work) utilisé pour arriver sur `/completion`. Ce n’est pas “une page qui reprend le devis et une autre qui ne le reprend pas” : la même page charge toujours les données de la même façon.

---

## Pourquoi “Devis accepté introuvable” apparaissait

- **Cause 1** : En base, le devis du projet était resté en `pending` alors que le projet était déjà en `completion_requested` (incohérence).
- **Cause 2** : L’ancien fallback appelait la table **`invoices`**, qui **n’existe pas** sur ce projet Supabase → erreurs 404. Ce fallback a été supprimé.

**Corrections faites** :
- Mise à jour en base du devis concerné en `status = 'accepted'` pour le projet concerné.
- Suppression de l’appel à `invoices` (plus de 404).
- Ajout du fallback “un seul devis en phase post-paiement” pour réparer automatiquement ce type d’incohérence à l’avenir.

---

## Résumé

- **Un seul chemin de clôture** : tout mène à **ProjectCompletionPage** (`/projects/:id/completion`).
- **Une seule logique** de résolution du devis accepté (RPC → quotes → quote_revisions → fallback “un seul devis”).
- Les 404 venaient de la table `invoices` inexistante ; c’est corrigé.
- Le projet 56557a95-… avait un devis en `pending` alors qu’il était en clôture demandée ; les données ont été corrigées et le fallback évite que ça bloque à l’avenir.
