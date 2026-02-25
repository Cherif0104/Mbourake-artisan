# Ajustements rapides – App Android (React Native)

La web app est en production ; l’app Android native (`mobile/`) est en cours de développement. Ce document liste les **ajustements rapides** à faire pour améliorer la cohérence et la qualité perçue.

---

## ✅ Déjà corrigé dans le code

- **Écran de chargement au démarrage** : plus d’écran blanc (`return null`) pendant la vérification de session ; un écran de chargement dédié s’affiche.

---

## À faire en priorité

### 1. **Environnement / build**

- [ ] **Fichier `.env`** : créer `mobile/.env` à partir de `mobile/env.example` avec les vraies valeurs `SUPABASE_URL` et `SUPABASE_ANON_KEY` (les mêmes que la web app prod). Ne pas commiter `.env`.
- [ ] **Release Android** : pour publier sur le Play Store, configurer un keystore de release dans `mobile/android/app/build.gradle` (signingConfigs.release) et ne plus utiliser le debug keystore en release. Voir [Signed APK Android](https://reactnative.dev/docs/signed-apk-android).

### 2. **UX / écrans**

- [ ] **Auth** : ajouter un lien « Pas encore de compte ? S’inscrire » / « Déjà un compte ? Se connecter » pour basculer entre login et signup sans revenir à l’écran rôle.
- [ ] **Dashboard** : aligner les actions avec la web (ex. accès rapide à « Créer un projet », « Révisions », « Notifications » si ces flux existent en mobile).
- [ ] **Safe area** : vérifier que tous les écrans respectent les safe areas (notch, barre de navigation) sur les appareils récents.

### 3. **Cohérence avec la prod web**

- [ ] **Nom / marque** : vérifier que le nom affiché dans l’app (titres, splash si vous en ajoutez un) est bien « MboURAKE » ou le nom de prod.
- [ ] **URL / API** : s’assurer que `SUPABASE_URL` et `SUPABASE_ANON_KEY` pointent vers la **même** instance Supabase que la web app en production (même données, même auth).

### 4. **Technique**

- [ ] **Gestion d’erreurs** : afficher un message clair si Supabase n’est pas configuré (`.env` manquant ou invalide) au lieu d’un crash ou écran vide.
- [ ] **Deep links** (optionnel) : si la web utilise des liens du type `https://.../projects/123`, prévoir à terme des deep links Android pour ouvrir directement un projet dans l’app.

---

## Écrans / fonctionnalités web pas encore en mobile

Pour référence, sans tout implémenter tout de suite :

| Web (prod) | Mobile (état actuel) |
|------------|----------------------|
| Landing, À propos, Artisans, Favoris, Catégories | Non (app centrée utilisateur connecté) |
| Créer un projet, Détails, Paiement, Suivi, Travaux, Clôture | Partiellement (Dashboard, ProjectList, ProjectDetails, Payment, Work, Completion, Chat) |
| Révisions, Réponse révision | À ajouter si besoin |
| Crédits, Vérification, Profil, Dépenses, Factures | À ajouter si besoin |
| Conversations, Notifications | À ajouter si besoin |
| Admin (dashboard, users, projects, etc.) | Non (souvent réservé au web) |

Vous pouvez prioriser selon l’usage réel (ex. révisions et notifications en premier).

---

## Commandes utiles

- Depuis la racine : `npm run mobile:android` (sync env + lance Android).
- Depuis `mobile/` : `npm start` (Metro), puis dans un autre terminal `npm run android`.
- Build release (après config du keystore) : depuis `mobile/android` → `./gradlew assembleRelease`.

Une fois ces ajustements faits, l’app Android sera plus alignée avec la prod web et plus prête pour des tests utilisateurs ou une première mise en store.
