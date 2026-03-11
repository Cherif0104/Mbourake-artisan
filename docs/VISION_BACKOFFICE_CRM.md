# Vision Backoffice & CRM — Mbourake

> Document de vision stratégique pour le backoffice admin/super admin.  
> **Principe absolu :** Aucune modification qui casse l’expérience client ou artisan. La plateforme reste 100 % fonctionnelle.

---

## 1. Objectifs

- **CRM & Business Management** : gestion des dossiers clients et artisans, vue 360°, workflows.
- **Backoffice modulable** : approche type Odoo — modules extensibles, création de nouveaux champs/formulaires.
- **Droits d’accès granulaire** : RBAC par département, équipe, rôle.
- **Traçabilité totale** : qui a fait quoi, quand, comment, avec quel motif.
- **Gestion escrow & recouvrement** : procédures de déblocage, traitement des litiges, traçabilité des paiements.

---

## 2. Architecture des droits (RBAC granulaire)

### 2.1 Hiérarchie organisationnelle

```
Plateforme Mbourake
├── Départements (ex: Commercial, Finance, Support, Conformité)
│   ├── Manager de département (responsable)
│   └── Équipes
│       ├── Équipe 1 (ex: Chargés clientèle Dakar)
│       │   ├── Responsable d'équipe
│       │   └── Membres (agents)
│       └── Équipe 2 (ex: Recouvrement)
│           ├── Responsable d'équipe
│           └── Membres
```

### 2.2 Rôles métier (à enrichir)

| Rôle | Périmètre | Permissions typiques |
|------|-----------|------------------------|
| **Super Admin** | Plateforme entière | Tout : config, utilisateurs, finance, audit |
| **Admin Plateforme** | Plateforme | Tout sauf suppression users/orgs, finance_manage |
| **Manager Département** | Son département | Gestion équipes, affectation dossiers, validation |
| **Admin Organisation** | Sa structure (chambre, SAE) | Artisans affiliés, commissions, invitations |
| **Manager Commercial** | Équipe commerciale | Dossiers clients/artisans, projets, reporting |
| **Chargé de clientèle** | Dossiers assignés | Lecture/édition dossiers, suivi projets |
| **Chargé recouvrement** | Escrows, paiements | Traitement déblocages, litiges, procédures |
| **Agent Conformité** | Vérifications | Validation artisans, documents, suspension |
| **Manager Formation** | Cohortes, formations | Suivi formations, inscriptions |
| **Auditeur** | Lecture seule | Consultation logs, exports, rapports |

### 2.3 Scope et filtrage

- **Scope global** : accès à tout (super admin, auditor).
- **Scope département** : accès aux données du département (projets, dossiers de l’équipe).
- **Scope organisation** : accès aux artisans affiliés à la structure.
- **Scope équipe** : accès aux dossiers assignés à l’équipe ou à l’agent.

### 2.4 Assignation de dossiers

- Chaque **dossier client** ou **dossier artisan** peut être assigné à :
  - une équipe ;
  - un agent (chargé de clientèle).
- Le responsable d’équipe voit tous les dossiers de son équipe.
- Le manager de département voit tous les dossiers du département.

---

## 3. Dossiers 360° — Client & Artisan

### 3.1 Dossier Artisan

**Identité & affiliation**
- Nom, prénom, email, téléphone, pièce d’identité
- Structure d’affiliation (chambre, SAE, ONG, etc.)
- Statut : vérifié, en attente, suspendu, banni

**Documents & activité**
- Documents de certification (diplômes, attestations)
- Documents liés à l’entreprise (RCCM, NINEA si applicable)
- Certifications plateforme (artisan_certifications)

**Historique & activité**
- Projets réalisés (avec statut, montant, client)
- Devis soumis, acceptés, refusés
- Commandes marketplace
- Avis clients (notes, réclamations)
- Formations suivies (cohortes, attestations)

**Actions admin**
- Changer statut : vérifié / suspendu / banni
- Changer structure d’affiliation (workflow validé)
- Consulter / télécharger documents
- Ajouter une note interne
- Supprimer le compte (workflow existant)

**Vue 360°**
- Timeline des événements (inscription, vérification, projets, litiges)
- Graphiques : CA, nombre de projets, évolution note
- Alertes : réclamations, litiges en cours, retard de livraison

