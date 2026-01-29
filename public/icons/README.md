# Icône PWA – Mbourake

## Icône personnalisée « Mbouraké avec services intégrés »

L’icône affichée sur l’écran d’accueil (PWA installée sur mobile) est l’image **« Mbouraké avec services intégrés »** : pin, poignée de main, outils, dégradé orange/vert, texte « Mbouraké ».

**À faire :** enregistrez cette image dans ce dossier sous le nom :

- **`icon-mbourake.png`**

**Recommandations :**
- Taille **512×512 px** minimum (carré).
- Format **PNG**.
- Le navigateur et l’OS redimensionnent pour 192 px ; une seule fichier 512×512 suffit.

Une fois `icon-mbourake.png` présent dans `public/icons/`, il sera utilisé par le `manifest.json` et en `apple-touch-icon` pour l’installation PWA sur mobile.

## Fallback

Si `icon-mbourake.png` est absent, le manifest utilise `logo-senegel.png` à la racine du site comme icône de secours.
