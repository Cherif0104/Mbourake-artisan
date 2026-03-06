# TODO – Tests finaux et ajustements – Mbourake

Liste ultra-détaillée des phases, étapes et overlays pour les tests finaux. Pour chaque point : **Ce qui va** / **À corriger ou à vérifier**.

---

## 1. Accès public (non connecté)

- [ ] **1.1 Landing (/)**
  - **Ce qui va :** Affichage hero, catégories, recherche, boutons S’inscrire / Se connecter, footer (À propos, Aide, Artisans, Installer l’application si mobile).
  - **À vérifier :** Pas de page blanche au refresh (base `/`), PWA install prompt s’affiche après ~1 s sur mobile, lien « Installer l’application » visible au footer sur mobile uniquement.

- [ ] **1.2 À propos (/about)**
  - **Ce qui va :** Contenu, bouton retour, liens vers Aide / inscription.
  - **À vérifier :** Liens et navigation.

- [ ] **1.3 Aide (/aide)**
  - **Ce qui va :** Page d’aide, retour.
  - **À vérifier :** Contenu à jour.

- [ ] **1.4 Artisans (/artisans)**
  - **Ce qui va :** Liste/cartes artisans, filtres par catégorie, clic vers profil public.
  - **À vérifier :** Pas de 404 sur assets (base `/`), chargement correct.

- [ ] **1.5 Profil public artisan (/artisans/:id)**
  - **Ce qui va :** Infos artisan, avis, galerie, bouton « Demander un devis » (redirige create-project?artisan=id), partage, produits.
  - **À vérifier :** Modal partage (Partager ce profil), galerie (lightbox), lien vers marketplace produit.

- [ ] **1.6 Catégorie (/category/:slug)**
  - **Ce qui va :** Artisans de la catégorie, navigation.
  - **À vérifier :** Slug valide, liste cohérente.

- [ ] **1.7 Marketplace (/marketplace)**
  - **Ce qui va :** Liste produits, filtres, clic produit.
  - **À vérifier :** Pas de page blanche au refresh sur /marketplace (base `/`).

- [ ] **1.8 Fiche produit (/marketplace/:productId)**
  - **Ce qui va :** Détail produit, artisan, ajout panier / achat. Redirection login si non connecté.
  - **À vérifier :** Boutons « Acheter » / « Ajouter au panier », redirections.

- [ ] **1.9 Favoris (/favorites)**
  - **Ce qui va :** Accessible connecté ; si non connecté, redirection ou message.
  - **À vérifier :** Comportement exact (redirect onboard ou affichage vide).

- [ ] **1.10 Invitation (/invite/:token)**
  - **Ce qui va :** Acceptation token, redirection onboard avec paramètres.
  - **À vérifier :** Token invalide/expiré, message clair.

- [ ] **1.11 Compte suspendu (/compte-suspendu)**
  - **Ce qui va :** Message dédié, pas d’accès au reste.
  - **À vérifier :** Affichage et liens.

- [ ] **1.12 404 (route inconnue)**
  - **Ce qui va :** Page 404, boutons Retour accueil / Page précédente.
  - **À vérifier :** Aucune fuite vers page blanche.

---

## 2. Authentification et onboarding

- [ ] **2.1 Onboard (/onboard) – Connexion**
  - **Ce qui va :** Formulaire login (email/mot de passe), OAuth si configuré, lien « S’inscrire ».
  - **À vérifier :** Erreur identifiants, redirection après login (dashboard ou redirect param), pas de boucle.

- [ ] **2.2 Onboard – Inscription**
  - **Ce qui va :** Inscription client/artisan, champs requis, redirection après succès.
  - **À vérifier :** Validation email, rôle, redirection, message de succès.

- [ ] **2.3 Persistance de la dernière page (LastRoutePersistence)**
  - **Ce qui va :** Après login, retour sur la page où l’utilisateur était (ex. fiche produit) au lieu de toujours dashboard.
  - **À vérifier :** Comportement avec différentes routes avant login.

---

## 3. Parcours client – Projet (devis → paiement → clôture → notation)

