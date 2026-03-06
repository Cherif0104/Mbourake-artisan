# Plan de tests finaux – Mbourake (ultra détaillé)

Document de **plan de tests** pour la recette finale. Pour chaque point : **étapes à exécuter**, **résultat attendu**, **critères de validation** (OK / À corriger).

---

## 1. Accès public (non connecté)

### 1.1 Landing (/)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir `/` en navigation normale | Page d’accueil s’affiche (hero, catégories, recherche). | ☐ |
| 2 | Rafraîchir la page (F5) sur `/` | Pas de page blanche ; contenu identique. | ☐ |
| 3 | Cliquer « S’inscrire » / « Se connecter » | Redirection vers `/onboard`. | ☐ |
| 4 | Sur mobile, attendre ~1 s | Bandeau PWA « Téléchargez Mbourake » ou lien « Installer l’application » visible (footer). | ☐ |
| 5 | Vérifier le footer | Liens À propos, Aide, Artisans ; sur mobile : « Installer l’application ». | ☐ |

### 1.2 À propos (/about)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Aller sur `/about` | Contenu À propos affiché. | ☐ |
| 2 | Cliquer « Retour » ou lien équivalent | Retour cohérent (accueil ou précédent). | ☐ |
| 3 | Vérifier les liens vers Aide / inscription | Liens fonctionnels. | ☐ |

### 1.3 Aide (/aide)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Aller sur `/aide` | Page d’aide affichée. | ☐ |
| 2 | Vérifier le contenu | Contenu à jour, pas de lien cassé. | ☐ |

### 1.4 Artisans (/artisans)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Aller sur `/artisans` | Liste ou cartes des artisans. | ☐ |
| 2 | Utiliser les filtres par catégorie | Liste mise à jour selon la catégorie. | ☐ |
| 3 | Cliquer sur un artisan | Redirection vers `/artisans/:id` (profil public). | ☐ |
| 4 | Rafraîchir sur `/artisans` (base `/`) | Pas de 404 sur les assets ; chargement correct. | ☐ |

### 1.5 Profil public artisan (/artisans/:id)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir un profil artisan | Infos, avis, galerie, bouton « Demander un devis ». | ☐ |
| 2 | Cliquer « Demander un devis » | Redirection vers `create-project?artisan=:id`. | ☐ |
| 3 | Cliquer « Partager ce profil » | Modal partage (lien, copier, SMS si dispo). | ☐ |
| 4 | Cliquer sur une image de la galerie | Lightbox / vue agrandie ; navigation et fermeture OK. | ☐ |
| 5 | Lien vers marketplace produit (si présent) | Navigation vers la fiche produit. | ☐ |

### 1.6 Catégorie (/category/:slug)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Aller sur une URL `/category/:slug` valide | Liste des artisans de la catégorie. | ☐ |
| 2 | Vérifier la cohérence | Slug et liste correspondent. | ☐ |

### 1.7 Marketplace (/marketplace)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Aller sur `/marketplace` | Liste des produits, filtres. | ☐ |
| 2 | Rafraîchir sur `/marketplace` (base `/`) | Pas de page blanche. | ☐ |
| 3 | Cliquer sur un produit | Navigation vers la fiche produit. | ☐ |

### 1.8 Fiche produit (/marketplace/:productId)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir une fiche produit (non connecté) | Détail produit, artisan. | ☐ |
| 2 | Cliquer « Acheter » ou « Ajouter au panier » | Redirection vers login/onboard. | ☐ |

### 1.9 Favoris (/favorites)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Aller sur `/favorites` non connecté | Redirection ou message « Connectez-vous » / page vide explicite. | ☐ |

### 1.10 Invitation (/invite/:token)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir `/invite/:token` avec token valide | Acceptation, redirection vers onboard avec paramètres. | ☐ |
| 2 | Ouvrir avec token invalide ou expiré | Message clair (token invalide/expiré). | ☐ |

### 1.11 Compte suspendu (/compte-suspendu)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Accéder à la page (si applicable) | Message dédié, pas d’accès au reste de l’app. | ☐ |

