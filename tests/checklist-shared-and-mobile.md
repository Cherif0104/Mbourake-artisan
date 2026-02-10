# Checklist : non-régression web et app mobile partagée

Cette checklist permet de vérifier qu’après des changements dans le module **shared/** ou dans les hooks web qui l’utilisent, la version web en production (Vercel) et l’app mobile restent cohérentes.

## Avant tout déploiement web (Vercel)

- [ ] **Build web** : `npm run build` à la racine se termine sans erreur.
- [ ] **Types** : aucun import depuis `src/types/database.types` pour la logique partagée ; tout passe par `@shared` (ou `shared/`) pour les types DB.
- [ ] **Auth** : connexion (email/mot de passe) et déconnexion fonctionnent ; redirection après login OK.
- [ ] **Projets** : création d’un projet, liste des projets client, ouverture d’un détail projet.
- [ ] **Devis** : acceptation d’un devis, passage du projet en « quote_accepted ».
- [ ] **Escrow** : calcul des montants (commission, TVA, avance), création escrow, confirmation dépôt, déblocage avance / solde.
- [ ] **Chat** : envoi et réception de messages (temps réel) sur un projet.
- [ ] **Profil** : chargement et mise à jour du profil (client/artisan).

## Après modification du module shared/

- [ ] Les **services** dans `shared/lib/` restent sans dépendance à `window`, `localStorage` ou à des APIs web uniquement.
- [ ] Les **hooks web** (`src/hooks/`) qui appellent les services partagés continuent à recevoir les mêmes données (pas de régression sur les types ou le comportement).
- [ ] **useEscrow** : les écrans qui utilisent `calculateEscrow` ou les actions escrow (ProjectPaymentPage, ProjectDetailsPage, etc.) se comportent comme avant.

## App mobile (optionnel avant release mobile)

- [ ] **Lancement** : `cd mobile && npm install && npm start` puis `npm run android` (ou `ios`) sans erreur.
- [ ] **Auth mobile** : connexion avec les mêmes identifiants que le web (même Supabase).
- [ ] **Projets** : liste des projets du même utilisateur que sur le web.
- [ ] **Chat** : envoi d’un message depuis l’app mobile ; réception visible sur le web (ou l’inverse) si même projet.

## Commandes utiles

```bash
# Racine : build web
npm run build

# Mobile : lint (si configuré)
cd mobile && npm run lint
```

En cas de doute sur un flux métier (escrow, statuts projet, devis), exécuter le scénario manuellement sur l’app web avant et après la modification.
