# Recommandation : flux des commandes marketplace

## Contexte

- **Projets** : flux bien défini (demande → devis → acceptation → paiement → travaux → finalisation).
- **Commandes** (marketplace) : flux partiellement en place, mais la suite après validation n’est pas clairement pensée.

---

## État actuel

| Étape | Client | Artisan |
|-------|--------|---------|
| 1. Découverte | Marketplace → produits | — |
| 2. Panier | Ajout au panier (localStorage) | — |
| 3. Checkout | 1 produit à la fois via `/marketplace/:id/checkout` | — |
| 4. Commande créée | Redirection vers My Orders | Notification ? |
| 5. Suite | Liste des commandes (statuts) | My Shop Orders ? |

**Limites actuelles :**
- Le panier peut contenir plusieurs articles, mais « Passer la commande » envoie uniquement vers le checkout du premier produit.
- Une commande = un produit (un artisan).
- Pas de vue détaillée d’une commande (client ou artisan).
- Pas de notifications explicites pour les commandes.
- Pas de suivi clair (préparation, expédition, livraison).

---

## Recommandation multi-expertise

### 1. Architecture des commandes

**Principe :** Une commande = un artisan. Si le panier contient des produits de plusieurs artisans, on crée une commande par artisan.

```
Panier : [Prod A (Artisan 1), Prod B (Artisan 1), Prod C (Artisan 2)]
→ Commande 1 : Artisan 1 (Prod A + B)
→ Commande 2 : Artisan 2 (Prod C)
```

**Implémentation :**
- Nouvelle RPC `create_marketplace_orders_from_cart` qui accepte un tableau d’items.
- Regroupement par `artisan_id`.
- Création d’une commande par artisan avec ses `order_items`.
- Vidage du panier après succès.

### 2. Parcours client

| Étape | Action | Écran |
|-------|--------|-------|
| 1 | Ajouter au panier (depuis marketplace ou fiche produit) | Marketplace |
| 2 | Voir le panier, ajuster quantités | Panier |
| 3 | Passer la commande | Checkout panier (nouveau) |
| 4 | Confirmation | Page « Merci » + redirection vers Mes commandes |
| 5 | Suivre la commande | Détail commande (nouveau) |
| 6 | Marquer comme livrée (optionnel) | Détail commande |

**Page Checkout panier :**
- Liste des articles groupés par artisan.
- Total par artisan et total global.
- Adresse de livraison (optionnelle).
- Bouton « Confirmer les commandes » → création des commandes → vidage du panier.

**Page Détail commande (client) :**
- Infos commande (date, statut, montant).
- Liste des articles.
- Coordonnées de l’artisan (téléphone, message).
- Historique des changements de statut.

### 3. Parcours artisan

| Étape | Action | Écran |
|-------|--------|-------|
| 1 | Réception de la commande | Notification + My Shop Orders |
| 2 | Consulter la commande | Détail commande (artisan) |
| 3 | Contacter le client | Téléphone / message |
| 4 | Préparer / expédier | Changer le statut |
| 5 | Marquer comme livrée | Changer le statut |

**Page Détail commande (artisan) :**
- Infos client (nom, téléphone, adresse).
- Liste des articles commandés.
- Boutons de changement de statut : Confirmée → En préparation → Expédiée → Livrée.

### 4. Cycle de vie des statuts

```
pending      → Commande reçue (création)
confirmed    → Artisan a confirmé (disponibilité, délais)
in_preparation → En cours de préparation
shipped     → Expédiée / remise au client
delivered   → Livrée
cancelled   → Annulée (client ou artisan)
```

**Transitions :**
- `pending` → `confirmed` : artisan
- `confirmed` → `in_preparation` : artisan (optionnel)
- `in_preparation` ou `confirmed` → `shipped` : artisan
- `shipped` → `delivered` : artisan ou client (selon politique)
- `pending` → `cancelled` : client ou artisan (avec motif si besoin)

### 5. Notifications

| Événement | Client | Artisan |
|-----------|--------|---------|
| Commande créée | — | Notification « Nouvelle commande de X » |
| Commande confirmée | Notification « Votre commande est confirmée » | — |
| Commande expédiée | Notification « Votre commande a été expédiée » | — |
| Commande livrée | Notification « Votre commande est livrée » | — |
| Commande annulée | Notification | Notification |

