# Synthèse : Parcours projet côté client et équivalence artisan

## 1. Parcours client (synthèse)

### Étapes du flux, de la création à la clôture

| Étape | Statut projet / condition | Page / action client | Redirection auto (depuis détail projet) |
|-------|----------------------------|----------------------|------------------------------------------|
| **1. Création** | — | `CreateProjectPage` : formulaire projet | — |
| **2. Publié** | `open` | `ProjectDetailsPage` : attente des devis | — |
| **3. Devis reçu** | `quote_received` | `ProjectDetailsPage` : consultation des devis, accepter / refuser / demander révision | — |
| **4. Accepté** | `quote_accepted` ou révision acceptée | Redirection vers **page de paiement** | Oui → `/projects/:id/payment` |
| **5. Paiement** | `quote_accepted` / `payment_pending` | `ProjectPaymentPage` : montant verrouillé (devis/révision), choix Wave / Orange / Carte, simulation paiement | — |
| **6. Confirmation** | `payment_received` (ou escrow held) | `ProjectThankYouPage` : « Paiement confirmé », boutons **Suivre les travaux** et **Voir les détails du projet** | Oui → `/projects/:id/thank-you` |
| **7. Travaux** | `in_progress` | `ProjectWorkPage` : suivi, demande de clôture (artisan ou client) | Oui → `/projects/:id/work` |
| **8. Clôture demandée** | `completion_requested` | Client confirme la fin des travaux | Oui → `/projects/:id/completion` |
| **9. Clôture + notation** | `completion_requested` / `completed` | `ProjectCompletionPage` : notation (1–5 étoiles), commentaire, **Clôturer et envoyer mon avis** | Oui → `/projects/:id/completion` |
| **10. Terminé** | `completed` | Projet clôturé, paiement versé à l’artisan | — |

### Points clés côté client

- **Redirection selon l’étape** : en ouvrant un projet (dashboard ou « Voir les détails du projet »), le client est renvoyé vers la page de l’étape en cours (paiement, confirmation, travaux, clôture).
- **Montant de paiement** : toujours celui du devis accepté (ou révision), non modifiable ; fallback devis puis révision puis escrow.
- **Paiement sans escrow** : mode bypass pris en charge (pas d’escrow → montant devis, mise à jour `payment_received`).
- **Devis accepté** : récupération avec fallback via `quote_revisions` (révision acceptée) sur paiement et clôture.
- **Clôture** : page dédiée (notation + envoi avis), devis accepté trouvé même via révision.

---

## 2. Note visible sur le profil artisan

- **Déjà en place** : sur `ArtisanPublicProfilePage`, les avis sont chargés depuis la table `reviews` (par `artisan_id`), avec note, commentaire, date et profil client.
- **Affichage** : section « Avis clients », moyenne des notes, nombre d’avis, liste des avis (étoiles + commentaire + réponse artisan si présente).
- **À vérifier** : qu’après clôture et envoi d’avis depuis `ProjectCompletionPage`, la nouvelle review apparaît bien sur le profil public de l’artisan (recharge ou rafraîchissement des données).

---

## 3. Équivalence côté artisan : ce qui existe vs ce qui doit rester aligné

### Ce qui est déjà côté artisan

| Étape / besoin | Côté client | Côté artisan (existant) |
|----------------|-------------|--------------------------|
| Voir le projet | Détail projet | Même `ProjectDetailsPage` (filtré par rôle) |
| Redirection selon étape | Oui (payment, thank-you, work, completion) | Oui : même logique (`isClient \|\| isArtisanAssigned`), artisan aussi redirigé vers work / completion selon statut |
| En attente de paiement | — | Bloc « En attente du paiement du client » (avec ou sans escrow) + lien `ProjectAwaitingPaymentPage` |
| Page « En attente de paiement » | — | `ProjectAwaitingPaymentPage` : réservée à l’artisan assigné, message de patience |
| Travaux | `ProjectWorkPage` (client + artisan) | Même page : client peut demander clôture, artisan peut « Demander la clôture » (completion_requested) |
| Clôture + notation | `ProjectCompletionPage` (client uniquement) | Pas d’équivalent (normal : c’est le client qui note et clôture) |
| Révisions | `RequestRevisionPage` (client) | `RevisionResponsePage` (artisan) : accepter / refuser / modifier |
| Notifications | Notifications (nouveau devis, révision, etc.) | Notifications (révision demandée, devis accepté, paiement reçu, etc.) |

### Conformité et transparence à garder

1. **Redirections**  
   - Déjà : en ouvrant un projet, l’artisan assigné est redirigé comme le client vers la page de l’étape (work, completion).  
   - À garder : un seul critère « étape du projet » pour client et artisan (pas de divergence).

2. **Visibilité des états**  
   - Artisan : toujours voir clairement « En attente du paiement », « Paiement reçu – vous pouvez commencer les travaux », « Travaux en cours », « Clôture demandée », « Terminé ».  
   - Déjà en grande partie sur `ProjectDetailsPage` + `ProjectAwaitingPaymentPage` + `ProjectWorkPage`.

3. **Pages dédiées**  
   - Client : payment, thank-you, work, completion.  
   - Artisan : awaiting-payment (équivalent « attente »), work (commun), pas de page « completion » (la clôture côté client suffit).  
   - À garder : même niveau d’info sur les étapes (texte, boutons, liens).

4. **Notifications**  
   - Artisan : notifié à la révision demandée, au devis accepté, au paiement reçu, à la demande de clôture, à la nouvelle note.  
   - Vérifier que chaque changement d’étape côté client déclenche bien la notif côté artisan (déjà prévu dans `notificationService` et usage dans les pages).

5. **Profil artisan et avis**  
   - Les notes envoyées à la clôture sont stockées dans `reviews` et affichées sur le profil public de l’artisan.  
   - À vérifier en conditions réelles : une clôture + envoi d’avis fait bien apparaître la note sur le profil.

### Récap équivalence fonctionnelle

| Fonctionnalité | Client | Artisan | Conformité |
|----------------|--------|---------|------------|
| Redirection selon étape timeline | Oui | Oui | OK |
| Page paiement | Oui (payment) | N/A | OK |
| Page confirmation après paiement | Oui (thank-you) | N/A | OK |
| Page « En attente de paiement » | N/A | Oui (awaiting-payment) | OK |
| Page travaux (suivi + demande clôture) | Oui | Oui | OK |
| Page clôture + notation | Oui (completion) | N/A (client only) | OK |
| Révisions | Demande (request-revision) | Réponse (revision/respond) | OK |
| Devis accepté / montant | Toujours affiché / verrouillé | Montant projet + attente paiement | OK |
| Notifications | Oui | Oui | À vérifier couverture |
| Avis sur profil artisan | — | Affichage (ArtisanPublicProfilePage) | À vérifier après clôture |

---

## 4. Actions recommandées

1. **Vérifier** : après une clôture avec notation, la nouvelle note apparaît bien dans la section « Avis clients » du profil public de l’artisan.
2. **Garder** : la même logique de redirection (étape → page) pour client et artisan, sans exception.
3. **Documenter** : ce fichier peut servir de référence pour tout ajout (ex. nouvelle étape ou nouvelle page) afin de conserver la parité client / artisan où elle s’applique.
