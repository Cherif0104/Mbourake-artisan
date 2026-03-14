# Paiement marketplace : séquestration (escrow) et pilotage admin

## Contexte

Aujourd’hui les commandes marketplace sont en **paiement à la livraison** hors plateforme. L’objectif est d’envisager un **système de paiement intégré** avec **séquestration** (même logique que l’escrow des projets), puis **déblocage** à la livraison ou au retrait en point relais, le tout **pilotable depuis l’interface admin**.

---

## 1. Principe : réutiliser la logique escrow

Sur les **projets**, la plateforme utilise déjà un escrow :
- Le client paie → les fonds sont **séquestrés** (held).
- À la clôture du projet → la plateforme **débloque** vers l’artisan (après commission, TVA, etc.).

Pour le **marketplace**, on peut répliquer cette logique :

| Étape | Acteur | Action |
|-------|--------|--------|
| 1 | Client | Paie à la commande (Wave, Orange Money, etc.) → montant séquestré |
| 2 | Plateforme | Tient les fonds (escrow) jusqu’à livraison / retrait |
| 3 | Artisan | Confirme → Expédie → Livré (ou client retire en point relais) |
| 4 | Plateforme / Admin | Déblocage vers l’artisan (après commission, partenaires, etc.) |

**Intérêt** : confiance (le client a payé, l’artisan est assuré d’être payé une fois la livraison validée), traçabilité, commissions et partenaires gérés au déblocage.

---

## 2. Scénarios de paiement à couvrir

### 2.1 Paiement à la commande + séquestration (recommandé comme base)

- **À l’achat** : le client paie le total (produits + éventuelle livraison) via la plateforme (lien Wave / Orange Money, etc.).
- Les fonds sont **séquestrés** (un escrow par commande ou par groupe de commandes).
- **À la livraison** (artisan marque « Livrée » ou client confirme réception) : la plateforme **débloque** vers l’artisan (montant net après commission / TVA).
- En cas d’**annulation** (avant livraison) : **remboursement** client depuis l’escrow.

C’est la transposition directe de l’escrow projet au marketplace.

### 2.2 Paiement à la livraison (actuel, à garder en option)

- Aucun paiement à la commande.
- Client et artisan conviennent du paiement (hors plateforme ou futur intégration « payer à la livraison »).
- Pas d’escrow ; la commande sert uniquement au suivi (statuts, notifications).

Utile pour les artisans qui livrent en main propre et encaissent sur place.

### 2.3 Paiement à la commande + retrait en point relais

- Le client **paie à la commande** (séquestration comme en 2.1).
- Livraison = dépôt en **point relais** (partenaire, lockers, etc.).
- Quand le client **retire** (scannage / code) ou que le statut « retiré » est enregistré : **déblocage** vers l’artisan.
- Admin peut gérer la liste des points relais, les associer à des commandes ou à des tournées.

Cela s’articule avec un futur module « Livraisons » (zones, tournées, points relais).

---

## 3. Modèle de données proposé

### 3.1 Option A : table `order_escrows` dédiée (recommandée)

Une table dédiée au marketplace évite de mélanger projet et commande dans la même table `escrows` et permet des champs spécifiques (point relais, mode livraison).

