# Mbourake — Mobile natif (100 % mobile)

Ce dossier est dédié à la **partie 100 % mobile** de Mbourake : **versions natives** iOS et Android.

## Objectif

- Centraliser ici tout le développement **mobile natif** (hors PWA / web).
- Focalisation de l’équipe sur les applications natives (React Native, ou natif pur selon choix technique).

## Contexte du dépôt

- **`src/`** : application web (Vite + React) et PWA.
- **`android/`** (racine) : projet Capacitor (wrapper PWA → APK).
- **`mobile/`** : application React Native existante (Android + iOS).
- **`mobile-native/`** (ce dossier) : espace dédié au mobile natif — à utiliser comme **référentiel unique** pour les versions natives (migration, consolidation ou nouveau projet selon la roadmap).

## Prochaines étapes

1. Décider du stack : conserver / migrer le projet React Native de `mobile/` ici, ou repartir sur un nouveau projet dans `mobile-native/`.
2. Aligner la CI/CD et la distribution (stores) sur ce dossier.
3. Partager les types et la config Supabase avec le reste du monorepo (`shared/`, variables d’environnement).

---

*Créé après nettoyage de l’approche backoffice Odoo/Lazard et recentrage sur le mobile natif.*
