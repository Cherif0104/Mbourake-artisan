# Répertoire des barres sticky (headers)

Toutes les barres en haut de page sont en **sticky top-0** et **z-40** (ou z-50) pour rester **verrouillées en haut** : tant que l’utilisateur n’a pas défilé, la barre ne descend pas ; au scroll, elle reste collée en haut du viewport.

## Convention

- **sticky top-0** : la barre reste en haut lors du défilement.
- **z-40** (ou z-50 pour landing/admin) : au-dessus du contenu, sous les modales (z-50).
- Aucune autre partie du layout n’est modifiée.

---

## Pages publiques / onboarding

| Page | Fichier | Barre |
|------|---------|--------|
| Landing | `LandingPage.tsx` | `sticky top-0 z-50` |
| Artisans (liste) | `ArtisansPage.tsx` | `sticky top-0 z-50` |
| Artisan (profil public) | `ArtisanPublicProfilePage.tsx` | `sticky top-0 z-40` |
| Catégorie | `CategoryPage.tsx` | `sticky top-0 z-50` |
| À propos | `AboutPage.tsx` | `sticky top-0 z-50` |
| Aide | `AidePage.tsx` | `sticky top-0 z-40` |
| Vérification | `VerificationPage.tsx` | `sticky top-0 z-40` |

---

## Client / projets

| Page | Fichier | Barre |
|------|---------|--------|
| Publier un projet | `CreateProjectPage.tsx` | `sticky top-0 z-40` |
| Détail projet | `ProjectDetailsPage.tsx` | `sticky top-0 z-40` |
| Paiement projet | `ProjectPaymentPage.tsx` | `sticky top-0 z-40` |
| En attente paiement | `ProjectAwaitingPaymentPage.tsx` | `sticky top-0 z-40` |
| Merci | `ProjectThankYouPage.tsx` | `sticky top-0 z-40` |
| Travaux en cours | `ProjectWorkPage.tsx` | `sticky top-0 z-40` |
| Complétion | `ProjectCompletionPage.tsx` | `sticky top-0 z-40` |
| Révisions | `RevisionsPage.tsx` | `sticky top-0 z-40` |
| Demande révision | `RequestRevisionPage.tsx` | `sticky top-0 z-40` |
| Réponse révision | `RevisionResponsePage.tsx` | `sticky top-0 z-40` |

---

## Messagerie / notifs

| Page | Fichier | Barre |
|------|---------|--------|
| Chat | `ChatPage.tsx` | `sticky top-0 z-10` → z-40 |
| Conversations | `ConversationsPage.tsx` | `sticky top-0 z-30` → z-40 |
| Notifications | `NotificationsPage.tsx` | `sticky top-0 z-30` → z-40 |

---

## Dashboard / compte

| Page | Fichier | Barre |
|------|---------|--------|
| Dashboard | `Dashboard.tsx` | `sticky top-0 z-40` |
| Profil | `ProfilePage.tsx` | `sticky top-0 z-40` |
| Modifier profil | `EditProfilePage.tsx` | `sticky top-0 z-40` |
| Paramètres | `SettingsPage.tsx` | `sticky top-0 z-40` |
| Favoris | `FavoritesPage.tsx` | `sticky top-0 z-40` |

---

## Marketplace / boutique

| Page | Fichier | Barre |
|------|---------|--------|
| Marketplace | `MarketplacePage.tsx` | `sticky top-0 z-20` → z-40 |
| Fiche produit | `MarketplaceProductPage.tsx` | `sticky top-0 z-10` → z-40 |
| Checkout | `MarketplaceCheckoutPage.tsx` | `sticky top-0 z-10` → z-40 |
| Panier | `PanierPage.tsx` | `sticky top-0 z-20` → z-40 |
| Mes produits | `MyProductsPage.tsx` | `sticky top-0 z-20` → z-40 |
| Mes commandes (shop) | `MyShopOrdersPage.tsx` | `sticky top-0 z-20` → z-40 |

---

## Facturation / crédits / dépenses

| Page | Fichier | Barre |
|------|---------|--------|
| Factures | `InvoicesPage.tsx` | `sticky top-0 z-40` |
| Crédits | `CreditsPage.tsx` | `sticky top-0 z-40` |
| Dépenses | `ExpensesPage.tsx` | `sticky top-0 z-40` |

---

## Artisan

| Page | Fichier | Barre |
|------|---------|--------|
| Avis reçus | `AvisRecusPage.tsx` | `sticky top-0 z-40` |
| Mes certifications | `MyCertificationsPage.tsx` | `sticky top-0 z-40` |
| Mes commandes | `MyOrdersPage.tsx` | `sticky top-0 z-40` |

---

## Admin / chambre

| Page | Fichier | Barre |
|------|---------|--------|
| Admin dashboard | `admin/AdminDashboard.tsx` | `sticky top-0 z-40` |
| Admin vérifications | `AdminVerifications.tsx` | (bloc sticky dans modal) |
| Admin litiges | `AdminDisputes.tsx` | (bloc sticky dans modal) |
| Chambre dashboard | `ChambreDashboardPage.tsx` | `sticky top-0 z-40` |

---

## Autres composants (fixed, pas sticky)

| Composant | Rôle |
|-----------|------|
| `Toast.tsx` | Toasts en `fixed top-4 right-4 z-50` |
| `OfflineBanner.tsx` | Bandeau connexion en `fixed top-0 z-50` |

---

*Dernière mise à jour : uniformisation z-index (z-10/z-20/z-30 → z-40) pour toutes les barres de page, sans toucher au reste du layout.*