### 1.12 404 (route inconnue)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Aller sur une URL inexistante (ex. `/xyz/abc`) | Page 404 avec boutons « Retour accueil » / « Page précédente ». | ☐ |
| 2 | Vérifier | Aucune page blanche ni fuite d’erreur. | ☐ |

---

## 2. Authentification et onboarding

### 2.1 Onboard – Connexion (/onboard)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Aller sur `/onboard`, saisir email/mot de passe valides | Connexion réussie, redirection (dashboard ou paramètre `redirect`). | ☐ |
| 2 | Saisir identifiants invalides | Message d’erreur, pas de boucle infinie. | ☐ |
| 3 | Vérifier OAuth (si configuré) | Connexion OAuth puis redirection. | ☐ |
| 4 | Cliquer « S’inscrire » | Affichage formulaire d’inscription. | ☐ |

### 2.2 Onboard – Inscription

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Remplir formulaire (client ou artisan), champs requis | Inscription réussie, message de succès. | ☐ |
| 2 | Vérifier validation | Erreurs affichées si email invalide, rôle requis, etc. | ☐ |
| 3 | Après succès | Redirection vers dashboard ou page prévue. | ☐ |

### 2.3 Persistance de la dernière page (LastRoutePersistence)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Être sur une page (ex. fiche produit), cliquer « Se connecter » | Après login, retour sur cette page (et non toujours dashboard). | ☐ |
| 2 | Tester avec plusieurs routes (marketplace, projet, etc.) | Comportement cohérent. | ☐ |

---

## 3. Parcours client – Projet (devis → paiement → clôture → notation)

### 3.1 Création de projet (/create-project)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Remplir formulaire (titre, catégorie, description, critères) | Envoi possible. | ☐ |
| 2 | Soumettre avec champs manquants | Erreurs/toasts (champs requis, catégorie). | ☐ |
| 3 | Soumettre formulaire valide | LoadingOverlay pendant la création. | ☐ |
| 4 | Après création | Redirection vers détail projet ; notification `new_project` aux artisans (ou un seul si projet ciblé). | ☐ |

### 3.2 Détail projet – Client – Projet ouvert (/projects/:id)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir un projet (client, statut ouvert) | Affichage projet, liste des devis reçus. | ☐ |
| 2 | Vérifier RLS | Le client voit tous les devis du projet. | ☐ |
| 3 | Tant qu’aucun devis accepté | Pas de message erroné « aucun devis accepté » pour l’étape en cours. | ☐ |

### 3.3 Accepter un devis (ProjectDetailsPage)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Cliquer « Accepter » sur un devis | Ouverture ConfirmModal « Accepter ce devis ? ». | ☐ |
| 2 | Confirmer | Mise à jour quote (status accepted), projet (quote_accepted / payment_pending), notification artisan (quote_accepted). | ☐ |
| 3 | Si CREDITS_ENABLED | Blocage si artisan sans crédits + message ; sinon acceptation sans blocage. | ☐ |
| 4 | Vérifier | Impossible d’accepter un second devis si un est déjà accepté. | ☐ |

### 3.4 Refuser un devis

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Cliquer « Refuser », optionnellement saisir une raison | Refus enregistré, notification artisan (quote_rejected). | ☐ |
| 2 | Vérifier | Toast succès, liste des devis à jour, pas d’erreur RLS. | ☐ |

### 3.5 Demander une révision (QuoteRevisionModal)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir modal révision, saisir commentaire, envoyer | Création quote_revisions, notification artisan (quote_revision_requested). | ☐ |
| 2 | Vérifier | Modal se ferme, pas de double envoi. | ☐ |
| 3 | Depuis RevisionsPage, cliquer « Voir le projet » | Lien correct (revision.project_id ou fallback), pas de 404. | ☐ |

### 3.6 Redirection automatique par étape (ProjectDetailsPage)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Après acceptation devis (client) | Redirection vers `/payment` proposée/affichée. | ☐ |
| 2 | Après paiement (client) | Redirection vers thank-you puis suivi/travaux. | ☐ |
| 3 | Vérifier | Pas de boucle ni mauvaise étape (work, completion selon statut). | ☐ |

