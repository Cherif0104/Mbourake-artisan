# Rapport d’audit – Projet Mbourake

**Date :** 27 janvier 2025  
**Objectif :** Lister ce qui ne va pas (conflits, doublons, incohérences, bugs) de la création du projet jusqu’à l’étape « terminé ».

---

## 1. Base de données / Schéma

### 1.1 Table `quote_revisions` – colonne `suggested_price` manquante

**Problème :**  
Le code envoie parfois `suggested_price` dans `quote_revisions`, alors que la base peut ne pas avoir cette colonne.

- **QuoteRevisionModal** (l.61) envoie `suggested_price` si l’utilisateur remplit un prix suggéré :  
  `...(suggestedPriceNum != null && suggestedPriceNum > 0 && { suggested_price: suggestedPriceNum })`
- **RevisionResponsePage** lit `revision.suggested_price` pour mettre à jour le devis et l’escrow après acceptation.
- Si la migration **`20250121000003_add_fields_to_quote_revisions.sql`** n’est pas appliquée sur Supabase, l’insert échoue avec :  
  `PGRST204 Could not find the 'suggested_price' column of 'quote_revisions' in the schema cache`.

**Impact :**  
Demande de révision avec prix suggéré (via QuoteRevisionModal) → 400 Bad Request.  
Révision « acceptée avec prix suggéré » → risque d’erreur ou de montant ignoré si la colonne n’existe pas.

**À faire :**  
1. Appliquer la migration `20250121000003_add_fields_to_quote_revisions.sql` sur la base (Supabase).  
2. Ou, en attendant : dans **QuoteRevisionModal**, ne pas envoyer `suggested_price` tant que la migration n’est pas appliquée (comme déjà fait dans RequestRevisionPage).

---

### 1.2 RequestRevisionPage – champ « Prix suggéré » jamais enregistré

**Problème :**  
RequestRevisionPage affiche un champ « Prix suggéré » et un state `suggestedPrice`, mais le payload d’insert (l.91–97) ne contient **pas** `suggested_price`.  
Donc la valeur saisie n’est jamais envoyée à la base.

**À faire :**  
- Soit appliquer la migration des champs révision et ajouter `suggested_price` dans le payload quand `suggestedPrice` est renseigné (comme dans QuoteRevisionModal).  
- Soit masquer / désactiver le champ « Prix suggéré » sur RequestRevisionPage tant que la migration n’est pas appliquée, pour ne pas induire l’utilisateur en erreur.

---

## 2. Erreurs React / DOM

### 2.1 `NotFoundError: removeChild` dans un composant `<Text>`

**Problème :**  
En dev, une erreur du type :  
`NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node`  
apparaît, avec la pile qui pointe vers un composant `<Text>` et **RequestRevisionPage.tsx** (vers la ligne du bouton submit, ~235).

**Causes possibles :**  
- Rendu conditionnel qui change vite (spinner / libellé) pendant un commit React, et détache un nœud déjà manipulé.  
- Utilisation d’un composant `<Text>` (ex. Radix UI) avec du contenu ou du nesting qui ne respecte pas les règles HTML (ex. `<p>` dans `<p>`, ou bloc dans inline).  
- Parent (Toast, Modal, etc.) qui démonte un sous-arbre pendant un re-render.

**À faire :**  
- Vérifier dans RequestRevisionPage tout ce qui est rendu autour du bouton (l.235) : pas de `<p>` dans `<p>`, pas de bloc dans un composant inline.  
- Si un lib (Radix, etc.) fournit un `<Text>`, vérifier sa doc et éviter d’y mettre des div/p.  
- S’assurer qu’aucun état (ex. `submitting`) ne cause un démontage/remontage brutal du même bouton entre deux frames.

---

## 3. Parcours projet / UX

### 3.1 Deux chemins pour « Demander une révision »

**Constat :**  
- **RequestRevisionPage** : route dédiée `/projects/:projectId/request-revision?quoteId=...`.  
- **QuoteRevisionModal** : modal ouverte depuis ProjectDetailsPage.

Les deux créent une ligne dans `quote_revisions`, mais :  
- RequestRevisionPage n’envoie pas `suggested_price`.  
- QuoteRevisionModal envoie `suggested_price` si la migration est appliquée.

**Risque :**  
Comportement et données différents selon l’entrée (lien direct vs modal).  
Si la migration n’est pas appliquée, la modal peut faire échouer l’insert alors que la page dédiée peut réussir (sans prix suggéré).

**À faire :**  
- Aligner la logique (champs envoyés, messages d’erreur) entre RequestRevisionPage et QuoteRevisionModal.  
- Utiliser la même règle pour `suggested_price` (uniquement si la migration est appliquée).

---

### 3.2 Révision acceptée = montant du paiement

**Constat :**  
Tu as déjà indiqué que, quand l’artisan accepte une révision (avec prix suggéré ou avec un nouveau devis), c’est ce montant révisé qui doit servir au paiement.  
RevisionResponsePage et useEscrow gèrent déjà :  
- mise à jour du devis avec `suggested_price` ;  
- mise à jour ou création d’escrow avec le nouveau montant.

**Point à surveiller :**  
Partout où on affiche « montant du projet » ou « montant à payer », s’assurer qu’on utilise bien le devis accepté **après** révision (amount à jour ou `modified_quote_id` selon le cas), et pas toujours le premier devis.

