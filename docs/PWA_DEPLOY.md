# PWA et mises à jour

## Mise à jour automatique après déploiement

- Le **Service Worker** (`public/service-worker.js`) utilise `skipWaiting()` à l’installation : dès qu’une nouvelle version est téléchargée par le navigateur, elle prend le contrôle.
- L’app écoute l’événement `controllerchange` et recharge la page pour charger les nouveaux fichiers.
- **À chaque déploiement** (ex. push sur GitHub → Vercel), pensez à **bumper la version** dans `public/service-worker.js` (lignes 2-4) pour forcer le téléchargement d’un nouveau SW, par exemple :
  - `mbourake-v2.2.0` → `mbourake-v2.2.1` ou `mbourake-v2.3.0`

Sans changement de version, les utilisateurs peuvent continuer à voir l’ancienne version jusqu’au prochain rechargement naturel du SW par le navigateur.

## Télécharger sur mobile (footer)

Le bouton **« Télécharger sur mobile »** dans le footer de la landing page :
- Déclenche l’installation PWA (popup « Ajouter à l’écran d’accueil ») quand le navigateur le permet.
- Sinon, affiche une modale avec les instructions pour Android (Chrome) et iPhone (Safari).

## Notifications push

Les notifications in-app (cloche) sont gérées par Supabase et les entrées en base `notifications`. Les **notifications push** navigateur (hors app) nécessiteraient une configuration supplémentaire (VAPID, permission, backend push) et ne sont pas en place dans cette version.