### 3.7 Paiement (/projects/:id/payment)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir la page paiement (devis accepté) | Montant affiché (devis ou escrow), pas 0 si devis chargé. | ☐ |
| 2 | Remplir formulaire (méthode, téléphone), valider | processPayment + confirmDeposit (useEscrow), création/mise à jour escrow, projet payment_received. | ☐ |
| 3 | Côté artisan | Notification « Le client a sécurisé votre argent » (détail reliquat). | ☐ |
| 4 | Cas erreur (devis introuvable) | Message d’erreur clair (RPC ou lecture directe selon implémentation). | ☐ |

### 3.8 Thank-you (/projects/:id/thank-you)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Après paiement, accéder à thank-you | Confirmation paiement, liens vers suivi / travaux. | ☐ |

### 3.9 Suivi (/projects/:id/suivi) – Client

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir la page suivi (client) | Vue suivi projet, lien vers travaux ou attente artisan. | ☐ |

### 3.10 Demande de clôture par le client (ProjectDetailsPage)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Afficher projet en payment_received ou in_progress (sans completion_requested) | Bouton « Travaux terminés – Demander la clôture » visible (client). | ☐ |
| 2 | Cliquer et confirmer (ConfirmModal si présent) | handleClientRequestClosure → projet completion_requested, notification artisan. | ☐ |
| 3 | Si déjà completion_requested ou completed | Bouton non affiché ou désactivé selon spec. | ☐ |

### 3.11 Page clôture + notation (/projects/:id/completion) – Client

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir la page completion (client, projet en attente clôture) | Chargement projet, escrow, devis accepté (RPC prioritaire, puis quotes, puis quote_revisions). | ☐ |
| 2 | Ne jamais afficher | « Devis accepté introuvable » si le client a bien accepté un devis (RPC + fallbacks en place). | ☐ |
| 3 | Remplir notation (étoiles + commentaire), « Clôturer et noter » | Insert reviews, projet completed, notification artisan (payment_received + « Nouvelle note reçue »). | ☐ |
| 4 | Vérifier | RPC déployée sur l’instance ; auth.uid() et client_id cohérents. Son + toast/vibration si configurés. | ☐ |

### 3.12 Modal notation (RatingModal) – Ouverture auto

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | En tant que client, ouvrir détail projet terminé sans encore de review | Ouverture automatique du modal de notation (une fois). | ☐ |
| 2 | Vérifier | Artisan résolu (acceptedQuote ou resolvedArtisanForRating ou resolvedAcceptedArtisanId). Pas d’ouverture en boucle (ratingAutoOpenedRef). | ☐ |

### 3.13 Bandeau « Noter l’artisan » (ProjectDetailsPage) – Client

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Projet completed, client, pas encore noté | Bandeau « Noter l’artisan » affiché (acceptedQuote ou escrow ou resolvedArtisanForRating). | ☐ |
| 2 | Cliquer | Ouvre RatingModal. | ☐ |
| 3 | Même si devis accepté non visible (RLS) | Bandeau visible grâce à resolvedArtisanForRating. | ☐ |

---

## 4. Parcours artisan – Même projet

### 4.1 Dashboard – Artisan

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Se connecter en artisan, ouvrir dashboard | Bloc « Mes devis », projets catégorie, liens révisions, finances, dépenses, boutique, commandes, **Avis reçus**. | ☐ |
| 2 | Cliquer « Avis reçus » | Redirection vers `/avis-recus`. | ☐ |
| 3 | Si CREDITS_ENABLED = false | Pas de lien crédits visible. | ☐ |

### 4.2 Réception nouvelle demande (new_project)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Créer un projet (client) ciblant l’artisan ou ouvert à sa catégorie | Notification reçue en temps réel (cloche + toast + son + badge). | ☐ |
| 2 | Vérifier | Liste notifications à jour sans F5. Realtime activé (migration enable_realtime_notifications). | ☐ |

### 4.3 Soumission devis (ProjectDetailsPage – artisan)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir formulaire devis (QuoteForm), remplir montant, délai, message, envoyer | Insert quote, notification client (new_quote). | ☐ |
| 2 | Côté client | Notification new_quote reçue en temps réel. | ☐ |