- [ ] **3.1 Création de projet (/create-project)**
  - **Ce qui va :** Étapes formulaire (titre, catégorie, description, critères, ciblage artisan optionnel), envoi, création en base, notification aux artisans (new_project).
  - **À vérifier :** LoadingOverlay pendant création, redirection vers détail projet, erreurs (champs manquants, catégorie) affichées en toast. Si projet ciblé : un seul artisan notifié.

- [ ] **3.2 Détail projet – Client – Projet ouvert (/projects/:id)**
  - **Ce qui va :** Affichage projet, liste des devis reçus, boutons Accepter / Refuser / Demander révision par devis.
  - **À vérifier :** RLS : le client voit bien tous les devis du projet. Pas de « aucun devis accepté » tant qu’aucun n’est accepté.

- [ ] **3.3 Accepter un devis (ProjectDetailsPage)**
  - **Ce qui va :** Clic Accepter → ConfirmModal « Accepter ce devis ? » → confirmation → mise à jour quote status, projet (quote_accepted / payment_pending), notification artisan (quote_accepted), redirection possible vers payment.
  - **À vérifier :** Si CREDITS_ENABLED : blocage si artisan sans crédits + message. Sinon : acceptation sans blocage crédits. Ne pas pouvoir accepter si un autre devis est déjà accepté.

- [ ] **3.4 Refuser un devis**
  - **Ce qui va :** Refus + raison optionnelle, notification artisan (quote_rejected), mise à jour statut devis.
  - **À vérifier :** Toast succès, liste à jour, pas d’erreur RLS.

- [ ] **3.5 Demander une révision (QuoteRevisionModal)**
  - **Ce qui va :** Ouverture modal, commentaire client, envoi → création quote_revisions, notification artisan (quote_revision_requested).
  - **À vérifier :** Modal se ferme, pas de double envoi, lien « Voir le projet » depuis RevisionsPage sécurisé (revision.project_id ou fallback).

- [ ] **3.6 Redirection automatique par étape (ProjectDetailsPage)**
  - **Ce qui va :** Selon statut projet, redirection vers /payment, /thank-you, /work, /completion.
  - **À vérifier :** Client après acceptation → /payment. Client après paiement → /thank-you. Pas de boucle ni mauvaise étape.

- [ ] **3.7 Paiement (/projects/:id/payment)**
  - **Ce qui va :** Affichage montant (devis accepté ou escrow), formulaire bypass (méthode, téléphone), appel processPayment + confirmDeposit (useEscrow), création/mise à jour escrow, projet payment_received, notification artisan (paiement sécurisé).
  - **À vérifier :** Montant correct (pas 0 si devis chargé après). Message « Le client a sécurisé votre argent » côté artisan. Erreur si devis accepté introuvable (RPC ou lecture directe selon cas).

- [ ] **3.8 Thank-you (/projects/:id/thank-you)**
  - **Ce qui va :** Confirmation paiement, liens vers suivi / travaux.
  - **À vérifier :** Affichage et liens.

- [ ] **3.9 Suivi (/projects/:id/suivi) – Client**
  - **Ce qui va :** Vue suivi projet, lien vers travaux ou attente artisan.
  - **À vérifier :** Contenu et navigation.

- [ ] **3.10 Demande de clôture par le client (ProjectDetailsPage)**
  - **Ce qui va :** Bouton « Travaux terminés – Demander la clôture » (client) → handleClientRequestClosure → projet completion_requested, notification artisan.
  - **À vérifier :** Bouton visible quand (payment_received ou in_progress ou escrow held) et pas déjà completion_requested/completed. ConfirmModal si présent.

- [ ] **3.11 Page clôture + notation (/projects/:id/completion) – Client**
  - **Ce qui va :** Chargement projet, escrow, devis accepté (RPC en priorité, puis quotes, puis quote_revisions). Formulaire notation (étoiles + commentaire), bouton « Clôturer et noter » → insert reviews, update projet completed, notification artisan (payment_received + « Nouvelle note reçue »).
  - **À corriger / à vérifier :** **Priorité :** Ne jamais afficher « Devis accepté introuvable » si le client a bien accepté un devis (RPC + fallbacks déjà en place). Vérifier que la RPC est déployée sur l’instance utilisée par tous les testeurs. Si erreur, vérifier auth.uid() et projet client_id. Vérifier que le son de notification est joué (et toast/vibration si configurés).