### 6. Modes de livraison / récupération

**À intégrer dès la commande :**

| Mode | Description | Qui gère |
|------|-------------|----------|
| **Récupération chez l'artisan** | Le client récupère le produit chez l'artisan (atelier, boutique) | Artisan |
| **Livraison par l'artisan** | L'artisan livre lui-même (délai, zone, prix à convenir) | Artisan |
| **Livraison Mbourake** *(futur)* | La structure organise la collecte et la livraison | Organisation |

**Champ à ajouter :** `delivery_mode` sur la commande : `pickup` \| `artisan_delivery` \| `mbourake_delivery`.

---

### 7. Système de livraison Mbourake (évolution business)

**Vision :** La structure propose un service de livraison administré, avec tarification et planification.

**Dakar — exemples de grille :**
- **Standard** : 24h à 48h — prix réduit (tarif de base)
- **Express / Instantané** : livraison rapide — tarif majoré (ex. ×2 ou demi-franc supplémentaire)
- La structure capitalise sur ce service (achat ou utilisation de véhicules pour ramassage + livraison)

**Modèle opérationnel :**
- Véhicule(s) de la structure (acquisition ou existants)
- **Ramassage** : tournée chez les artisans pour collecter les colis (planification hebdomadaire)
- **Livraison** : tournée chez les clients selon planification hebdomadaire bien définie
- **Planification** : interface admin pour définir zones, créneaux, tournées, délais
- Réflexion nécessaire sur la gestion des flux (qui collecte quoi, quand, ordre des tournées)

**Côté client / artisan :**
- Choix du mode à la commande (récupération, livraison artisan, livraison Mbourake)
- Si livraison Mbourake : affichage du délai et du coût
- Notifications aux étapes (collectée, en route, livrée)

**Côté admin :**
- Interface de gestion des tournées
- Liste des commandes à collecter / à livrer
- Planification des ramassages et livraisons
- Suivi des véhicules et chauffeurs (si applicable)

**Implémentation sans casser l'existant :**
- Ajouter `delivery_mode` et `delivery_fee` sur `orders`
- Nouveau module admin « Livraisons » (onglet ou section)
- Tables : `delivery_zones`, `delivery_slots`, `delivery_runs` (optionnel)
- Feature flag pour activer progressivement

---

### 8. Paiement

**Option A (actuelle) :** Paiement et livraison en dehors de la plateforme (Wave, Orange Money, main à main). L’artisan contacte le client pour convenir du paiement et de la livraison.

**Option B (évolution) :** Intégration paiement (Wave, Orange Money) dans l’app, avec encaissement différé ou commission.

**Recommandation courte terme :** Garder l’option A. La plateforme sert de catalogue et de suivi. Le paiement reste direct entre client et artisan.

### 9. Plan d’implémentation suggéré

| Priorité | Tâche | Effort |
|----------|-------|--------|
| P0 | Bouton « Ajouter au panier » sur le marketplace | ✅ Fait |
| P1 | Page Checkout panier (tous les articles) | Moyen |
| P2 | RPC création multi-commandes depuis le panier | Moyen |
| P3 | Page Détail commande (client + artisan) | Moyen |
| P4 | Notifications commandes (nouvelle, confirmée, etc.) | Faible |
| P5 | Transitions de statut côté artisan | Faible |
| P6 | Modes livraison (récupération, livraison artisan) | Faible |
| P7 | Système livraison Mbourake (admin, tournées) | Élevé |

---

## Résumé

Une équipe multi-expertise proposerait :

1. **Checkout panier** : une page dédiée qui crée une commande par artisan à partir du panier.
2. **Détail commande** : une page commune (client/artisan) pour voir et faire évoluer la commande.
3. **Statuts** : cycle simple pending → confirmed → shipped → delivered, avec annulation possible.
4. **Notifications** : à chaque changement important (nouvelle commande, confirmation, expédition, livraison).
5. **Paiement** : rester hors plateforme pour l’instant, avec contact direct client–artisan.