### 3.2 Dossier Client

**Identité**
- Nom, prénom, email, téléphone
- Localisation (région, département, commune)

**Historique & activité**
- Projets créés (en cours, terminés, annulés)
- Devis demandés, acceptés
- Commandes marketplace
- Paiements (escrows, montants)
- Réclamations / litiges

**Potentiel de conversion**
- Client → artisan (réorientation vers une activité)
- Client → ambassadeur (parrainage)

**Actions admin**
- Consulter l’historique
- Ajouter une note
- Suspendre le compte (rare)
- Assigner à un chargé de clientèle

### 3.3 Base de données structurée

- **Artisans** : cœur métier — tous secteurs (plomberie, électricité, couture, etc.)
- **Clients** : base exploitable pour reconversion, parrainage, analytics
- **Organisations** : structures d’affiliation avec leurs artisans et commissions

---

## 4. Gestion Escrow & Recouvrement

### 4.1 Flux actuel (à préserver)

1. Client paie → fonds en séquestre (escrow)
2. Artisan réalise le travail
3. Client confirme la clôture → déblocage déclenché (ou manuel si litige)

### 4.2 Module Recouvrement (backoffice)

**Vue des escrows**
- Liste des escrows : statut (locked, release_pending, released, disputed)
- Filtres : par projet, artisan, client, date, montant
- Détail : historique des actions, qui a validé quoi

**Procédures**
- **Déblocage normal** : client confirme → action automatique ou manuelle par admin
- **Litige** : blocage → enquête → décision (remboursement client, déblocage artisan, partage)
- **Remboursement** : procédure encadrée, validation super admin ou chargé recouvrement

**Traçabilité obligatoire**
- Chaque action (déblocage, remboursement, rejet) enregistrée dans `admin_audit_logs`
- Champs : `actor_user_id`, `action`, `entity_type` (escrow), `entity_id`, `reason`, `old_data`, `new_data`
- Lien vers le dossier projet / client / artisan

### 4.3 Rôle Chargé recouvrement

- Permission : `finance.approve` ou `finance.finance_manage`
- Scope : équipe recouvrement ou département finance
- Peut : traiter les déblocages, initier les remboursements, consulter les litiges
- Ne peut pas : modifier les règles de commission, supprimer des données

---

## 5. Modules du backoffice (état actuel & évolution)

### 5.1 Modules existants

| Module | Description | Évolution proposée |
|--------|-------------|---------------------|
| Vue d’ensemble | Dashboard admin | KPIs par département, alertes |
| Utilisateurs | Liste, détail, suspension | Dossier 360° (client ou artisan) |
| Projets | Liste des projets | Filtres avancés, assignation |
| Boutique | Produits | Vue par artisan, modération |
| Commandes | Orders marketplace | Traitement litiges |
| Paiements (Escrows) | Liste escrows | Module Recouvrement (procédures, traçabilité) |
| Clôtures | Demandes de clôture | Workflow validation, traçabilité |
| Vérifications | Documents artisans | Intégré au Dossier Artisan |
| Affiliations | Artisan ↔ structure | Workflow changement, délai carence |
| Organisations | Structures (chambres, SAE) | Détail commissions, artisans affiliés |
| Litiges | Disputes | Workflow résolution, assignation |
| Exports | Données CSV/Excel | Exports par périmètre (équipe, département) |
| Journal d’audit | admin_audit_logs | Filtres, recherche, export |
| Commissions | Règles, ledger | Dashboard par organisation |
| Demandes suppression | deletion_requests | Workflow existant |
| Dashboard exécutif | BI | Enrichi par département |
| Formation & cohortes | training_cohorts | Suivi par artisan |

### 5.2 Nouveaux modules à créer

| Module | Description |
|--------|-------------|
| **Dossiers Artisans** | Vue 360°, assignation, actions (suspendre, changer affiliation) |
| **Dossiers Clients** | Vue 360°, assignation, notes |
| **Recouvrement** | Procédures escrow, déblocage manuel, remboursement, traçabilité |
| **Départements & Équipes** | CRUD départements, équipes, responsables, membres |
| **Assignation rôles** | Interface pour assigner rôles aux utilisateurs (scope département/équipe) |
| **Formulaires personnalisés** | Création de champs additionnels (comme Odoo) |

