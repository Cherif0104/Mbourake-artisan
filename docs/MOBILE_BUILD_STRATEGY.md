# Stratégie de build et distribution mobile (Mbourake)

L’application mobile (dossier `mobile/`) est développée en parallèle de l’app web. Le déploiement et la distribution mobiles sont **indépendants** de Vercel et du pipeline web.

## Principes

- **Vercel** : sert uniquement l’app web (Vite), build `npm run build`, output `dist/`. Le dossier `mobile/` n’est pas inclus dans ce build.
- **Mobile** : build et distribution gérés séparément (CI dédiée ou builds manuels), sans impacter la prod web.

## Build local (développement et tests)

- **Android**  
  - Prérequis : SDK Android, émulateur ou appareil connecté.  
  - Depuis la racine : `npm run mobile:android`  
  - Ou depuis `mobile/` : `npm start` (Metro) puis dans un autre terminal `npm run android`.

- **iOS** (macOS uniquement)  
  - Prérequis : Xcode, CocoaPods (`bundle install` puis `bundle exec pod install` dans `mobile/ios` si besoin).  
  - Depuis la racine : `npm run mobile:ios`  
  - Ou depuis `mobile/` : `npm run ios`.

Les binaires générés (APK debug, build iOS) sont locaux et ne sont pas déployés automatiquement.

## Build de release (à mettre en place)

- **Android**  
  - Génération d’un AAB/APK de release : configuration des signing configs dans `android/app/build.gradle`, puis commande de build release (ex. `./gradlew assembleRelease`).  
  - Option : utiliser un service de build cloud (EAS Build, Bitrise, GitHub Actions, etc.) dans un **workflow séparé** du déploiement Vercel, en ciblant uniquement le dossier `mobile/` et les secrets dédiés (keystore, credentials).

- **iOS**  
  - Archive et export via Xcode ou `xcodebuild`, avec certificats et profils de provisioning.  
  - Même idée : pipeline dédié (EAS, Bitrise, etc.) qui ne touche pas au repo web ni à Vercel.

## Distribution

- **Stores** : soumission manuelle ou via outil (ex. EAS Submit, Fastlane) vers Google Play et App Store.  
- **CI/CD** : ajouter si besoin un workflow (ex. `.github/workflows/mobile-build.yml`) qui :  
  - part du même repo ;  
  - ne déclenche **pas** le déploiement Vercel ;  
  - build uniquement l’app mobile (Android et/ou iOS) ;  
  - utilise des secrets et variables d’environnement propres au mobile (Supabase, signing, etc.).

## Résumé

| Cible       | Où build / déployer | Outil typique              |
|------------|----------------------|----------------------------|
| Web prod   | Vercel               | `npm run build`, output `dist/` |
| Android    | En local ou CI dédiée | Gradle, EAS, Bitrise, etc. |
| iOS        | En local ou CI dédiée | Xcode, EAS, Bitrise, etc.  |

En gardant ces pipelines distincts, les évolutions du module `shared/` et de l’app mobile n’impactent pas la version web déjà en production.