- [ ] **3.12 Modal notation (RatingModal) – Ouverture auto**
  - **Ce qui va :** Sur ProjectDetailsPage, quand projet completed et client et pas encore de review, ouverture automatique du modal de notation (une fois).
  - **À vérifier :** Artisan résolu via acceptedQuote ou resolvedArtisanForRating ou resolvedAcceptedArtisanId. Pas d’ouverture en boucle (ratingAutoOpenedRef).

- [ ] **3.13 Bandeau « Noter l’artisan » (ProjectDetailsPage) – Client**
  - **Ce qui va :** Affiché si projet completed et (acceptedQuote ou escrow ou resolvedArtisanForRating). Clic → ouvre RatingModal.
  - **À vérifier :** Visible même quand devis accepté non visible (RLS), grâce à resolvedArtisanForRating.

---

## 4. Parcours artisan – Même projet

- [ ] **4.1 Dashboard – Artisan**
  - **Ce qui va :** Bloc « Mes devis », projets de la catégorie, liens vers révisions, finances, dépenses, boutique, commandes boutique, **Avis reçus**.
  - **À vérifier :** Avis reçus pointe vers /avis-recus. Pas de lien crédits si CREDITS_ENABLED = false.

- [ ] **4.2 Réception nouvelle demande (new_project)**
  - **Ce qui va :** Notification en temps réel (cloche + toast + son + badge onglet), liste notifications à jour sans refresh.
  - **À vérifier :** Realtime activé sur table notifications (migration apply). Pas besoin de F5.

- [ ] **4.3 Soumission devis (ProjectDetailsPage – artisan)**
  - **Ce qui va :** Formulaire devis (QuoteForm), envoi → insert quote, notification client (new_quote).
  - **À vérifier :** Montant, délai, message. Notification client reçue en temps réel.

- [ ] **4.4 Réception « Devis accepté » (quote_accepted)**
  - **Ce qui va :** Notification + lien vers projet. Côté projet : bandeau / redirection vers paiement (client) ou « En attente paiement client » (artisan).
  - **À vérifier :** Artisan voit bien le statut et le montant du devis accepté.

- [ ] **4.5 Révision demandée (quote_revision_requested)**
  - **Ce qui va :** Notification, lien vers révision. RévisionsPage et RevisionResponsePage ou modal réponse.
  - **À vérifier :** Lien « Voir le projet » dans RévisionsPage (revision.project_id ou projects?.id), pas de 404.

- [ ] **4.6 Réponse à la révision (RevisionResponsePage ou QuoteRevisionResponseModal)**
  - **Ce qui va :** Accepter / Refuser / Modifier, mise à jour quote_revisions, notification client (quote_revision_responded). Trigger BDD : projet quote_accepted, **et** quotes.status = 'accepted' (migration 20260308100000).
  - **À vérifier :** Après « Accepter » révision, en base quotes.status = 'accepted' pour ce quote. Client et artisan voient bien le devis accepté partout.

- [ ] **4.7 En attente paiement client (ProjectAwaitingPaymentPage ou bandeau)**
  - **Ce qui va :** Message « Le client doit procéder au paiement ».
  - **À vérifier :** Affichage et lien vers détail projet.

- [ ] **4.8 Paiement reçu / sécurisé (payment_received)**
  - **Ce qui va :** Notification « Le client a sécurisé votre argent » + détail reliquat. Projet payment_received, artisan peut accéder aux travaux.
  - **À vérifier :** Notification temps réel, message clair (projet peut continuer).

- [ ] **4.9 Travaux (/projects/:id/work) – Artisan**
  - **Ce qui va :** Page travaux, bouton « Marquer les travaux comme terminés » → ConfirmModal → projet completion_requested ou notification client (project_completed).
  - **À vérifier :** ConfirmModal ne se ferme pas au clic overlay si stopPropagation. Notification client reçue.

