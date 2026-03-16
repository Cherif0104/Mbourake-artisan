# Stratégie Backoffice, CRM et Business Management — Mbourake

> Document de stratégie pour un outil de gestion modulable, extensible et granulaire.  
> **Principe cardinal :** ne jamais casser l'existant (client + artisan). La plateforme est 100 % fonctionnelle.

---

## 1. Inventaire existant

### 1.1 Côté client (utilisateur final)

| Fonctionnalité | Pages / Flux | Données clés |
|----------------|--------------|--------------|
| Inscription / Connexion | OnboardPage, OAuth Google | profiles, auth |
| Création de projet | CreateProjectPage | projects, categories |
| Recherche artisans | ArtisansPage, CategoryPage, MarketplacePage | artisans, products |
| Suivi projet | ProjectDetailsPage, ProjectSuiviPage, ProjectWorkPage | projects, quotes, messages |
| Paiement | ProjectPaymentPage, ProjectAwaitingPaymentPage | escrows, Wave/OM |
| Clôture / Avis | ProjectCompletionPage, AvisRecusPage | reviews |
| Messagerie | ChatPage, ConversationsPage | messages |
| Favoris | FavoritesPage | favorites |
| Factures | InvoicesPage | invoices |
| Paramètres / Suppression compte | SettingsPage | profiles, delete-my-account |

### 1.2 Côté artisan

| Fonctionnalité | Pages / Flux | Données clés |
|----------------|--------------|--------------|
| Profil / Édition | ProfilePage, EditProfilePage | profiles, artisans |
| Boutique (portfolio) | MyProductsPage, MarketplaceProductPage | products |
| Commandes reçues | MyShopOrdersPage | orders |
| Devis / Révisions | RevisionsPage, RevisionResponsePage | quotes, quote_revisions |
| Projets / Travail | ProjectWorkPage, ProjectDetailsPage | projects, quotes |
| Crédits | CreditsPage | artisan_credit_wallets |
| Certifications | MyCertificationsPage | artisan_certifications |
| Affiliation | AffiliationSection (EditProfile) | artisan_affiliations |
| Vérification | VerificationPage | verification_documents |
| Dépenses | ExpensesPage | expenses |

### 1.3 Admin existant

| Module | Route | Rôle |
|--------|-------|------|
| Vue d'ensemble | /admin | Dashboard |
| Utilisateurs | /admin/users | Liste + détail (AdminUserDetail) |
| Projets | /admin/projects | Liste projets |
| Boutique | /admin/boutique | Produits |
| Commandes | /admin/commandes | Orders marketplace |
| Paiements (escrows) | /admin/escrows | Séquestration |
| Clôtures | /admin/closures | Validation clôture |
| Vérifications | /admin/verifications | Documents artisans |
| Affiliations | /admin/affiliations | artisan_affiliations |
| Organisations | /admin/organisations | chambres_metier |
| Litiges | /admin/disputes | Disputes |
| Exports | /admin/exports | BI |
| Journal d'audit | /admin/audit | admin_audit_logs |
| Commissions | /admin/commissions | commission_ledger |
| Demandes suppression | /admin/deletion-requests | deletion_requests |
| Dashboard exécutif | /admin/executive | KPIs |
| Formation & cohortes | /admin/training | training_cohorts |

### 1.4 RBAC existant

- **admin_roles** : super_admin, platform_admin, department_manager, org_admin, org_manager, client_success_agent, sales_manager, compliance_officer, training_manager, auditor_readonly
- **admin_permissions** : modules (users, organisations, governance, finance, bi, training, disputes, escrows, etc.) + actions (read, create, update, delete, assign, export)
- **departments**, **teams**, **team_members** : structure hiérarchique (partiellement utilisée)
- **admin_user_role_assignments** : user_id, role_id, scope_type, scope_id
- **admin_audit_logs** : actor_user_id, action, entity_type, entity_id

---

## 2. Vision : Backoffice modulable et extensible (type Odoo)

### 2.1 Principes

1. **Modularité** : Chaque domaine métier = module (Artisans, Clients, Projets, Paiements, Formations, etc.).
2. **Extensibilité** : Possibilité d'ajouter des modules, formulaires, champs personnalisés sans toucher au cœur.
3. **Granularité** : Droits d'accès par module × action × scope (global, organisation, département, équipe).
4. **Traçabilité** : Chaque action admin est loggée (qui, quoi, quand, sur quoi).
5. **Workflows** : États, transitions, notifications interconnectées.