```sql
-- order_escrows : un enregistrement par commande (ou par groupe si on regroupe)
order_escrows (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id),
  total_amount DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'held', 'released', 'refunded', 'frozen')),
  commission_amount DECIMAL(12,2),
  artisan_payout DECIMAL(12,2),
  platform_commission DECIMAL(12,2),
  partner_commission DECIMAL(12,2),  -- part partenaires (SAE, chambres, etc.)
  payment_method TEXT,               -- wave, orange_money, etc.
  transaction_reference TEXT,        -- référence paiement entrant
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- **pending** : commande créée, en attente de paiement client.
- **held** : client a payé, fonds séquestrés.
- **released** : livraison validée, déblocage vers l’artisan effectué.
- **refunded** : annulation / litige, remboursement client.
- **frozen** : gel (litige, contrôle admin).

### 3.2 Adapter la table `orders`

- **payment_mode** : `on_delivery` | `escrow` | `relay` (paiement à la livraison / séquestration / paiement + point relais).
- **delivery_mode** (déjà prévu dans la doc) : `pickup` | `artisan_delivery` | `mbourake_delivery` | `relay`.
- **relay_point_id** (optionnel) : référence vers une future table `relay_points` si point relais.

Cela permet à l’admin de savoir quelles commandes sont en escrow, en paiement à la livraison, ou en point relais.

### 3.3 Points relais (pour plus tard)

- Table **relay_points** : id, name, address, region, commune, is_active, etc.
- Lien commande → point relais pour le scénario « payer puis retirer en point relais ».

---

## 4. Règles de déblocage et commissions

- **Déblocage** : quand la commande passe à `delivered` (ou statut dédié « retirée » en point relais), une action (manuelle admin ou automatique) :
  - calcule commission plateforme, part partenaires (selon règles existantes, artisan affilié à une structure),
  - met à jour `order_escrows` (status = released, artisan_payout, platform_commission, partner_commission),
  - enregistre le « paiement » vers l’artisan (ledger / historique pour tréso).
- **Remboursement** : si commande annulée ou litige, status = refunded, et la plateforme gère le reversement client (hors scope technique détaillé ici).

Les **règles de commission** (partenaires, admin plateforme) peuvent réutiliser la logique déjà prévue pour les réalisations des artisans (projets), étendue aux commandes marketplace (ordre livré = réalisation).

---

## 5. Interface admin : pilotage et paramètres

Tout doit être **pilotable et administrable** depuis l’interface admin.

### 5.1 Paramètres généraux (configuration)

- **Activation du paiement séquestré** : activer / désactiver l’option « Paiement à la commande (escrow) » pour le marketplace.
- **Modes de paiement proposés** : Wave, Orange Money, etc. (liste configurable).
- **Règles de commission** :
  - Commission plateforme (%) sur les commandes marketplace.
  - Répartition partenaires (chambres, SAE, etc.) selon l’artisan affilié — aligné sur l’existant.
- **Points relais** : CRUD des points relais (si on implémente le scénario point relais).

### 5.2 Pilotage des commandes et des escrows

- **Liste des commandes** (existant) : filtres par statut, par mode de paiement (escrow / à la livraison), par artisan.
- **Détail commande** : montant, statut, lien vers l’escrow associé (order_escrows), statut escrow (pending / held / released / refunded / frozen).
- **Actions admin sur l’escrow** :
  - **Débloquer** : passer l’escrow en « released » et enregistrer le déblocage vers l’artisan (après calcul des commissions).
  - **Rembourser** : passer en « refunded », initier le remboursement client.
  - **Geler** : passer en « frozen » en cas de litige ou contrôle.
- **Historique** : qui a débloqué / remboursé / gelé, à quelle date (audit log).

### 5.3 Tableau de bord et reporting

- Montants séquestrés (total en « held »).
- Montants débloqués par période (artisan, plateforme, partenaires).
- Commandes en attente de déblocage (livrées mais pas encore released).

---

## 6. Parcours client et artisan (résumé)

- **Client** :
  - Choisit le mode de paiement à la commande (escrow) ou à la livraison (si proposé).
  - Si escrow : après création de la commande, redirection vers paiement (Wave / OM) ; une fois payé, statut escrow → held.
  - Suit la commande (détail commande) ; pas d’action de déblocage (côté plateforme / artisan).
- **Artisan** :
  - Voit les commandes (ce qui m’a été commandé) ; pour les commandes en escrow, voit que le client a payé (statut held).
  - Confirme → Expédie → Marque livrée (ou point relais marqué « retiré »).
  - Le déblocage est déclenché (automatique ou manuel admin) ; l’artisan reçoit son montant net (hors commission).

---

## 7. Alternative : hybride sans escrow technique

Si l’intégration paiement (Wave / OM) est lourde au début :

- **Option « paiement à la livraison »** : inchangée (pas d’escrow).
- **Option « paiement à la commande »** : le client paie par lien Wave / OM **hors app**, et un opérateur admin (ou un webhook si disponible) marque la commande comme « payée » et enregistre la référence. La plateforme ne séquestre pas réellement les fonds mais **trace** le paiement et le déblocage « logique » vers l’artisan (pour commissions et reporting). On peut introduire plus tard la vraie séquestration (compte plateforme, API paiement).

---

## 8. Plan d’implémentation suggéré

| Priorité | Tâche | Portée |
|----------|--------|--------|
| 1 | Documenter et valider ce schéma avec la partie métier | Doc (ce fichier) |
| 2 | Ajouter `payment_mode` et champs livraison sur `orders` | Migration |
| 3 | Créer table `order_escrows` + RLS + politiques | Migration |
| 4 | Admin : écran paramètres (activation escrow, commissions) | Front admin |
| 5 | Admin : liste/détail commandes + statut escrow + actions (débloquer, rembourser, geler) | Front admin |
| 6 | Client : choix du mode de paiement au checkout (escrow vs à la livraison) | Front |
| 7 | Intégration paiement (Wave / OM) : création lien paiement, webhook « payé » → escrow held | Backend + Front |
| 8 | Règles de déblocage : automatique à la livraison ou manuel admin | Backend |
| 9 | Points relais (tables + admin + choix au checkout) | Évolution |

---

## 9. Résumé

- **Séquestration** : réutilisation de la logique escrow (comme pour les projets), avec une table **order_escrows** dédiée au marketplace.
- **Scénarios** : paiement à la commande (escrow), paiement à la livraison (actuel), et à terme paiement + point relais.
- **Admin** : tout est pilotable — activation des modes, règles de commission, liste/détail des commandes, statut des escrows, actions de déblocage / remboursement / gel, et à terme gestion des points relais.
- **Alternative** : en attendant l’intégration paiement complète, un mode « paiement à la commande » en mode dégradé (saisie manuelle du paiement côté admin) permet d’aligner déjà les processus et le reporting sur ce modèle.

Ce document sert de base pour les choix techniques (migrations, API) et pour le pilotage depuis l’interface admin.