- [ ] **4.10 Demander la clôture (ProjectDetailsPage – Artisan)**
  - **Ce qui va :** Bouton « Travaux terminés – Demander la clôture » visible si (acceptedQuote OU resolvedAcceptedArtisanId) et phase suivi. handleRequestCompletion → projet completion_requested, notification client.
  - **À corriger / à vérifier :** **Priorité :** Plus d’erreur « Impossible de demander la clôture : aucun devis accepté » quand l’acceptation a été faite via révision (resolvedAcceptedArtisanId rempli par RPC). Vérifier que l’artisan voit bien le bandeau et peut cliquer.

- [ ] **4.11 En attente client (completion_requested) – Artisan**
  - **Ce qui va :** Bandeau « En attente du client – Il doit confirmer la fin des travaux ».
  - **À vérifier :** Affichage et pas de bouton dupliqué.

- [ ] **4.12 Clôture effectuée + note reçue**
  - **Ce qui va :** Notification « Nouvelle note reçue » (system, kind rating_received). Clic notification → /avis-recus.
  - **À vérifier :** Temps réel, routage vers /avis-recus, page Avis reçus avec KPIs et historique.

- [ ] **4.13 Abandon de devis (artisan clôture sa participation)**
  - **Ce qui va :** Bouton abandon → ConfirmModal → quote status abandoned, notification client (client_artisan_abandoned).
  - **À vérifier :** Uniquement si devis pas encore accepté ou cas autorisés. Message client clair.

---

## 5. Chat et messages

- [ ] **5.1 Conversations (/conversations)**
  - **Ce qui va :** Liste conversations (projets avec messages ou devis accepté), compteur non lus.
  - **À vérifier :** Résolution participant (acceptedQuote ou RPC) pour afficher le bon interlocuteur.

- [ ] **5.2 Chat projet (/chat/:projectId)**
  - **Ce qui va :** Messages texte (et audio si implémenté), envoi, réception temps réel (useMessages channel), notification new_message à l’autre partie, marquage lu à l’ouverture.
  - **À vérifier :** Realtime messages (subscription), son à la réception, pas de doublon. Notification « Nouveau message » reçue sans F5.

---

## 6. Notifications et temps réel

- [ ] **6.1 Cloche (NotificationBell)**
  - **Ce qui va :** Dropdown liste notifications, marquer lu, supprimer, « Voir tout », redirections par type (dont rating_received → /avis-recus).
  - **À vérifier :** Filtre user_id côté Realtime. Badge nombre non lus. Clic ouvre la bonne page (projet, chat, avis reçus, dashboard).

- [ ] **6.2 Page Notifications (/notifications)**
  - **Ce qui va :** Liste complète, marquer tout comme lu, supprimer, même logique de ciblage (getNotificationTarget) que la cloche.
  - **À vérifier :** Cohérence avec la cloche et pas de liste vide alors que la cloche a des entrées (même user_id).

- [ ] **6.3 Realtime – Nouvelle notification**
  - **Ce qui va :** INSERT sur notifications → mise à jour liste + compteur, son, toast (NotificationRealtimeToaster), vibration mobile, titre onglet « (n) Mbourake ».
  - **À vérifier :** Migration enable_realtime_notifications appliquée. Pas besoin de F5 pour voir une nouvelle notification.

- [ ] **6.4 Realtime – UPDATE (marquer lu)**
  - **Ce qui va :** Marquer lu dans un onglet ou sur un autre appareil → compteur et liste mis à jour dans les autres onglets (subscription UPDATE).
  - **À vérifier :** Sync multi-onglets.

---

## 7. Factures et prestations (artisan)

- [ ] **7.1 Page Factures (/invoices) – Artisan**
  - **Ce qui va :** Section « Prestations réalisées » (liste escrows par projet accepté), statuts : Client a payé – En attente versement, Versé, En attente résolution, Remboursé, En attente paiement client. Puis bloc Factures (brouillon, envoyée, payée, etc.).
  - **À vérifier :** Icône Unlock (pas UnlockCircle). Liens « Voir le projet » corrects. Pas de crash si table invoices absente (message « Factures en préparation »).