### 2.2 Architecture cible

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SUPER ADMIN (plateforme)                          │
│  • Configuration globale • Rôles • Permissions • Modules • Extensions    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────────┐         ┌───────────────┐
│ DÉPARTEMENT   │         │ DÉPARTEMENT       │         │ DÉPARTEMENT   │
│ Relation      │         │ Finance &         │         │ Opérations &  │
│ Client        │         │ Paiements         │         │ Conformité    │
└───────────────┘         └───────────────────┘         └───────────────┘
        │                           │                           │
   ┌────┴────┐                 ┌────┴────┐                 ┌────┴────┐
   │ Équipe  │                 │ Équipe  │                 │ Équipe  │
   │ Commer- │                 │ Escrow  │                 │ Vérif.  │
   │ ciale   │                 │ Recouv. │                 │ Litiges │
   └─────────┘                 └─────────┘                 └─────────┘
```

---

## 3. Départements, équipes et hiérarchie

### 3.1 Départements proposés

| Département | Code | Responsable | Rôle principal |
|-------------|------|-------------|-----------------|
| **Relation client & Artisans** | REL_CLIENT | Manager | Dossiers clients/artisans, support, onboarding |
| **Finance & Paiements** | FINANCE | Manager | Escrows, clôtures, remboursements, commissions |
| **Opérations & Conformité** | OPS | Manager | Vérifications, litiges, suspensions |
| **Commercial & Partenariats** | COMMERCIAL | Manager | Organisations, affiliations, formations |
| **BI & Données** | BI | Manager | Exports, reporting, audit |

### 3.2 Équipes par département

| Département | Équipes | Rôles |
|-------------|---------|-------|
| REL_CLIENT | Relation clientèle, Charge artisans | client_success_agent, sales_manager |
| FINANCE | Escrow, Recouvrement | (nouveau: escrow_officer, recovery_agent) |
| OPS | Vérifications, Litiges | compliance_officer |
| COMMERCIAL | Partenariats, Formations | training_manager, org_manager |
| BI | Reporting, Audit | auditor_readonly |

### 3.3 Hiérarchie

- **Super Admin** : au-dessus de tout, configure départements/équipes/rôles.
- **Manager Département** : gère son département et ses équipes, assigne les membres.
- **Manager Équipe** : gère son équipe, voit les dossiers assignés à l'équipe.
- **Agent** : voit et traite les dossiers qui lui sont assignés (ou non assignés selon le workflow).

---

## 4. Rôles métier détaillés

### 4.1 Rôles existants à enrichir

| Rôle | Périmètre | Permissions typiques |
|------|-----------|----------------------|
| **super_admin** | Global | Tout |
| **platform_admin** | Global | Tout sauf suppression critique |
| **department_manager** | Département | Gestion équipe, lecture/écriture périmètre |
| **org_admin** | Organisation (chambre, SAE) | Artisans affiliés, commissions, invitations |
| **org_manager** | Organisation | Lecture + actions limitées |
| **client_success_agent** | Équipe | Dossiers clients/artisans, messagerie support |
| **sales_manager** | Équipe | Suivi commercial, conversions |
| **compliance_officer** | Équipe | Vérifications, litiges, suspensions |
| **training_manager** | Équipe | Cohortes, formations |
| **auditor_readonly** | Global | Lecture seule, exports |

### 4.2 Nouveaux rôles proposés

| Rôle | Code | Département | Description |
|------|------|-------------|-------------|
| **Agent Escrow** | escrow_officer | FINANCE | Traite les paiements, clôtures, déclenche remboursements |
| **Chargé de recouvrement** | recovery_agent | FINANCE | Litiges financiers, procédures de remboursement |
| **Agent vérification** | verification_agent | OPS | Valide/rejette les documents artisans |

---

## 5. Dossiers 360° — Client et Artisan

### 5.1 Dossier Artisan (vue 360°)

| Section | Contenu | Source |
|---------|---------|--------|
| **Identité** | Nom, prénom, email, téléphone, pièce d'identité | profiles, verification_documents |
| **Affiliation** | Structure, statut (pending/verified), historique | artisan_affiliations |
| **Documents** | Certifications, documents d'activité | artisan_certifications, verification_documents |
| **Statut** | Vérifié, Suspendu, Banni | artisans.verification_status, profiles.is_suspended |
| **Projets** | Tous les projets (devis, statut, montants) | projects, quotes |
| **Boutique** | Produits, commandes reçues | products, orders |
| **Avis & Réclamations** | Avis clients, litiges | reviews, disputes |
| **Formations** | Cohortes, participations | training_cohort_members |
| **Historique admin** | Qui a modifié quoi, quand | admin_audit_logs |
| **Actions** | Suspendre, Bannir, Changer affiliation, Supprimer | Workflows |

### 5.2 Dossier Client (vue 360°)

| Section | Contenu | Source |
|---------|---------|--------|
| **Identité** | Nom, email, téléphone, localisation | profiles |
| **Projets** | Projets créés, statut, montants | projects |
| **Paiements** | Escrows, factures | escrows, invoices |
| **Commandes** | Marketplace | orders |
| **Avis donnés** | Reviews laissées | reviews |
| **Litiges** | Réclamations | disputes |
| **Historique** | Actions, support | admin_audit_logs |
| **Actions** | Suspendre, Contacter | Workflows |

### 5.3 Conversion client → artisan

- Un client peut devenir artisan (changement de rôle).
- Historique conservé : on garde les projets passés en tant que client.
- Workflow : demande de conversion ou admin initie.

---

## 6. Gestion des droits d'accès granulaire

### 6.1 Modèle de permissions

```
Permission = module + action + scope
```

- **module** : users, organisations, projects, escrows, disputes, finance, bi, governance, training, etc.
- **action** : read, create, update, delete, assign, approve, export
- **scope** : global | organisation | department | team

### 6.2 Règles de filtrage

- **scope = global** : accès à toutes les données du module.
- **scope = organisation** : uniquement les données liées à l'organisation de l'utilisateur (ex: artisans affiliés).
- **scope = department** : données du département (ex: dossiers assignés au département).
- **scope = team** : données de l'équipe (ex: dossiers assignés à l'équipe).

### 6.3 Assignation de dossiers

- Chaque dossier (client, artisan, projet, escrow, litige) peut avoir un `assigned_to` (user_id).
- Les agents voient les dossiers non assignés (file d'attente) ou assignés à eux/leur équipe.
- Le manager peut réassigner.

---

## 7. Escrow et procédures de paiement

### 7.1 Flux actuel

1. Client paie → fonds en séquestre (escrow).
2. Artisan réalise le travail.
3. Client confirme → clôture → remboursement déclenché vers l'artisan.

### 7.2 Procédures admin à formaliser

| Procédure | Déclencheur | Rôle | Actions | Traçabilité |
|-----------|-------------|------|---------|-------------|
| **Clôture manuelle** | Client ne répond pas, litige résolu | Agent Escrow | Valider clôture, déclencher remboursement | admin_audit_logs + escrow_audit_logs |
| **Remboursement client** | Litige en faveur du client | Chargé recouvrement | Initier remboursement, documenter | audit |
| **Blocage escrow** | Litige en cours | Agent Escrow | Bloquer, ne pas libérer | audit |
| **Paiement manuel** | Cas exceptionnel | Super Admin | Déclencher manuellement | audit obligatoire |

### 7.3 Traçabilité

- Chaque action sur un escrow : `escrow_audit_logs` (qui, quoi, quand, ancienne valeur, nouvelle valeur).
- Lien avec `admin_audit_logs` pour les actions initiées par un admin.

---

## 8. Workflows interconnectés

### 8.1 Workflow Vérification artisan

```
pending → (compliance_officer) → verified | rejected
```

### 8.2 Workflow Affiliation

```
pending → (org_admin ou super_admin) → verified
Demande changement → (super_admin) → approved | rejected
```

### 8.3 Workflow Litige

```
ouvert → assigné → en_cours → résolu (remboursement client | artisan | partagé)
```

### 8.4 Workflow Escrow

```
funded → (travail) → release_requested → (client confirme OU admin clôture) → released
                    → (litige) → blocked → (résolution) → released ou refunded
