# 🧪 CHECKLIST FONCTIONNELLE - TESTS DES FONCTIONNALITÉS IMPLÉMENTÉES

**Date :** 2025-01-XX  
**Objectif :** Vérifier que toutes les fonctionnalités implémentées fonctionnent correctement

---

## 📋 GUIDE D'UTILISATION

Pour chaque test :
- ✅ **PASSÉ** : Fonctionnalité fonctionne correctement
- ⚠️ **PARTIEL** : Fonctionnalité fonctionne mais avec des problèmes mineurs
- ❌ **ÉCHEC** : Fonctionnalité ne fonctionne pas ou bug critique
- ⏸️ **NON TESTÉ** : Pas encore testé

---

## 1. 🔐 AUTHENTIFICATION & ONBOARDING

### 1.1 Connexion Email/Mot de passe
- [ ] ⏸️ Inscription avec email valide
- [ ] ⏸️ Inscription avec email invalide (message d'erreur)
- [ ] ⏸️ Inscription avec mot de passe faible (< 6 caractères)
- [ ] ⏸️ Connexion avec identifiants corrects
- [ ] ⏸️ Connexion avec email incorrect (message d'erreur)
- [ ] ⏸️ Connexion avec mot de passe incorrect (message d'erreur)
- [ ] ⏸️ Persistance de session après refresh
- [ ] ⏸️ Déconnexion fonctionne

### 1.2 Connexion Google OAuth
- [ ] ⏸️ Bouton Google OAuth présent
- [ ] ⏸️ Connexion Google redirige vers Google
- [ ] ⏸️ Retour depuis Google crée une session
- [ ] ⏸️ Profil Google créé correctement

### 1.3 Onboarding
- [ ] ⏸️ Page langue s'affiche pour nouveaux utilisateurs
- [ ] ⏸️ Sélection langue enregistrée
- [ ] ⏸️ Page chambres de métier s'affiche (artisans)
- [ ] ⏸️ Sélection chambre enregistrée
- [ ] ⏸️ Pas de boucle onboarding si profil complet
- [ ] ⏸️ Redirection automatique si déjà connecté

### 1.4 Setup Profil
- [ ] ⏸️ Formulaire multi-étapes fonctionne
- [ ] ⏸️ Navigation entre étapes (suivant/précédent)
- [ ] ⏸️ Validation champs requis
- [ ] ⏸️ Upload avatar fonctionne
- [ ] ⏸️ Sélection rôle (client/artisan)
- [ ] ⏸️ Sélection catégorie (artisan)
- [ ] ⏸️ Géolocalisation automatique fonctionne
- [ ] ⏸️ Affiliation chambre de métier (optionnel)
- [ ] ⏸️ Soumission profil créé dans la DB
- [ ] ⏸️ Redirection vers dashboard après setup

---

## 2. 👤 GESTION DE PROFILS

### 2.1 Affichage Profil
- [ ] ⏸️ Dashboard affiche profil utilisateur
- [ ] ⏸️ Avatar s'affiche correctement
- [ ] ⏸️ Informations profil affichées (nom, email, rôle)
- [ ] ⏸️ Statut vérification visible (artisan)

### 2.2 Édition Profil
- [ ] ⏸️ Page édition accessible
- [ ] ⏸️ Tous les champs éditables
- [ ] ⏸️ Modification avatar fonctionne
- [ ] ⏸️ Modification portfolio (photos/vidéos) fonctionne
- [ ] ⏸️ Sauvegarde modifications fonctionne
- [ ] ⏸️ Message de succès après sauvegarde

---

## 3. 🛡️ VÉRIFICATION ARTISANS

### 3.1 Soumission Documents
- [ ] ⏸️ Page vérification accessible (artisan)
- [ ] ⏸️ Upload CNI fonctionne
- [ ] ⏸️ Upload diplômes fonctionne
- [ ] ⏸️ Upload certifications fonctionne
- [ ] ⏸️ Soumission documents créé dans la DB
- [ ] ⏸️ Statut "pending" après soumission

### 3.2 Gestion Admin
- [ ] ⏸️ Page AdminVerifications accessible (admin)
- [ ] ⏸️ Liste demandes vérification s'affiche
- [ ] ⏸️ Validation artisan fonctionne
- [ ] ⏸️ Rejet avec raison fonctionne
- [ ] ⏸️ Notification artisan après validation
- [ ] ⏸️ Badge vérifié visible après validation

---

## 4. 📋 GESTION DE PROJETS

### 4.1 Création Projet
- [ ] ⏸️ Page création projet accessible (client)
- [ ] ⏸️ Formulaire multi-étapes fonctionne
- [ ] ⏸️ Titre projet requis et validé
- [ ] ⏸️ Description textuelle fonctionne
- [ ] ⏸️ Enregistrement vocal fonctionne (AudioRecorder)
- [ ] ⏸️ Upload photos multiples fonctionne
- [ ] ⏸️ Upload vidéo fonctionne
- [ ] ⏸️ Sélection catégorie fonctionne
- [ ] ⏸️ Sélection type projet (ouvert/ciblé)
- [ ] ⏸️ Critères sélection (distance, note) fonctionnent
- [ ] ⏸️ Dates préférées fonctionnent
- [ ] ⏸️ Plage horaire fonctionne
- [ ] ⏸️ Détails propriété (type, étage, accès) fonctionnent
- [ ] ⏸️ Flag urgence fonctionne
- [ ] ⏸️ Soumission projet créé dans la DB
- [ ] ⏸️ Numéro projet généré automatiquement (MBK-YYYY-NNNNNNNN)
- [ ] ⏸️ Expiration projet (6 jours) définie
- [ ] ⏸️ Notification artisans de la catégorie

### 4.2 Affichage Projet
- [ ] ⏸️ Page détails projet accessible
- [ ] ⏸️ Tous les détails affichés (titre, description, photos, vidéo)
- [ ] ⏸️ Dates préférées affichées
- [ ] ⏸️ Plage horaire affichée
- [ ] ⏸️ Détails propriété affichés
- [ ] ⏸️ Timeline visuelle s'affiche
- [ ] ⏸️ Statut projet affiché correctement
- [ ] ⏸️ Bouton "Annuler projet" visible (client, si conditions OK)

### 4.3 Filtrage Catégories
- [ ] ⏸️ Artisan voit uniquement projets de sa catégorie
- [ ] ⏸️ Client voit tous les projets
- [ ] ⏸️ RLS filtre correctement en DB

### 4.4 Expiration Projets
- [ ] ⏸️ Projets expirés marqués automatiquement après 6 jours
- [ ] ⏸️ Projets expirés accessibles en lecture seule
- [ ] ⏸️ Notification artisan si projet expire

### 4.5 Annulation Projet
- [ ] ⏸️ Bouton annuler visible (client, projet ouvert/quote_received)
- [ ] ⏸️ Annulation impossible si devis accepté
- [ ] ⏸️ Annulation impossible si paiement effectué
- [ ] ⏸️ Confirmation avant annulation
- [ ] ⏸️ Projet marqué "cancelled" après annulation
- [ ] ⏸️ Devis en attente rejetés automatiquement
- [ ] ⏸️ Notification artisans après annulation
- [ ] ⏸️ Historique projet accessible après annulation

---

## 5. 💰 SYSTÈME DE DEVIS

### 5.1 Soumission Devis
- [ ] ⏸️ Formulaire devis accessible (artisan, projet ouvert)
- [ ] ⏸️ Coûts main d'œuvre fonctionnent
- [ ] ⏸️ Coûts matériaux fonctionnent
- [ ] ⏸️ Majoration urgence (%) fonctionne
- [ ] ⏸️ Calcul total automatique correct
- [ ] ⏸️ Message textuel fonctionne
- [ ] ⏸️ Message vocal fonctionne
- [ ] ⏸️ Dates proposées fonctionnent
- [ ] ⏸️ Durée estimée fonctionne
- [ ] ⏸️ Upload facture proforma fonctionne
- [ ] ⏸️ Soumission devis créé dans la DB
- [ ] ⏸️ Numéro devis généré (DEV-YYYY-NNNNNNNN)
- [ ] ⏸️ Statut "pending" après soumission
- [ ] ⏸️ Notification client
- [ ] ⏸️ Chat automatique créé avec message d'accueil

### 5.2 Acceptation Devis
- [ ] ⏸️ Bouton "Accepter" visible (client, devis pending/viewed)
- [ ] ⏸️ Acceptation impossible si devis déjà accepté pour ce projet
- [ ] ⏸️ Acceptation impossible si utilisateur non autorisé
- [ ] ⏸️ Devis marqué "accepted" après acceptation
- [ ] ⏸️ Autres devis rejetés automatiquement
- [ ] ⏸️ Projet marqué "quote_accepted"
- [ ] ⏸️ Escrow créé automatiquement
- [ ] ⏸️ Notification artisan
- [ ] ⏸️ Redirection vers page paiement

### 5.3 Refus Devis
- [ ] ⏸️ Bouton "Refuser" visible (client, devis pending/viewed)
- [ ] ⏸️ Devis marqué "rejected" après refus
- [ ] ⏸️ Notification artisan
- [ ] ⏸️ Projet reste "open" si autres devis en attente

### 5.4 Demande Révision
- [ ] ⏸️ Bouton "Révision" visible (client, devis pending/viewed)
- [ ] ⏸️ Modal révision s'ouvre
- [ ] ⏸️ Message révision enregistré
- [ ] ⏸️ Devis marqué "revision_requested"
- [ ] ⏸️ Notification artisan
- [ ] ⏸️ Artisan peut soumettre nouveau devis (révisé)

### 5.5 Export PDF
- [ ] ⏸️ Bouton "Télécharger PDF" fonctionne
- [ ] ⏸️ PDF généré avec toutes les informations
- [ ] ⏸️ PDF téléchargeable

---

## 6. 💳 SYSTÈME ESCROW & PAIEMENTS

### 6.1 Création Escrow
- [ ] ⏸️ Escrow créé automatiquement à l'acceptation devis
- [ ] ⏸️ Montant total correct (montant devis)
- [ ] ⏸️ Commission plateforme calculée (10%)
- [ ] ⏸️ TVA sur commission calculée (18%)
- [ ] ⏸️ Paiement artisan calculé (total - commission - TVA)
- [ ] ⏸️ Avance calculée (50% si artisan vérifié)

### 6.2 Paiement
- [ ] ⏸️ Modal paiement s'ouvre
- [ ] ⏸️ Montant affiché correctement
- [ ] ⏸️ Méthodes paiement disponibles (Wave, Orange, Carte, Virement)
- [ ] ⏸️ Simulation paiement fonctionne (mode bypass)
- [ ] ⏸️ Escrow marqué "held" après paiement
- [ ] ⏸️ Notification artisan
- [ ] ⏸️ Projet marqué "in_progress"

### 6.3 Versement Avance
- [ ] ⏸️ Avance disponible pour artisans vérifiés
- [ ] ⏸️ Bouton "Demander avance" visible
- [ ] ⏸️ Versement avance fonctionne
- [ ] ⏸️ Escrow marqué "advance_paid"
- [ ] ⏸️ Notification artisan

### 6.4 Libération Paiement
- [ ] ⏸️ Libération après clôture projet
- [ ] ⏸️ Escrow marqué "released"
- [ ] ⏸️ Paiement artisan effectué
- [ ] ⏸️ Notification artisan

### 6.5 Remboursement
- [ ] ⏸️ Demande remboursement fonctionne (client)
- [ ] ⏸️ Escrow marqué "frozen" en cas de litige
- [ ] ⏸️ Validation admin requise
- [ ] ⏸️ Appel qualité client (admin)
- [ ] ⏸️ Approuver/rejeter remboursement (admin)
- [ ] ⏸️ Escrow marqué "refunded" après validation

---

## 7. 💬 COMMUNICATION

### 7.1 Chat
- [ ] ⏸️ Page chat accessible depuis projet
- [ ] ⏸️ Messages temps réel fonctionnent (Supabase Realtime)
- [ ] ⏸️ Envoi message textuel fonctionne
- [ ] ⏸️ Envoi message vocal fonctionne
- [ ] ⏸️ Messages système affichés
- [ ] ⏸️ Historique messages chargé
- [ ] ⏸️ Chat créé automatiquement après devis

### 7.2 Messages
- [ ] ⏸️ Messages affichés par ordre chronologique
- [ ] ⏸️ Avatar utilisateur dans messages
- [ ] ⏸️ Timestamp messages affiché
- [ ] ⏸️ Distinction messages envoyés/reçus

---

## 8. 🔔 NOTIFICATIONS

### 8.1 NotificationBell
- [ ] ⏸️ Badge compteur non lus affiché
- [ ] ⏸️ Clic ouvre liste notifications
- [ ] ⏸️ Liste notifications s'affiche

### 8.2 Types Notifications
- [ ] ⏸️ Notification nouveau projet (artisan)
- [ ] ⏸️ Notification nouveau devis (client)
- [ ] ⏸️ Notification devis accepté (artisan)
- [ ] ⏸️ Notification devis rejeté (artisan)
- [ ] ⏸️ Notification demande révision (artisan)
- [ ] ⏸️ Notification projet complété (client)
- [ ] ⏸️ Notification paiement reçu (artisan)
- [ ] ⏸️ Notification vérification approuvée (artisan)
- [ ] ⏸️ Notification vérification rejetée (artisan)
- [ ] ⏸️ Notification nouveau message

### 8.3 Navigation Notifications
- [ ] ⏸️ Clic notification redirige vers page concernée
- [ ] ⏸️ Notification marquée "lu" après clic
- [ ] ⏸️ Compteur mis à jour après lecture

---

## 9. ⭐ NOTATION & AVIS

### 9.1 Soumission Avis
- [ ] ⏸️ Modal notation accessible après clôture projet
- [ ] ⏸️ Sélection note (1-5 étoiles) fonctionne
- [ ] ⏸️ Commentaire textuel fonctionne
- [ ] ⏸️ Soumission avis créé dans la DB
- [ ] ⏸️ Note moyenne artisan recalculée automatiquement (trigger)
- [ ] ⏸️ Facture générée automatiquement après avis (trigger)
- [ ] ⏸️ Notification artisan

### 9.2 Affichage Avis
- [ ] ⏸️ Note moyenne affichée (artisan)
- [ ] ⏸️ Liste avis affichée (artisan)
- [ ] ⏸️ Avis clients visibles (public)

---

## 10. 📊 ADMINISTRATION

### 10.1 Dashboard Admin
- [ ] ⏸️ Page admin accessible (admin uniquement)
- [ ] ⏸️ Statistiques affichées (utilisateurs, projets, devis, escrows)
- [ ] ⏸️ Graphiques/Tableaux (si implémentés)

### 10.2 Gestion Utilisateurs
- [ ] ⏸️ Liste utilisateurs s'affiche
- [ ] ⏸️ Filtres fonctionnent (rôle, statut)
- [ ] ⏸️ Recherche fonctionne
- [ ] ⏸️ Modification rôle fonctionne
- [ ] ⏸️ Suspension utilisateur fonctionne

### 10.3 Gestion Projets
- [ ] ⏸️ Liste projets s'affiche
- [ ] ⏸️ Filtres fonctionnent (statut, catégorie)
- [ ] ⏸️ Détails projet accessibles
- [ ] ⏸️ Modification statut projet fonctionne

### 10.4 Gestion Escrows
- [ ] ⏸️ Liste escrows s'affiche
- [ ] ⏸️ Filtres fonctionnent (statut)
- [ ] ⏸️ Détails escrow accessibles
- [ ] ⏸️ Validation remboursement fonctionne
- [ ] ⏸️ Appel qualité client fonctionne

### 10.5 Gestion Vérifications
- [ ] ⏸️ Liste demandes vérification s'affiche
- [ ] ⏸️ Documents accessibles
- [ ] ⏸️ Validation/rejet fonctionne
- [ ] ⏸️ Notes admin fonctionnent

### 10.6 Gestion Litiges
- [ ] ⏸️ Liste litiges s'affiche
- [ ] ⏸️ Détails litige accessibles
- [ ] ⏸️ Résolution litige fonctionne
- [ ] ⏸️ Escrow gelé automatiquement

---

## 11. 💵 GESTION FINANCIÈRE

### 11.1 Suivi Dépenses
- [ ] ⏸️ Page dépenses accessible
- [ ] ⏸️ Liste dépenses s'affiche
- [ ] ⏸️ Ajout dépense fonctionne
- [ ] ⏸️ Catégories fonctionnent (matériaux, transport, outils, formation, autre)
- [ ] ⏸️ Upload justificatif fonctionne
- [ ] ⏸️ Filtres fonctionnent (catégorie, date)
- [ ] ⏸️ Statistiques affichées (total, par catégorie)

### 11.2 Facturation
- [ ] ⏸️ Page factures accessible
- [ ] ⏸️ Liste factures s'affiche
- [ ] ⏸️ Factures générées automatiquement après avis
- [ ] ⏸️ Numéro facture généré (INV-YYYYMMDD-XXXXX)
- [ ] ⏸️ Filtres fonctionnent (statut, date)
- [ ] ⏸️ Statistiques affichées
- [ ] ⏸️ Export PDF fonctionne

---

## 12. 🎨 UI/UX

### 12.1 Design Mobile-First
- [ ] ⏸️ Interface responsive (mobile, tablette, desktop)
- [ ] ⏸️ Navigation mobile optimisée
- [ ] ⏸️ Touch targets suffisants (44x44px)

### 12.2 Système Toasts
- [ ] ⏸️ Toasts s'affichent (success, error, warning, info)
- [ ] ⏸️ Auto-dismiss fonctionne
- [ ] ⏸️ Animation fluide

### 12.3 Skeleton Screens
- [ ] ⏸️ Skeleton affiché pendant chargement
- [ ] ⏸️ Skeleton disparaît après chargement

### 12.4 Accessibilité
- [ ] ⏸️ Aria-labels présents
- [ ] ⏸️ Focus visible fonctionne
- [ ] ⏸️ Contraste suffisant
- [ ] ⏸️ Navigation clavier fonctionne

---

## 13. 🔒 SÉCURITÉ

### 13.1 Row Level Security (RLS)
- [ ] ⏸️ RLS activé sur toutes les tables
- [ ] ⏸️ Artisans voient uniquement projets de leur catégorie
- [ ] ⏸️ Utilisateurs voient uniquement leurs données
- [ ] ⏸️ Admins voient toutes les données

### 13.2 Vérifications Permissions
- [ ] ⏸️ Acceptation devis : seul client propriétaire projet
- [ ] ⏸️ Soumission devis : seul artisan de la catégorie
- [ ] ⏸️ Annulation projet : seul client propriétaire
- [ ] ⏸️ Accès admin : uniquement admins

### 13.3 Audit Logs
- [ ] ⏸️ Actions loggées (création projet, acceptation devis, etc.)
- [ ] ⏸️ Logs accessibles (admin)
- [ ] ⏸️ Traçabilité complète

---

## 📊 RÉSULTATS DES TESTS

### Résumé
- **Total tests :** XX
- **Passés :** XX (XX%)
- **Partiels :** XX (XX%)
- **Échecs :** XX (XX%)
- **Non testés :** XX (XX%)

### Problèmes Identifiés
1. ...
2. ...
3. ...

---

**Date de dernière exécution :** ___________  
**Testé par :** ___________  
**Version testée :** 2.0.0
