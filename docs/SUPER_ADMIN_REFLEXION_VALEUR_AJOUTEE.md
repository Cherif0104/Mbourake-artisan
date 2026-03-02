# Super administration & valeur ajoutée — Réflexion multi-expertise

Document de cadrage pour définir les fonctionnalités du super administrateur, l’exploitation des données et le modèle organisations / rôles / invitations, en cohérence avec la formation, la structuration, la labellisation et la formalisation des artisans et entrepreneurs.

---

## 1. Vision plateforme et périmètre

- **Périmètre** : Artisans, entrepreneurs et entreprises du Sénégal, de la sous-région et au-delà.
- **Objectif** : Mettre en relation (projets, marketplace) **et** exploiter la base comme levier pour la formation, la structuration, la labellisation, la formalisation et le professionnalisme (F-P-L et dérivés).
- **Valeur ajoutée** : Au-delà de la mise en relation, la donnée collectée sert à :
  - Analyses, segmentations, cohortes (formations, bootcamps, voûte nubienne, BTP, etc.).
  - Travail avec structures partenaires (centres de métiers, SAE, incubateurs, formations professionnelles).
  - Pilotage des programmes F-P-L et offres de formation ciblées.

---

## 2. Exploitation des données (analyses, segmentation, autres usages)

### 2.1 Analyses et tableaux de bord

- **Indicateurs à rendre disponibles (super admin)** :
  - Par **région** : nombre d’artisans/entrepreneurs, par secteur (ex. BTP, voûte nubienne).
  - Par **catégorie / métier** : répartition, évolution.
  - Par **statut F-P-L** : formalisation, professionnalisation, labellisation (à démarrer, en cours, validé).
  - Par **organisation partenaire** : effectifs affiliés, taux de vérification, activité.
- **Exports** : CSV/Excel par segment (région, catégorie, organisation, statut F-P-L) pour rapports et partenaires.

### 2.2 Segmentations pour formations et programmes

- **Cohortes** : construction de listes ciblées (ex. « 500 artisans BTP à Dakar », « cohorte voûte nubienne ») pour :
  - Formations professionnelles.
  - Bootcamps et programmes courts.
  - Appels à projets ou labellisation.
- **Réutilisation de la base** : les mêmes comptes (artisans/entrepreneurs) peuvent être utilisés pour :
  - Inscription à des formations.
  - Suivi de parcours (F-P-L, certifications).
  - Attribution à des partenaires (SAE, centres de métiers, incubateurs).

### 2.3 Partenariats (structures d’accompagnement)

- **Types de structures** : Chambres de métiers, SAE (structures d’accompagnement), incubateurs, centres de formation professionnelle, etc.
- **Données utiles** : par structure partenaire, vue agrégée sur les artisans/entrepreneurs affiliés, statuts, formations, progression F-P-L.
- **Anticipation** : modéliser une entité « Organisation partenaire » (déjà amorcée avec `chambres_metier` / affiliations) et l’étendre à tous les types de partenaires (SAE, incubateurs, etc.).

---

## 3. Comptes et authentification (contrainte Google)

### 3.1 Contexte actuel

- Connexion **uniquement via Google** (OAuth).
- Pas de création de compte « manuelle » avec email/mot de passe dans l’app.
- Les comptes « administrateurs » ou « organisation » doivent donc **exister en tant que comptes Google** (ou être créés en amont dans Google Workspace / identité métier).

### 3.2 Création de comptes depuis l’admin

- **Option A — Invitation uniquement (recommandée)**  
  - Le super admin ou le manager d’organisation **ne crée pas** le compte lui-même.  
  - Il **génère un lien d’invitation** (avec paramètres : rôle, organisation, type artisan/client).  
  - L’utilisateur clique sur le lien → redirection vers le parcours d’inscription (Google) → une fois inscrit, il est automatiquement rattaché à la bonne organisation / au bon rôle.  
  - **Avantage** : pas de mot de passe à gérer, conformité avec « tout passe par Google ».