### 4.4 Réception « Devis accepté » (quote_accepted)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Côté artisan après acceptation par le client | Notification + lien vers projet ; bandeau / redirection « En attente paiement client ». | ☐ |
| 2 | Vérifier | Artisan voit le statut et le montant du devis accepté. | ☐ |

### 4.5 Révision demandée (quote_revision_requested)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Client demande révision | Notification artisan, lien vers révision. | ☐ |
| 2 | RévisionsPage / RevisionResponsePage | Lien « Voir le projet » fonctionne (revision.project_id ou projects?.id), pas de 404. | ☐ |

### 4.6 Réponse à la révision (RevisionResponsePage / QuoteRevisionResponseModal)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Artisan : Accepter / Refuser / Modifier | Mise à jour quote_revisions, notification client (quote_revision_responded). | ☐ |
| 2 | Après « Accepter » révision | Trigger BDD : projet quote_accepted et quotes.status = 'accepted' (migration 20260308100000). | ☐ |
| 3 | Vérifier en base et dans l’UI | Client et artisan voient le devis accepté partout. | ☐ |

### 4.7 En attente paiement client (ProjectAwaitingPaymentPage / bandeau)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Artisan, devis accepté, paiement pas encore fait | Message « Le client doit procéder au paiement », lien détail projet. | ☐ |

### 4.8 Paiement reçu / sécurisé (payment_received)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Après paiement client | Notification artisan « Le client a sécurisé votre argent » + détail reliquat. | ☐ |
| 2 | Projet en payment_received | Artisan peut accéder aux travaux. Notification en temps réel. | ☐ |

### 4.9 Travaux (/projects/:id/work) – Artisan

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir page travaux (artisan) | Contenu page, bouton « Marquer les travaux comme terminés ». | ☐ |
| 2 | Cliquer le bouton | ConfirmModal ; confirmer → projet completion_requested ou notification client (project_completed). | ☐ |
| 3 | Vérifier | ConfirmModal ne se ferme pas au clic overlay (stopPropagation). Notification client reçue. | ☐ |

### 4.10 Demander la clôture (ProjectDetailsPage – Artisan)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Artisan, phase suivi, (acceptedQuote OU resolvedAcceptedArtisanId) | Bouton « Travaux terminés – Demander la clôture » visible. | ☐ |
| 2 | Cliquer et confirmer | handleRequestCompletion → projet completion_requested, notification client. | ☐ |
| 3 | Priorité | Plus d’erreur « Impossible de demander la clôture : aucun devis accepté » quand acceptation via révision (resolvedAcceptedArtisanId rempli par RPC). | ☐ |

### 4.11 En attente client (completion_requested) – Artisan

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Projet en completion_requested (côté artisan) | Bandeau « En attente du client – Il doit confirmer la fin des travaux ». | ☐ |
| 2 | Pas de bouton dupliqué | Une seule action claire. | ☐ |

### 4.12 Clôture effectuée + note reçue

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Client clôture et note | Notification artisan « Nouvelle note reçue » (system, kind rating_received). | ☐ |
| 2 | Clic notification | Redirection vers `/avis-recus`. | ☐ |
| 3 | Page Avis reçus | KPIs et historique affichés. | ☐ |

### 4.13 Abandon de devis (artisan clôture sa participation)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Artisan : bouton abandon (si autorisé) | ConfirmModal puis quote status abandoned, notification client (client_artisan_abandoned). | ☐ |
| 2 | Uniquement si devis pas encore accepté ou cas autorisés | Message client clair. | ☐ |

---

## 5. Chat et messages

### 5.1 Conversations (/conversations)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir /conversations | Liste des conversations (projets avec messages ou devis accepté), compteur non lus. | ☐ |
| 2 | Participant affiché | Résolution correcte (acceptedQuote ou RPC) pour le bon interlocuteur. | ☐ |

### 5.2 Chat projet (/chat/:projectId)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir un chat projet | Messages texte (et audio si implémenté), envoi possible. | ☐ |
| 2 | Envoyer un message | Réception temps réel (useMessages channel), notification new_message à l’autre partie. | ☐ |
| 3 | Ouvrir le chat | Marquage lu ; pas de doublon. Notification « Nouveau message » sans F5. | ☐ |

