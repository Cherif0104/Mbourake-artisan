# Diagnostic des overlays de chargement — Mbourake

## Résumé exécutif

Les overlays de chargement présentent des **conflits** et une **impression de bug** lors des refresh et transitions : double overlay enchaîné ou superposé, chargements peu propres.

---

## 1. Inventaire des overlays

### 1.1 Composant principal : `LoadingOverlay`

- **Emplacement** : `src/components/LoadingOverlay.tsx`
- **Props actuelles** : `className`, `contentOnly`
- **Props utilisées mais non supportées** : `visible`, `message` (ignorées)

### 1.2 Couches d’overlay (du plus haut niveau au plus bas)

| Couche | Composant | Rôle | Conflit potentiel |
|--------|-----------|------|-------------------|
| 1 | **PageTransition** | Overlay global lors des changements de route (500 ms fixe) | Peut se superposer à l’overlay des pages |
| 2 | **AdminRoute** | Overlay pendant auth / profil / permissions | Enchaînement avec DashboardGate ou pages admin |
| 3 | **DashboardGate** | Overlay pendant redirection admin → /admin | Enchaînement avec AdminRoute |
| 4 | **RequireNotSuspended** | Overlay pendant chargement profil (PrivateRoute) | Enchaînement avec Dashboard, pages protégées |
| 5 | **ChambreMetierRoute** | Spinner custom (pas LoadingOverlay) | Incohérence visuelle |
| 6 | **Pages individuelles** | ~35 pages avec `return <LoadingOverlay />` ou `visible={loading}` | Double overlay avec PageTransition |

### 1.3 Pages avec overlay inline (prop `visible`)

- `AdminOrganisations`, `AdminRoles`, `AdminDepartments`, `AdminTeams`
- **Problème** : `visible` n’est pas géré → overlay toujours affiché, contenu bloqué

---

## 2. Causes des conflits

### 2.1 Double overlay enchaîné

1. L’utilisateur navigue (ex. Dashboard → Artisans).
2. **PageTransition** affiche un overlay pendant 500 ms.
3. **ArtisansPage** monte et affiche son propre overlay pendant le chargement des données.
4. À 500 ms, PageTransition disparaît.
5. L’overlay d’ArtisansPage reste visible jusqu’à la fin du chargement.
6. **Résultat** : deux overlays successifs, impression de bug.

### 2.2 Double overlay superposé

1. PageTransition et la page cible affichent tous deux un overlay.
2. Les deux sont en `fixed`, `z-index: 9999`.
3. Ils se superposent visuellement (même design, mais deux instances).

### 2.3 Liste incomplète de routes exclues de PageTransition

`ROUTES_WITH_OWN_LOADING` ne contient que 7 entrées :

- `/dashboard`, `/revisions`, `/projects/`, `/credits`, `/verification`, `/edit-profile`, `/conversations`, `/notifications`

Alors que **plus de 30 routes** ont leur propre overlay. Les autres routes subissent donc le double overlay.

### 2.4 Refresh

- **PrivateRoute** → **RequireNotSuspended** (overlay si `profileLoading`) → **Dashboard** (overlay si `auth.loading || profileLoading || loading`).
- Plusieurs couches peuvent s’enchaîner rapidement, donnant une impression de conflit ou de redirection.

---

## 3. Ce qu’une équipe multi-expertise ferait

### 3.1 Architecture cible (idéal)

1. **Un seul overlay global** : contexte `LoadingContext` avec `isLoading` et `message`.
2. **Une seule instance** de LoadingOverlay au niveau App.
3. Les pages et routes enregistrent leur état de chargement dans ce contexte.
4. Transitions fluides (fade in/out) avec délai minimum pour éviter les clignotements.

### 3.2 Approche pragmatique (minimal, sans refonte)

1. **LoadingOverlay** : ajouter les props `visible` (défaut `true`) et `message` (optionnel).
2. **PageTransition** : étendre `ROUTES_WITH_OWN_LOADING` pour couvrir toutes les routes qui ont leur propre overlay.
3. **AdminOrganisations, AdminRoles, AdminDepartments, AdminTeams** : utiliser correctement `visible={loading}`.
4. **Transitions** : réduire la durée de PageTransition (300 ms) pour les rares routes où il reste affiché.

---

## 4. Corrections appliquées

- [x] **LoadingOverlay** : support de `visible` (défaut `true`) et `message` (optionnel)
- [x] **PageTransition** : liste étendue des routes exclues (27 routes) + durée réduite (350 ms au lieu de 500 ms)
- [x] **Pages admin** (Organisations, Roles, Departments, Teams) : `visible={loading}` fonctionne désormais correctement
- [x] **ChambreMetierRoute** et **PartnerRoute** : utilisation de LoadingOverlay au lieu du spinner custom (cohérence visuelle)
- [x] **PrivateRoute** : overlay explicite pendant `auth.loading` pour éviter tout flash
