# Icônes PWA - Mbourake

## ⚠️ Obligatoire pour le déploiement

Le `manifest.json` utilise **fond blanc** (`background_color: #FFFFFF`) et attend les fichiers suivants dans ce dossier :

- **`icon-192.png`** (192×192 px) – utilisée par la PWA et `apple-touch-icon`
- **`icon-512.png`** (512×512 px) – splash / partage réseau / PWA

**Contenu des icônes :** fond **blanc** (#FFFFFF) avec le **logo Mbourake** (ex. `src/pages/LOGO MboURAKE.png`) centré. Pas de fond noir sur l’icône.

Si ces fichiers sont absents, l’installation PWA et le partage de lien peuvent afficher une icône par défaut ou cassée. Générez-les (Figma, GIMP, PWA Builder, etc.) puis placez-les ici.

## 📋 Tailles optionnelles (bonus)

- `icon-72x72.png` - Android (petite)
- `icon-96x96.png` - Android (moyenne)
- `icon-128x128.png` - Android (moyenne)
- `icon-144x144.png` - Windows (moyenne)
- `icon-152x152.png` - iOS (iPad)
- `icon-384x384.png` - Android (très grande)

## 🎨 Design recommandé

- **Fond** : Blanc (#FFFFFF) pour l’icône PWA installée
- **Logo** : Logo Mbourake (deux triangles / identité visuelle) centré
- **Style** : Moderne, épuré, lisible en petite taille

## 🛠️ Outils pour générer les icônes

1. **En ligne** : https://www.pwabuilder.com/imageGenerator
2. **En ligne** : https://realfavicongenerator.net/
3. **Local** : Utiliser un outil comme ImageMagick ou un éditeur d'images

## 📝 Note

Les icônes doivent être au format PNG avec transparence si nécessaire.
Les icônes maskable (192x192 et 512x512) doivent avoir un padding de sécurité de 20% pour éviter que le contenu soit coupé sur certains appareils.