---

## 4. Post‑paiement / Suivi

**Constat :**  
La grosse section « Suite post-paiement » a été supprimée ; il reste la timeline « Suivi du projet » avec `id="suivi"` et le bouton « Passer à l’étape suivante ».  
Les liens (thank-you, payment, notifications) envoient vers `/projects/:id#suivi`.

**Points à garder en tête :**  
- Vérifier que, après un paiement réussi, l’utilisateur arrive bien sur la fiche projet avec la section suivi visible (scroll ou premier écran selon le layout).  
- Vérifier que « Passer à l’étape suivante » couvre bien tous les cas (demander clôture, confirmer clôture, noter) selon le statut et le rôle.

---

## 5. Notifications temps réel

**Constat :**  
`useNotifications` souscrit bien au canal Realtime des inserts sur `notifications` (filter `user_id=eq.${user.id}`) et appelle `playNotificationSound()` à chaque nouvelle notification.

**Points à vérifier :**  
- Sur Supabase : Realtime activé pour la table `notifications`, et politique / configuration permettant les `INSERT` pour ce filter.  
- Pas de double abonnement (plusieurs `useNotifications()` montés en même temps) qui multiplierait les sons ou les mises à jour.  
- Si les notifications ne semblent pas « instantanées », contrôler :  
  - la création effective des lignes dans `notifications` (trigger / backend),  
  - les Realtime logs dans le dashboard Supabase.

---

## 6. PWA / Manifest / Icônes

### 6.1 Erreur `icon-144x144.png`

**Problème :**  
Le message « Error while trying to use the following icon from the Manifest: http://localhost:3002/icons/icon-144x144.png » indique qu’une ressource demande cette icône.

**Constat :**  
- `public/manifest.json` et `dist/manifest.json` n’utilisent que `/logo-senegel.png` (192 et 512).  
- Aucun lien vers `icon-144x144.png` dans le code lu.  
- Seul `public/icons/README.md` (et sa copie dans dist) mentionne `icon-144x144.png` comme « à fournir ».

**Hypothèse :**  
Ancien manifest ou ancien service worker en cache, ou outil (cli PWA, autre) qui a généré un manifest référençant `icon-144x144.png`.

**À faire :**  
- Vider le cache du navigateur / désinstaller le PWA de test, puis re-tester.  
- Si l’erreur continue : chercher dans le dépôt et dans le build (dist, service-worker, autre config) toute référence à `icon-144x144` ou `/icons/` et soit la supprimer, soit ajouter un vrai fichier `public/icons/icon-144x144.png`.

---

## 7. Logs et debug

**Constat :**  
ProjectDetailsPage contient beaucoup de `console.log('[DEBUG] …')` (fetch quotes, profiles, etc.).  
Utile en dev, bruyant et un peu coûteux en prod.

**À faire :**  
- À terme : soit les retirer, soit les conditionner à `import.meta.env.DEV` (ou équivalent) pour ne pas les garder en prod.

---

## 8. Récapitulatif des actions prioritaires

| Priorité | Action |
|----------|--------|
| 1 | Appliquer la migration `20250121000003_add_fields_to_quote_revisions.sql` sur Supabase (ou adapter QuoteRevisionModal / RequestRevisionPage pour ne jamais envoyer `suggested_price` tant qu’elle n’est pas appliquée). |
| 2 | Aligner RequestRevisionPage et QuoteRevisionModal : mêmes champs envoyés, même gestion de `suggested_price`. |
| 3 | Sur RequestRevisionPage : soit enregistrer `suggested_price` quand la migration est là, soit cacher/désactiver le champ « Prix suggéré ». |
| 4 | Identifier et corriger la cause du `removeChild` (nesting HTML, usage de `<Text>`, rendu conditionnel du bouton submit). |
| 5 | Vérifier icône / manifest (cache, références à `icon-144x144.png`) pour supprimer l’erreur PWA. |
| 6 | Vérifier Realtime sur `notifications` et les triggers qui créent les lignes, pour l’instantanéité des notifications. |
| 7 | Nettoyer ou conditionner les `console.log('[DEBUG] …')` en vue de la prod. |

---

## 9. Fichiers concernés (pour corrections ciblées)

- **quote_revisions (schéma)** : `supabase/migrations/20250121000003_add_fields_to_quote_revisions.sql`
- **RequestRevisionPage** : `src/pages/RequestRevisionPage.tsx` (payload insert, champ Prix suggéré, zone du bouton submit ~l.235)
- **QuoteRevisionModal** : `src/components/QuoteRevisionModal.tsx` (insert avec `suggested_price`)
- **RevisionResponsePage** : `src/pages/RevisionResponsePage.tsx` (lecture `revision.suggested_price`, mise à jour devis/escrow)
- **Notifications** : `src/hooks/useNotifications.ts` (realtime), configuration Supabase (Realtime, RLS)
- **Manifest / icônes** : `public/manifest.json`, `public/icons/`, `dist/`, service worker éventuel
- **Debug** : `src/pages/ProjectDetailsPage.tsx` (logs [DEBUG])

Une fois ces points traités, le parcours création → révision → paiement → suivi → clôture → notation devrait être plus cohérent et plus stable.