```

### 8.5 Workflow Suspension / Bannissement

```
Actif → (compliance_officer) → Suspendu (motif, date)
Suspendu → (admin) → Actif | Banni
Banni → (super_admin uniquement) → Actif (débanissement exceptionnel)
```

---

## 9. Extensibilité (approche Odoo-like)

### 9.1 Formulaires personnalisés

- Table `custom_forms` : id, code, name, entity_type (artisan, client, project, organisation), schema (JSON), is_active.
- Table `custom_form_responses` : form_id, entity_id, data (JSONB), submitted_by, submitted_at.
- Interface admin : créer un formulaire, définir les champs (texte, date, fichier, etc.), l'attacher à une entité.
- Affichage dans le dossier 360° : section "Formulaires personnalisés".

### 9.2 Champs personnalisés

- Table `custom_fields` : entity_type, field_code, label, type, options (JSON), is_required.
- Stockage des valeurs : colonnes JSONB sur les tables existantes ou table `custom_field_values`.
- Permet d'enrichir artisans, clients, organisations sans migration lourde.

### 9.3 Modules extensibles

- Table `admin_modules` : code, name, description, is_enabled, config (JSON).
- Chaque "module" admin = une route + des permissions.
- Ajout d'un module = nouvelle entrée + permissions + page React.
- Exemple : module "Satisfaction" (enquêtes), "Parrainage" (référal), etc.

---

## 10. Structure des modules admin (réorganisée)

### 10.1 Menu principal proposé

| Groupe | Modules | Cible |
|--------|---------|-------|
| **Tableau de bord** | Vue d'ensemble, Exécutif | Tous admins |
| **Dossiers** | Artisans, Clients | REL_CLIENT, OPS |
| **Projets & Devis** | Projets, Devis | REL_CLIENT, OPS |
| **Paiements** | Escrows, Clôtures, Commissions | FINANCE |
| **Boutique** | Produits, Commandes | OPS |
| **Organisations** | Structures, Affiliations | COMMERCIAL |
| **Conformité** | Vérifications, Litiges | OPS |
| **Formation** | Cohortes, Inscriptions | COMMERCIAL |
| **Administration** | Utilisateurs, Rôles, Départements, Équipes, Audit | Super Admin |
| **Données** | Exports, Extensions | BI |

### 10.2 Nouvelles pages à créer

| Page | Route | Description |
|------|-------|--------------|
| Dossier Artisan | /admin/artisans/:id | Vue 360° |
| Dossier Client | /admin/clients/:id | Vue 360° |
| Départements | /admin/departments | CRUD départements |
| Équipes | /admin/teams | CRUD équipes, assignation membres |
| Procédures Escrow | /admin/escrows (enrichie) | File d'attente, actions tracées |
| Formulaires personnalisés | /admin/forms | Création, édition |
| Extensions | /admin/extensions | Modules activables |

---

## 11. Plan d'implémentation par phases

### Phase 1 — Fondations (sans casser l'existant)

| Tâche | Description | Impact |
|-------|-------------|--------|
| 1.1 | Activer départements/équipes dans l'UI admin | Nouveau |
| 1.2 | Enrichir AdminUserDetail = Dossier Artisan 360° | Enrichissement |
| 1.3 | Créer Dossier Client 360° | Nouveau |
| 1.4 | Assignation de dossiers (assigned_to) | Nouveau champ |

### Phase 2 — Affiliations (cf. STRATEGIE_AFFILIATIONS.md)

| Tâche | Description |
|-------|-------------|
| 2.1 | Contrainte affiliation unique |
| 2.2 | Workflow changement d'affiliation |
| 2.3 | Admin Organisation (scope) |

### Phase 3 — Escrow et procédures

| Tâche | Description |
|-------|-------------|
| 3.1 | Procédures clôture/remboursement formalisées |
| 3.2 | Rôle Agent Escrow, Chargé recouvrement |
| 3.3 | Traçabilité complète escrow |

### Phase 4 — Workflows et actions

| Tâche | Description |
|-------|-------------|
| 4.1 | Suspension / Bannissement depuis dossier |
| 4.2 | Workflow litiges assigné → résolu |
| 4.3 | Notifications admin (file d'attente) |

### Phase 5 — Extensibilité

| Tâche | Description |
|-------|-------------|
| 5.1 | Formulaires personnalisés |
| 5.2 | Champs personnalisés |
| 5.3 | Modules activables |

---

## 12. Principes de non-régression

1. **Aucune modification des routes client/artisan** : /dashboard, /profile, /projects, etc. restent inchangés.
2. **Aucune modification des API existantes** : les appels Supabase côté client/artisan ne changent pas.
3. **Nouvelles tables, nouveaux champs** : préférer l'ajout (migrations) à la modification de schéma existant.
4. **RLS** : toute nouvelle policy doit être additive ou plus restrictive pour l'admin uniquement.
5. **Tests** : valider chaque phase sur un environnement de staging avant production.

---

## 13. Synthèse des livrables

| Livrable | Priorité | Phase |
|----------|----------|-------|
| Dossiers 360° Artisan & Client | P0 | 1 |
| Départements & Équipes (UI) | P0 | 1 |
| Affiliations (stratégie validée) | P0 | 2 |
| Procédures Escrow tracées | P0 | 3 |
| Workflows (suspension, litiges) | P1 | 4 |
| Formulaires personnalisés | P2 | 5 |
| Extensions / Modules | P2 | 5 |

---

*Document créé le 2025-03-06 — Stratégie globale backoffice, CRM et business management.*