---

## 6. Notifications et temps réel

### 6.1 Cloche (NotificationBell)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Cliquer sur la cloche | Dropdown avec liste des notifications. | ☐ |
| 2 | Marquer lu / supprimer / « Voir tout » | Actions appliquées, redirections par type (projet, chat, avis reçus, dashboard). | ☐ |
| 3 | Badge | Nombre de non lus affiché. Filtre user_id côté Realtime. | ☐ |

### 6.2 Page Notifications (/notifications)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir /notifications | Liste complète, marquer tout comme lu, supprimer. | ☐ |
| 2 | Logique getNotificationTarget | Cohérence avec la cloche ; pas de liste vide si la cloche a des entrées (même user_id). | ☐ |

### 6.3 Realtime – Nouvelle notification

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Déclencher une action qui insère une notification (autre compte ou admin) | Liste + compteur mis à jour, son, toast (NotificationRealtimeToaster), vibration mobile, titre onglet « (n) Mbourake ». | ☐ |
| 2 | Pas de F5 | Nouvelle notification visible sans rafraîchir. Migration enable_realtime_notifications appliquée. | ☐ |

### 6.4 Realtime – UPDATE (marquer lu)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Marquer une notification comme lue (même onglet ou autre appareil) | Compteur et liste mis à jour dans les autres onglets (subscription UPDATE). | ☐ |

---

## 7. Factures et prestations (artisan / client)

### 7.1 Page Factures (/invoices) – Artisan

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir /invoices en artisan | Section « Prestations réalisées » (escrows par projet accepté). | ☐ |
| 2 | Statuts | Client a payé – En attente versement, Versé, En attente résolution, Remboursé, En attente paiement client. Icône Unlock (pas UnlockCircle). | ☐ |
| 3 | Liens « Voir le projet » | Corrects. | ☐ |
| 4 | Si table invoices absente | Message « Factures en préparation », pas de crash. | ☐ |
| 5 | Bouton « Envoyer » (email facture) | Désactivé, libellé « Envoyer (bientôt) », tooltip « Envoi par email : bientôt disponible ». | ☐ |

### 7.2 Page Factures – Client

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir /invoices en client | Liste factures, filtres statut, téléchargement PDF, détail. | ☐ |
| 2 | Modal détail | Ouverture, fermeture, boutons télécharger / envoyer selon spec. | ☐ |

---

## 8. Avis reçus (artisan)

### 8.1 Page Avis reçus (/avis-recus)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir /avis-recus en artisan | KPIs (note moyenne, nombre d’avis, avec commentaire), répartition 1–5 étoiles. | ☐ |
| 2 | Liste des avis | Projet, client, note, commentaire, date ; lien « Voir le projet ». | ☐ |
| 3 | Données | reviews + profiles (client) correctes ; alias Supabase pour le nom client. | ☐ |
| 4 | Accès non-artisan | Accès refusé propre (redirection ou message). | ☐ |

---

## 9. Marketplace (achats)

### 9.1 Panier (/panier)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir /panier | Liste articles, quantités, passage commande, liens checkout / marketplace. | ☐ |
| 2 | LoadingOverlay pendant chargement | Pas de page blanche. | ☐ |

### 9.2 Checkout (/marketplace/:productId/checkout)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Remplir et valider checkout | Création commande, redirection my-orders ou erreur. | ☐ |
| 2 | En cas d’erreur | Toast, pas de crash. Redirection avec orderId si besoin. | ☐ |

### 9.3 Mes commandes (/my-orders) – Client

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir /my-orders | Liste commandes, statuts, lien détail ou marketplace. | ☐ |
| 2 | Filtres et affichage | Cohérents. | ☐ |

### 9.4 Commandes boutique (/my-shop-orders) – Artisan

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir /my-shop-orders | Commandes reçues pour les produits de l’artisan. | ☐ |
| 2 | Statuts et actions | Ex. marquer expédié si applicable. | ☐ |

---

## 10. Profil, paramètres, autres pages compte

### 10.1 Profil (/profile)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir /profile | Infos profil, onglets selon rôle ; avis reçus (artisan). | ☐ |
| 2 | Liens | Tous fonctionnels. | ☐ |