- [ ] **7.2 Page Factures – Client**
  - **Ce qui va :** Liste factures client, filtres statut, téléchargement PDF, détail.
  - **À vérifier :** Envoi email facture (TODO si non implémenté).

---

## 8. Avis reçus (artisan)

- [ ] **8.1 Page Avis reçus (/avis-recus)**
  - **Ce qui va :** Réservée artisans. KPIs (note moyenne, nombre d’avis, avec commentaire), répartition 1–5 étoiles, liste des avis (projet, client, note, commentaire, date), lien « Voir le projet ».
  - **À vérifier :** Données reviews + profiles (client) correctes. Alias Supabase client/profile pour le nom du client. Accès refusé propre pour non-artisan.

---

## 9. Marketplace (achats)

- [ ] **9.1 Panier (/panier)**
  - **Ce qui va :** Liste articles, quantités, passage commande, liens checkout / marketplace.
  - **À vérifier :** LoadingOverlay pendant chargement, pas de page blanche.

- [ ] **9.2 Checkout (/marketplace/:productId/checkout)**
  - **Ce qui va :** Récap produit, création commande, redirection my-orders ou erreur.
  - **À vérifier :** Gestion erreur (toast), redirection avec orderId si besoin.

- [ ] **9.3 Mes commandes (/my-orders) – Client**
  - **Ce qui va :** Liste commandes, statuts, lien détail ou marketplace.
  - **À vérifier :** Filtres et affichage.

- [ ] **9.4 Commandes boutique (/my-shop-orders) – Artisan**
  - **Ce qui va :** Commandes reçues pour les produits de l’artisan.
  - **À vérifier :** Statuts et actions (ex. marquer expédié si applicable).

---

## 10. Profil, paramètres, autres pages compte

- [ ] **10.1 Profil (/profile)**
  - **Ce qui va :** Infos profil, avis reçus (artisan), onglets selon rôle.
  - **À vérifier :** Données et liens.

- [ ] **10.2 Édition profil (/edit-profile)**
  - **Ce qui va :** Formulaire complet, sauvegarde, upload photo/vidéo, validation métier.
  - **À vérifier :** Après sauvegarde : redirection avec navigate(..., { replace: true }) (pas window.location) pour éviter perte d’état. Toasts erreur (taille fichier, nombre max).

- [ ] **10.3 Paramètres (/settings)**
  - **Ce qui va :** Préférences, demande suppression compte (modale étapes), statut demande (requested, confirmed).
  - **À vérifier :** ConfirmModal suppression, pas de suppression sans confirmation.

- [ ] **10.4 Vérification (/verification) – Artisan**
  - **Ce qui va :** Upload documents, envoi, attente validation. Notification verification_approved / verification_rejected.
  - **À vérifier :** Message « Vous recevrez une notification » et réception réelle de la notification.

- [ ] **10.5 Dépenses (/expenses)**
  - **Ce qui va :** Liste dépenses, ajout (modal), édition/suppression.
  - **À vérifier :** Modal « Add Expense », LoadingOverlay, filtres.

- [ ] **10.6 Crédits (/credits)** (si CREDITS_ENABLED = true)
  - **Ce qui va :** Solde, achat crédits.
  - **À vérifier :** Si false : route redirige vers dashboard, pas de lien visible.

---

## 11. Overlays et modales (détaillé)

- [ ] **11.1 LoadingOverlay (global)**
  - **Ce qui va :** z-index 9999, fixed full screen, animation, texte « Chargement… ». Utilisé sur Dashboard, RevisionsPage, ProjectDetailsPage, InvoicesPage, etc.
  - **À vérifier :** S’affiche pendant les fetches (fetchDetails, fetchInvoices, etc.). Se retire bien à la fin. Pas de conflit avec modales (contain: layout). Pas de tremblement ou clic à travers.