- **Option B — Comptes « invités » avec email**  
  - Si plus tard la plateforme propose **email + mot de passe** (Supabase permet les deux), l’admin pourrait créer un compte avec email + mot de passe temporaire, que l’utilisateur change à la première connexion.  
  - Pour l’instant, **ne pas implémenter** tant que l’auth reste 100 % Google.

- **Recommandation** : s’appuyer sur **liens d’invitation** (voir section 5) pour rattacher artisans et clients aux organisations, sans créer de compte « à la main » côté admin.

### 3.3 Suspension et suppression de comptes

- **Suspension** (super admin) :
  - Champ `suspended_at` ou `is_suspended` sur `profiles` (ou table dédiée).
  - Règles métier : un compte suspendu ne peut plus se connecter (vérification côté app et/ou RLS).
  - Cas d’usage : fraude, arnaque, signalement, non-respect des règles.
- **Suppression** :
  - Déjà prévue (Edge Function `delete-my-account`).
  - Super admin : possibilité d’**initier la suppression** d’un compte (même flux que l’utilisateur, mais déclenché depuis l’admin), avec traçabilité (qui a demandé la suppression, quand).
- **Blocage** : la suspension = blocage immédiat sans supprimer les données (utile pour enquête ou réversibilité).

---

## 4. Rôles et sous-rôles (super admin vs organisations)

### 4.1 Rôles principaux (plateforme)

- **client** : utilisateur qui publie des projets, achète sur la marketplace.
- **artisan** : propose des devis, vend des produits, suit le parcours F-P-L.
- **admin** : accès au back-office plateforme (super admin ou rôle équivalent).
- **partner** / **chambre_metier** : déjà présents dans l’enum `user_role` ; à aligner avec le modèle « Organisation » ci-dessous.

### 4.2 Super administrateur

- Droits :
  - Gestion des **utilisateurs** (vue, changement de rôle, suspension, demande de suppression).
  - Gestion des **organisations partenaires** (création, édition, désactivation).
  - Gestion des **rôles organisation** (attribution manager, facilitateur, formateur, etc.).
  - Accès à toutes les **analyses** et **exports** (segmentations, cohortes, KPIs).
  - Gestion des **affiliations** (rattachement / détachement d’un artisan ou d’une organisation).
  - Paramétrage global (catégories, régions, messages, etc.) si prévu.
- Un seul ou très peu de comptes « super admin » ; les autres accès admin peuvent être des **rôles organisation** (manager, etc.) avec périmètre limité.

### 4.3 Sous-rôles dans les organisations partenaires

- **Organisation** = une entité partenaire (chambre de métiers, SAE, incubateur, centre de formation).
- **Rôles possibles par organisation** (à stocker en base, ex. table `organisation_members` ou équivalent) :
  - **Administrateur d’organisation** : gestion des membres de l’organisation, des artisans affiliés, des invitations.
  - **Manager** : peut générer des liens d’invitation pour artisans (et éventuellement clients), voir les dossiers de « ses » artisans, rapports limités à son organisation.
  - **Conseil client / Gestionnaire de dossiers** : suivi des dossiers, du parcours, des formations (lecture + mise à jour selon permissions).
  - **Formateur** : accès aux cohortes / formations auxquelles il est assigné, suivi des présences ou validations (à définir avec les parcours formation).
  - **Facilitateur** : rôle opérationnel (terrain, accompagnement) ; droits à définir (ex. lecture dossiers, saisie de notes).
- Ces rôles sont **liés à une organisation** : un même utilisateur peut être « manager » dans l’organisation A et « formateur » dans l’organisation B (si besoin).

### 4.4 Modèle de données (à anticiper)

- **Table `organisations`** (ou généraliser `chambres_metier` en une table plus générique) :
  - id, name, type (chambre, incubateur, sae, centre_formation, autre), region, contact, is_active, etc.
- **Table `organisation_members`** :
  - user_id (profiles.id), organisation_id, role (admin_org, manager, formateur, facilitateur, conseil_client, gestionnaire_dossiers), created_at.
- **RLS** : un utilisateur ne voit que les données des organisations dont il est membre, avec des droits dépendant de son rôle dans chaque organisation.

---

## 5. Liens d’invitation (artisans et clients)