---

## 6. Extensibilité (approche type Odoo)

### 6.1 Formulaires dynamiques

- Table `custom_fields` : `entity_type` (artisan, client, project), `field_name`, `field_type`, `label`, `required`
- Table `custom_field_values` : `entity_id`, `field_id`, `value`
- Interface admin : créer un champ, le rattacher à un type d’entité
- Affichage dans les dossiers 360° selon la config

### 6.2 Modules optionnels

- Chaque module = un ensemble de tables + routes admin + permissions
- Exemple : module « Formation avancée » (présentiel, attestations)
- Exemple : module « Parrainage » (codes promo, récompenses)
- Activation/désactivation par configuration (sans casser l’existant)

### 6.3 Workflows configurables

- Définition de workflows (états, transitions) par type d’entité
- Exemple : Demande changement affiliation → pending → approved/rejected
- Exemple : Litige → opened → investigation → resolved
- Chaque transition peut déclencher une action (notification, commission, etc.)

---

## 7. Traçabilité & Audit

### 7.1 Principe

**Chaque action sensible doit être tracée :**
- Qui : `actor_user_id`
- Quoi : `action` (ex: `escrow.release`, `artisan.suspend`)
- Quand : `created_at`
- Sur quoi : `entity_type`, `entity_id`
- Contexte : `reason`, `old_data`, `new_data`, `metadata`

### 7.2 Actions à tracer

- Modification statut artisan (vérifié, suspendu, banni)
- Changement d’affiliation
- Déblocage escrow, remboursement
- Validation clôture projet
- Assignation de dossier
- Modification rôle/permission
- Export de données
- Suppression de compte

### 7.3 Consultation

- Journal d’audit : filtres par acteur, entité, action, date
- Export pour conformité (RGPD, audit externe)
- Lien depuis chaque dossier vers les actions le concernant

---

## 8. Plan d’implémentation (phases)

### Phase 1 — Fondations (sans casser l’existant)
- Activer pleinement RBAC : départements, équipes, assignations
- Interface Départements & Équipes (CRUD)
- Interface Assignation rôles (admin_user_role_assignments)
- RLS : filtrer les vues admin selon le scope (département, équipe)

### Phase 2 — Dossiers 360°
- Page Dossier Artisan (agrégation des données existantes)
- Page Dossier Client (agrégation des données existantes)
- Assignation dossiers → équipe / agent
- Notes internes sur dossiers

### Phase 3 — Recouvrement & Escrow
- Module Recouvrement : procédures déblocage manuel, remboursement
- Traçabilité complète sur chaque action escrow
- Rôle Chargé recouvrement avec permissions dédiées

### Phase 4 — Affiliations (stratégie validée)
- Contrainte affiliation unique
- Workflow changement d’affiliation
- Dashboard commissions par organisation

### Phase 5 — Extensibilité
- Tables custom_fields, custom_field_values
- Interface admin création de champs
- Affichage dynamique dans les dossiers

### Phase 6 — Workflows & alertes
- Workflows configurables (états, transitions)
- Alertes (réclamations, litiges, retards)
- Notifications aux chargés de dossiers

---

## 9. Contraintes critiques

1. **Ne pas casser le client** : aucune modification des pages client (marketplace, projets, etc.)
2. **Ne pas casser l’artisan** : aucune modification des pages artisan (profil, devis, boutique)
3. **Rétrocompatibilité** : `profiles.role = 'admin'` reste un fallback pour accès admin
4. **Performance** : les agrégations 360° doivent rester rapides (index, vues matérialisées si besoin)
5. **Migration progressive** : chaque phase déployable indépendamment

---

## 10. Références techniques existantes

- **RBAC** : `admin_roles`, `admin_permissions`, `admin_role_permissions`, `admin_user_role_assignments`
- **Structure** : `departments`, `teams`, `team_members` (manager_user_id)
- **Audit** : `admin_audit_logs`, `logAdminAudit()` côté client
- **Escrow** : `escrows`, `project_audit_logs`, `client_confirmed_closure`
- **Affiliations** : `artisan_affiliations`, `chambres_metier`, `organisation_members`

---

*Document créé le 2025-03-06 — Vision stratégique. Implémentation par phases, sans impact sur l’existant.*