- [ ] **11.2 ToastContainer (toasts)**
  - **Ce qui va :** Affichage toasts succès/erreur/warning/info, auto-dismiss, fermeture manuelle.
  - **À vérifier :** z-index au-dessus du contenu, pas masqué par InstallPrompt ou NotificationBell. Pas de cumul excessif.

- [ ] **11.3 InstallPrompt (PWA)**
  - **Ce qui va :** Bandeau « Téléchargez Mbourake sur votre téléphone », bouton Télécharger (Android) ou instructions 2 étapes (iOS), fermer, « Ne plus proposer ».
  - **À vérifier :** Affiché après ~1 s sur mobile. Ne pas s’afficher en standalone. Pas de chevauchement avec toasts (z-index 100).

- [ ] **11.4 NotificationRealtimeToaster**
  - **Ce qui va :** Écoute événement mbourake-new-notification, affiche toast avec titre notification + vibration.
  - **À vérifier :** Toast bien visible, vibration sur mobile (navigator.vibrate).

- [ ] **11.5 ConfirmModal (ProjectDetailsPage, ProjectWorkPage, etc.)**
  - **Ce qui va :** Titre, message, boutons Confirmer / Annuler. stopPropagation sur le modal pour ne pas fermer au clic overlay si voulu.
  - **À vérifier :** Fermeture au clic Annuler ou overlay (selon implé). Pas de double soumission.

- [ ] **11.6 RatingModal**
  - **Ce qui va :** Étoiles 1–5, commentaire optionnel, envoi → insert reviews + notification artisan « Nouvelle note reçue ».
  - **À vérifier :** Artisan résolu (acceptedQuote ou resolvedArtisanForRating ou resolvedAcceptedArtisanId). Validation note et commentaire (toasts erreur). Fermeture et callback onSuccess.

- [ ] **11.7 QuoteRevisionModal**
  - **Ce qui va :** Demande révision, commentaire, envoi, notification artisan.
  - **À vérifier :** Pas de double envoi, erreur notification non bloquante.

- [ ] **11.8 Modal détail facture (InvoicesPage)**
  - **Ce qui va :** Ouverture au clic sur une facture, détail, boutons télécharger / envoyer.
  - **À vérifier :** Fermeture, pas de scroll body bloqué de façon permanente.

- [ ] **11.9 Modal partage (ArtisanPublicProfilePage)**
  - **Ce qui va :** Partager lien, copier, SMS, etc.
  - **À vérifier :** Liens corrects et fermeture.

- [ ] **11.10 Galerie / lightbox (ArtisanPublicProfilePage)**
  - **Ce qui va :** Clic image ouvre vue agrandie.
  - **À vérifier :** Navigation et fermeture.

- [ ] **11.11 OfflineBanner**
  - **Ce qui va :** Bandeau « Vous êtes hors ligne » quand navigator.onLine false.
  - **À vérifier :** Affichage/masquage selon connexion.

---

## 12. Litige et cas particuliers

- [ ] **12.1 Signaler un litige (ProjectDetailsPage)**
  - **Ce qui va :** Bouton signaler litige → projet disputed (ou statut dédié), escrow frozen si applicable, notification autre partie (dispute_raised).
  - **À vérifier :** Message clair, admin peut voir dans AdminDisputes.

- [ ] **12.2 Projet expiré / annulé**
  - **Ce qui va :** Affichage lecture seule, pas d’actions de modification.
  - **À vérifier :** Pas de boutons Accepter / Payer sur projet expiré ou annulé.

---

## 13. Admin (résumé)

- [ ] **13.1 Accès admin**
  - **Ce qui va :** Route /admin protégée AdminRoute, sidebar, sous-routes (users, projects, escrows, verifications, disputes, closures, boutique, commandes, organisations, exports, audit, commissions, deletion-requests, executive, training).
  - **À vérifier :** Redirection si non admin. Liste des migrations appliquées (MCP ou DB) pour vérifier RPC et Realtime.