### 5.1 Principe

- Un **manager** (ou admin d’organisation) génère un **lien d’invitation** depuis l’interface admin / organisation.
- Le lien contient (en query params ou token signé) :
  - `organisation_id` (ou chambre_id).
  - `invitation_type` : `artisan` | `client`.
  - Optionnel : `inviter_id` (qui a généré le lien), `campaign` ou `source` pour attribution.
- L’utilisateur clique → redirigé vers la landing ou `/onboard?…` avec ces paramètres → s’inscrit via **Google** → après création du profil, le backend :
  - Rattache l’artisan à l’organisation (table d’affiliation ou `organisation_id` sur le profil / table dédiée).
  - Ou rattache le client à l’organisation partenaire pour **rémunération / attribution** (parrainage, commission partenaire).

### 5.2 Rattachement automatique

- **Artisans** : à l’inscription via lien d’invitation, création d’une entrée dans `artisan_affiliations` (ou table équivalente) avec `chambre_id` / `organisation_id`, statut `pending` ou `verified` selon la règle métier.
- **Clients** : table dédiée **client_attributions** ou **referrals** :
  - client_id, organisation_id (ou artisan_id si parrainage par un artisan), created_at, source = 'invitation_link'.
  - Permet de savoir « ce client a été amené par cette organisation / cet artisan » pour rémunération ou statistiques.

### 5.3 Rémunération double (artisans / organisations)

- Les organisations (ou artisans) qui **invitent des clients** peuvent être rémunérés (commission, bonus). Le lien d’invitation permet d’enregistrer l’attribution.
- Même logique possible pour les artisans invités par une organisation : traçabilité pour subventions, conventions, reporting partenaire.

---

## 6. Synthèse des fonctionnalités super admin à prévoir

| Domaine | Fonctionnalité | Priorité |
|--------|----------------|----------|
| **Utilisateurs** | Liste, filtre, export CSV | Déjà en place |
| **Utilisateurs** | Changement de rôle (client, artisan, admin) | Déjà en place |
| **Utilisateurs** | Suspension de compte (fraude, arnaque) | À ajouter (champ + UI + RLS) |
| **Utilisateurs** | Demande de suppression de compte (initiée par admin) | À ajouter (appel Edge Function ou RPC) |
| **Organisations** | CRUD organisations (généraliser chambres → organisations) | À renforcer / unifier |
| **Organisations** | Membres et rôles (manager, formateur, facilitateur, etc.) | À ajouter (table + UI) |
| **Affiliations** | Vue, vérification, rejet (déjà en place) | OK |
| **Affiliations** | Rattachement / détachement manuel par super admin | À renforcer |
| **Invitations** | Génération de liens (artisan, client) par organisation/manager | À ajouter (table invitations + génération URL) |
| **Analyses** | Tableaux de bord par région, catégorie, F-P-L | À enrichir (AdminDashboard) |
| **Analyses** | Export cohortes (CSV par segment) | À ajouter |
| **Données** | Segmentations pour formations / bootcamps (vues ou exports) | À ajouter (requêtes + exports) |

---

## 7. Prochaines étapes techniques recommandées

1. **Suspension de compte** : ajouter `is_suspended` (ou `suspended_at`) sur `profiles`, adapter l’auth/RLS et l’UI admin (bouton « Suspendre » / « Réactiver »).
2. **Invitations** : table `invitation_links` (organisation_id, created_by, type artisan|client, token unique, expires_at) + page publique qui redirige vers `/onboard?…` avec le token ; après inscription Google, backend associe le compte à l’organisation.
3. **Organisations** : généraliser `chambres_metier` en `organisations` (ou garder le nom et élargir le type) + table `organisation_members` (user_id, organisation_id, role).
4. **Analyses** : étendre le dashboard admin avec des vues par région/catégorie/F-P-L et des exports CSV ciblés.
5. **Documentation** : garder ce document à jour au fur et à mesure des implémentations (rôles, champs, APIs).

---

*Document rédigé pour anticiper les besoins super admin, exploitation des données et partenariats, en restant aligné avec l’authentification Google et le modèle F-P-L existant.*
