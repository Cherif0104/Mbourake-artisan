# Téléchargement APK Android

Placez ici le fichier **mbourake.apk** (APK release signé généré avec Android Studio) pour que le bouton « Télécharger l'app Android » du site propose le téléchargement direct.

- **Fichier attendu** : `mbourake.apk`
- **Lien après déploiement Vercel** : **https://www.mbourake.com/download/mbourake.apk**

**Important** : Sans ce fichier, le lien renvoie une erreur 404 (et non plus une fausse page en .apk). Si des utilisateurs avaient auparavant l’erreur Android « Un problème est survenu lors de l’analyse du package », c’était parce que le serveur renvoyait la page HTML au lieu de l’APK. Désormais, tant que l’APK n’est pas présent, ils verront une 404 dans le navigateur.

Après avoir ajouté `mbourake.apk` dans ce dossier et poussé sur GitHub, le prochain déploiement Vercel rendra le lien actif. Chaque nouvelle version : remplacez le fichier, commitez, poussez.

Voir `docs/GUIDE_ANDROID_PLAY_STORE.md`, section « Téléchargement direct (sans Play Store) », pour la génération de l’APK.