- [ ] **13.2 Admin – Escrows**
  - **Ce qui va :** Liste escrows, filtre statut, libération (released), notifications artisan.
  - **À vérifier :** Actions et notifications associées.

- [ ] **13.3 Admin – Clôtures**
  - **Ce qui va :** Liste projets à clôturer, versement artisan, notification payment_received.
  - **À vérifier :** Workflow complet.

- [ ] **13.4 Admin – Vérifications**
  - **Ce qui va :** Approuver / Rejeter, notification artisan (verification_approved / verification_rejected).
  - **À vérifier :** Insert notifications et réception côté artisan.

---

## 14. Récap des points critiques à corriger / vérifier en priorité

1. **Devis accepté introuvable (clôture / notation)**  
   - RPC `get_accepted_quote_artisan_for_project` déployée sur l’instance de tous les testeurs.  
   - ProjectCompletionPage : RPC en priorité + fallback quote_revisions.  
   - ProjectDetailsPage (artisan) : resolvedAcceptedArtisanId pour « Demander la clôture » et bandeaux.  
   - Trigger BDD : révision acceptée → quotes.status = 'accepted' (migration 20260308100000).

2. **Notifications et messages instantanés**  
   - Realtime notifications (migration enable_realtime_notifications).  
   - Son + toast + vibration + badge onglet.  
   - Messages chat : subscription temps réel (useMessages).

3. **Overlays**  
   - LoadingOverlay : z-index et contain pour éviter conflits.  
   - ConfirmModal : stopPropagation si nécessaire.  
   - Pas de page blanche (vite base `/`, pas de 404 assets sur /marketplace).

4. **Liens et redirections**  
   - RevisionsPage « Voir le projet » : project_id ou projects?.id.  
   - EditProfilePage : navigate(..., { replace: true }) après sauvegarde.  
   - Notification « note reçue » → /avis-recus.

5. **Factures**  
   - InvoicesPage : icône Unlock (corrigé).  
   - Prestations réalisées : statuts et liens projet cohérents.  
   - TODO « Envoyer email facture » si à livrer.

---

## 15. Diagnostic – Propreté du code

Analyse transversale du code par rapport aux étapes du TODO : ce qui est propre, ce qui ne l’est pas, et ce qu’il faut corriger ou surveiller.

### 15.1 Ce qui est propre

- **Flux métier** : Parcours client (création projet → devis → paiement → clôture → notation) et artisan (devis → révision → travaux → demande clôture) sont cohérents. RPC `get_accepted_quote_artisan_for_project` et fallbacks (quotes + quote_revisions) couvrent le cas « devis accepté introuvable ». Trigger BDD met à jour `quotes.status = 'accepted'` à l’acceptation d’une révision.
- **Gestion d’erreurs métier** : Les erreurs critiques (acceptation devis, paiement, clôture, envoi message) sont loguées (`console.error`) et souvent remontées à l’utilisateur via `showError` / toast. Pas de `catch () {}` vide sur des chemins critiques (sauf fallback son dans useNotifications).
- **Sécurité** : Vérifications `client_id` / `auth.uid()` sur les pages sensibles (payment, completion). RPC en SECURITY DEFINER pour contourner RLS de façon contrôlée. PrivateRoute / AdminRoute sur les routes protégées.
- **Overlays** : LoadingOverlay avec z-index 9999 et `contain: layout`. ConfirmModal avec stopPropagation. ToastContainer et InstallPrompt ont des z-index dédiés (voir config zIndex si centralisée).
- **Types** : Peu de `@ts-ignore`. Les `as any` restants sont surtout sur réponses Supabase (jointures, alias) ou compat navigateur (AudioContext, MSStream) – acceptable si documenté.
- **TODO explicites** : Un seul TODO métier restant : « Envoyer l’email avec la facture » (InvoicesPage, `handleSendInvoice`). Le reste des étapes du document est implémenté.

### 15.2 Ce qui n’est pas propre (à corriger ou réduire)

