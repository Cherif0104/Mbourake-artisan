# Stratégie d'affiliation des artisans

> Document de proposition — à valider avant implémentation.  
> La plateforme reste 100 % fonctionnelle ; ce document décrit l’approche recommandée.

---

## 1. Contexte et business model

### Rôle des organisations
- **SAE** (Structures d’Accompagnement et d’Encadrement)
- **ONG**
- **Associations**
- **GIE** (Groupements d’Intérêt Économique)
- **Structures de formation**
- **Chambres de métiers** (une par région au Sénégal)
- **Incubateurs**

Ces structures :
- amènent des artisans/entrepreneurs sur la plateforme ;
- les accompagnent et les forment ;
- perçoivent une **commission** sur chaque transaction réalisée par leurs artisans affiliés.

### Principe
- Chaque artisan doit être affilié à **au moins une** structure.
- L’affiliation est le levier du business model : les organisations sont les partenaires qui font grandir la base d’artisans.

---

## 2. Recommandations stratégiques

### 2.1 Affiliation unique ou multiple ?

**Recommandation : affiliation unique (une structure par artisan).**

| Option | Avantages | Inconvénients |
|--------|-----------|---------------|
| **Unique** | Règles de commission simples, traçabilité claire, pas de conflit entre structures | Moins de flexibilité pour l’artisan |
| **Multiple** | Plus de visibilité pour l’artisan | Répartition des commissions complexe, risques de conflits |

**Justification :**  
- Commission = % ou montant fixe par transaction.  
- Avec une seule structure, le calcul est direct et sans ambiguïté.  
- Les chambres de métiers, SAE, etc. couvrent déjà un territoire ou un secteur ; une affiliation principale suffit.

### 2.2 Changement d’affiliation

**Recommandation : changement possible mais encadré.**

| Option | Description | Recommandation |
|--------|-------------|----------------|
| **Aucun changement** | Affiliation définitive | Trop rigide ; mauvaise UX si erreur ou mauvaise structure |
| **Libre** | L’artisan change quand il veut | Risque d’abus, perte de confiance des structures |
| **Encadré** | Délai de carence + validation admin | Équilibre entre flexibilité et stabilité |

**Proposition :**
- **Délai de carence :** 6 à 12 mois minimum avant de pouvoir demander un changement.
- **Workflow :** Demande de l’artisan → validation par un admin (super admin ou admin dédié).
- **Motif obligatoire :** L’artisan doit justifier (changement de région, dissolution de la structure, etc.).
- **Historique :** Conserver l’historique des affiliations pour audit et commissions passées.

### 2.3 Hiérarchie des rôles

```
Super Admin (plateforme)
    └── Administre tout : admins, organisations, paramètres
    └── Gère les demandes de changement d’affiliation
    └── Configure les règles de commission

Admin Organisation (par structure)
    └── Voit uniquement les artisans affiliés à sa structure
    └── Peut inviter/onboarder des artisans (lien d’invitation)
    └── Consulte les commissions et le volume de transactions
    └── Ne peut pas modifier l’affiliation d’un artisan

Artisan
    └── Affilié à une structure à l’inscription
    └── Peut demander un changement (après délai de carence)
    └── Voit sa structure d’affiliation sur son profil
```

---

## 3. Modèle de données (existant et évolutions)

### Tables existantes
- `chambres_metier` : structures (chambres, SAE, ONG, etc.)
- `artisan_affiliations` : lien artisan ↔ structure, avec `status` (pending, verified)
- `organisation_members` : membres d’une organisation
- `commission_rules`, `commission_ledger` : règles et journal des commissions

### Évolutions proposées

1. **Contrainte d’affiliation unique :**
   - Un artisan ne peut avoir qu’**une seule** affiliation `verified` à la fois.
   - Migration : pour les artisans avec plusieurs affiliations vérifiées, garder la plus ancienne ou la plus récente selon la règle métier.

2. **Champ `affiliation_locked_until` :**
   - Date jusqu’à laquelle l’artisan ne peut pas demander de changement.
   - Calculée à la création de l’affiliation : `created_at + 6 mois` (ou 12 mois).

3. **Table `affiliation_change_requests` :**
   - `artisan_id`, `from_chambre_id`, `to_chambre_id`, `reason`, `status` (pending, approved, rejected), `decided_by`, `decided_at`.

---

## 4. Flux utilisateur proposé

### Inscription artisan
1. L’artisan choisit ou est invité par une structure.
2. S’il a un **lien d’invitation** : affiliation automatique à la structure émettrice.
3. Sinon : sélection de la structure dans une liste (chambres de métiers, SAE, etc.) lors de l’étape Affiliation.
4. Statut initial : `pending` → un admin de la structure ou un super admin valide → `verified`.

### Demande de changement (après délai de carence)
1. L’artisan va dans Paramètres / Mon affiliation.
2. Bouton « Demander un changement » (actif seulement si `affiliation_locked_until < now`).
3. Formulaire : nouvelle structure + motif obligatoire.
4. Création d’une `affiliation_change_request` en `pending`.
5. Le super admin (ou admin dédié) valide ou rejette.
6. Si validé : ancienne affiliation archivée, nouvelle créée, `affiliation_locked_until` mis à jour.

---

## 5. Commissions

- Les règles existantes (`commission_rules`, `commission_ledger`) restent la base.
- Chaque transaction (projet, escrow, marketplace) déclenche une commission pour la structure affiliée à l’artisan.
- La structure est identifiée via `artisan_affiliations` (artisan_id → chambre_id) avec `status = 'verified'`.

---

## 6. Plan d’implémentation (à valider)

| Phase | Description | Impact |
|-------|-------------|--------|
| **Phase 1** | Contrainte d’affiliation unique + `affiliation_locked_until` | Migration + règles métier |
| **Phase 2** | Table `affiliation_change_requests` + workflow de demande | Nouvelle fonctionnalité |
| **Phase 3** | Rôle Admin Organisation + restrictions RLS | Sécurité et périmètre |
| **Phase 4** | Dashboard commissions par structure | Reporting |

---

## 7. Points de vigilance

- **Données existantes :** Vérifier les artisans sans affiliation ou avec plusieurs affiliations avant de durcir les contraintes.
- **Rétrocompatibilité :** Les artisans déjà affiliés conservent leur statut ; le délai de carence s’applique à partir de la date de mise en production de la règle.
- **UX :** Rendre l’affiliation claire et simple à l’onboarding pour ne pas bloquer les inscriptions.

---

*Document créé le 2025-03-06 — À valider avant toute modification du code.*