### 10.2 Édition profil (/edit-profile)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Modifier et sauvegarder | Sauvegarde OK, redirection avec navigate(..., { replace: true }) (pas window.location). | ☐ |
| 2 | Upload photo/vidéo | Validation métier ; toasts erreur (taille, nombre max). | ☐ |

### 10.3 Paramètres (/settings)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Demande suppression compte | Modale étapes, statuts requested/confirmed. | ☐ |
| 2 | ConfirmModal | Pas de suppression sans confirmation. | ☐ |

### 10.4 Vérification (/verification) – Artisan

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Upload documents, envoi | Message « Vous recevrez une notification ». | ☐ |
| 2 | Côté admin : approuver / rejeter | Notification artisan (verification_approved / verification_rejected) reçue. | ☐ |

### 10.5 Dépenses (/expenses)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir /expenses | Liste dépenses, modal « Add Expense », LoadingOverlay, filtres. | ☐ |
| 2 | Ajout / édition / suppression | Actions correctes. | ☐ |

### 10.6 Crédits (/credits) (si CREDITS_ENABLED = true)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir /credits | Solde, achat crédits. | ☐ |
| 2 | Si CREDITS_ENABLED = false | Route redirige vers dashboard ; pas de lien visible. | ☐ |

---

## 11. Overlays et modales (détaillé)

### 11.1 LoadingOverlay (global)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Déclencher un fetch (dashboard, RevisionsPage, ProjectDetailsPage, InvoicesPage) | Overlay affiché (z-index 9999, full screen, « Chargement… »). | ☐ |
| 2 | À la fin du chargement | Overlay disparaît. Pas de conflit avec modales (contain: layout). Pas de tremblement ni clic à travers. | ☐ |

### 11.2 ToastContainer (toasts)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Déclencher succès / erreur / warning / info | Toast affiché, auto-dismiss, fermeture manuelle possible. | ☐ |
| 2 | z-index | Au-dessus du contenu ; pas masqué par InstallPrompt ou NotificationBell. Pas de cumul excessif. | ☐ |

### 11.3 InstallPrompt (PWA)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Mobile, après ~1 s | Bandeau « Téléchargez Mbourake », bouton Télécharger (Android) ou instructions 2 étapes (iOS), fermer, « Ne plus proposer ». | ☐ |
| 2 | En standalone | Ne pas réafficher. z-index 100, pas de chevauchement avec toasts. | ☐ |

### 11.4 NotificationRealtimeToaster

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Nouvelle notification (événement mbourake-new-notification) | Toast avec titre notification + vibration. | ☐ |

### 11.5 ConfirmModal (ProjectDetailsPage, ProjectWorkPage, etc.)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir une modale de confirmation | Titre, message, boutons Confirmer / Annuler. | ☐ |
| 2 | Clic overlay / Annuler | Fermeture selon implémentation. stopPropagation si nécessaire (pas de fermeture accidentelle). | ☐ |
| 3 | Confirmer | Pas de double soumission. | ☐ |

### 11.6 RatingModal

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir, sélectionner étoiles 1–5, commentaire optionnel, envoyer | Insert reviews + notification artisan « Nouvelle note reçue ». | ☐ |
| 2 | Artisan résolu | acceptedQuote ou resolvedArtisanForRating ou resolvedAcceptedArtisanId. | ☐ |
| 3 | Validation | Toasts erreur si note invalide ; fermeture et callback onSuccess. | ☐ |

### 11.7 QuoteRevisionModal

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Demande révision, commentaire, envoi | Notification artisan ; pas de double envoi. | ☐ |
| 2 | Erreur notification | Non bloquante pour l’action. | ☐ |

### 11.8 Modal détail facture (InvoicesPage)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Clic sur une facture | Ouverture modal détail, boutons télécharger / envoyer. | ☐ |
| 2 | Fermeture | Scroll body non bloqué de façon permanente. | ☐ |

### 11.9 Modal partage (ArtisanPublicProfilePage)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Partager ce profil | Liens corrects, copier, SMS si dispo, fermeture. | ☐ |