- [ ] **Console.log / console.warn en production (DEBUG)**  
  - **ProjectDetailsPage** : Nombreux `console.log('[DEBUG] ...')` (attente user, fetch quotes, fallback, annulation projet, refresh). À **retirer ou conditionner** à `import.meta.env.DEV` pour ne pas polluer la console en prod.  
  - **QuoteForm** : Plusieurs `console.log('[DEBUG QuoteForm] ...')` et `console.warn` sur 409/RLS. Idem : conditionner au dev ou supprimer.  
  - **notificationService** : Un `console.log('Chat créé...')` après création message bienvenue. Remplacer par un log conditionnel ou le retirer.  
  - **useProfile** : `console.log` sur crédits de bienvenue. À conditionner au dev.  
  - **App.tsx** : `console.warn('404 - Route non trouvée')`. Peut rester en prod pour le debug 404, ou être conditionné.

- [ ] **TODO non implémenté**  
  - **InvoicesPage** : `handleSendInvoice` – « Envoyer l’email avec la facture ». Soit implémenter (envoi email via backend/Edge Function), soit retirer le bouton ou le désactiver avec un message clair (« Bientôt disponible ») pour ne pas laisser un TODO visible en prod.

- [ ] **Catch vides**  
  - **useNotifications** : `playNotificationSound()` contient des `catch {}` vides pour le fallback Web Audio. Acceptable pour ne pas casser l’UI si le son échoue, mais un commentaire du type `// ignore: son non critique` évite qu’on croie à un oubli.

- [ ] **Cohérence des (supabase as any)**  
  - **AdminEscrows** : `(supabase as any).from('notifications')` et `(supabase as any).rpc('log_escrow_action')`. Si les types Supabase ne déclarent pas ces appels, ajouter les types ou une extension d’interface plutôt que multiplier les `as any`.

- [ ] **Erreurs loguées mais pas toujours montrées à l’utilisateur**  
  - Plusieurs `console.error` sans `showError` (ex. notificationService, QuoteRevisionModal en cas d’échec de notification). Comportement voulu (ne pas bloquer l’action) mais à documenter ; éventuellement un toast « Notification non envoyée » en mode dev pour faciliter le debug.

### 15.3 Recommandations par zone (alignées au TODO)

| Zone (voir sections du TODO) | Propreté | Action recommandée |
|------------------------------|----------|--------------------|
| **Parcours client 3.x** | Correcte | Retirer ou conditionner les `[DEBUG]` dans ProjectDetailsPage et QuoteForm. |
| **Parcours artisan 4.x** | Correcte | Idem ; vérifier que les `console.error` en cas d’échec RPC/escrow sont bien intentionnels (bypass mode). |
| **Notifications 6.x** | Correcte | Laisser les `console.error` dans useNotifications uniquement pour les vrais échecs ; les `catch {}` dans playNotificationSound sont OK avec un court commentaire. |
| **Factures 7.x** | Partielle | Implémenter ou désactiver « Envoyer email » ; pas d’autre souci de propreté (Unlock déjà corrigé). |
| **Overlays 11.x** | Correcte | Vérifier en test que LoadingOverlay ne reste pas bloqué (toujours un `setLoading(false)` dans un `finally` ou équivalent). |
| **Admin 13.x** | Correcte | Typer les appels `log_escrow_action` et `notifications` si possible pour éviter `as any`. |

### 15.4 Synthèse

- **Fonctionnel** : Les étapes du TODO sont couvertes par le code ; les points critiques (devis accepté, notifications temps réel, overlays, redirections) sont en place. La base est **propre pour les tests finaux** une fois les migrations appliquées (RPC, Realtime, trigger révision).
- **Propreté technique** : À **nettoyer avant ou juste après mise en prod** :  
  1) Supprimer ou conditionner tous les `console.log('[DEBUG]'` (ProjectDetailsPage, QuoteForm, éventuellement useProfile / notificationService).  
  2) Traiter le TODO facture (envoyer email ou désactiver proprement).  
  3) Optionnel : typer les appels admin (escrows/notifications) et commenter les `catch {}` non critiques.

---

*Document généré pour les tests finaux Mbourake. Cocher au fur et à mesure et noter dans « À corriger » les bugs restants.*