### 11.10 Galerie / lightbox (ArtisanPublicProfilePage)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Clic image | Vue agrandie, navigation et fermeture. | ☐ |

### 11.11 OfflineBanner

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | navigator.onLine = false | Bandeau « Vous êtes hors ligne ». | ☐ |
| 2 | Revenir en ligne | Bandeau masqué. | ☐ |

---

## 12. Litige et cas particuliers

### 12.1 Signaler un litige (ProjectDetailsPage)

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Cliquer « Signaler un litige » | Projet disputed (ou statut dédié), escrow frozen si applicable, notification autre partie (dispute_raised). | ☐ |
| 2 | Admin | Visible dans AdminDisputes. Message clair pour l’utilisateur. | ☐ |

### 12.2 Projet expiré / annulé

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir un projet expiré ou annulé | Affichage lecture seule, pas d’actions de modification (Accepter, Payer, etc.). | ☐ |

---

## 13. Admin (résumé)

### 13.1 Accès admin

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Ouvrir /admin en tant qu’admin | Sidebar, sous-routes (users, projects, escrows, verifications, disputes, closures, boutique, commandes, organisations, exports, audit, commissions, deletion-requests, executive, training). | ☐ |
| 2 | Ouvrir /admin en non-admin | Redirection (AdminRoute). | ☐ |
| 3 | Vérifier | Liste des migrations appliquées (MCP ou DB) pour RPC et Realtime. | ☐ |

### 13.2 Admin – Escrows

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Liste escrows, filtre statut | Libération (released), notifications artisan. | ☐ |

### 13.3 Admin – Clôtures

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Liste projets à clôturer | Versement artisan, notification payment_received. Workflow complet. | ☐ |

### 13.4 Admin – Vérifications

| # | Étape | Résultat attendu | OK / À corriger |
|---|--------|-------------------|------------------|
| 1 | Approuver / Rejeter | Notification artisan (verification_approved / verification_rejected). Insert notifications et réception côté artisan. | ☐ |

---

## 14. Points critiques (récap)

À valider en priorité pendant les tests :

| Priorité | Point | Vérification |
|----------|--------|--------------|
| 1 | **Devis accepté introuvable (clôture / notation)** | RPC `get_accepted_quote_artisan_for_project` déployée. ProjectCompletionPage : RPC + fallbacks. ProjectDetailsPage (artisan) : resolvedAcceptedArtisanId. Trigger BDD révision → quotes.status = 'accepted' (migration 20260308100000). |
| 2 | **Notifications et messages instantanés** | Realtime notifications (migration enable_realtime_notifications). Son + toast + vibration + badge onglet. Chat : subscription temps réel (useMessages). |
| 3 | **Overlays** | LoadingOverlay z-index et contain. ConfirmModal stopPropagation. Pas de page blanche (base `/`, pas de 404 assets /marketplace). |
| 4 | **Liens et redirections** | RevisionsPage « Voir le projet » (project_id ou projects?.id). EditProfilePage navigate(..., { replace: true }). Notification « note reçue » → /avis-recus. |
| 5 | **Factures** | InvoicesPage : bouton « Envoyer » désactivé avec « Envoyer (bientôt) ». Prestations : statuts et liens projet cohérents. |

---

## 15. Propreté du code (état après nettoyage)

- **Console / DEBUG** : Les `console.log('[DEBUG]'` et équivalents ont été retirés ou conditionnés à `import.meta.env.DEV` (ProjectDetailsPage, QuoteForm, notificationService, useProfile). En production, la console ne doit pas être polluée par ces messages.
- **InvoicesPage** : Le bouton « Envoyer » (email facture) est désactivé, libellé « Envoyer (bientôt) », avec tooltip « Envoi par email : bientôt disponible ». Plus de TODO visible en prod.
- **useNotifications** : Les `catch {}` vides dans `playNotificationSound()` sont commentés (fallback son non bloquant).
- **Recommandations optionnelles** : Typer les appels admin (log_escrow_action, notifications) pour éviter les `(supabase as any)` ; documenter les `console.error` sans showError (notificationService, etc.) si le comportement est voulu.

---

*Plan de tests finaux Mbourake. Cocher chaque case au fur et à mesure et noter les bugs dans « À corriger ».*
