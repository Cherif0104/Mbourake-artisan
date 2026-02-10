# Publier Mbourake sur le Google Play Store (Android)

L’app Android est générée avec **Capacitor** à partir de l’app web (Vite/React). Une seule base de code : le site = l’app.

---

## Prérequis

- **Node.js** : déjà en place pour le projet.
- **Android Studio** : à installer pour construire le bundle (AAB) et le signer.
  - Téléchargement : https://developer.android.com/studio

---

## Commandes utiles (à la racine du projet)

| Commande | Description |
|----------|-------------|
| `npm run build` | Build de l’app web → dossier `dist/` |
| `npm run cap:sync` | Build + copie de `dist/` dans le projet Android + sync Capacitor |
| `npm run cap:android` | Build + sync + ouverture du projet Android dans Android Studio |

Après une modification du site, relancer **`npm run cap:sync`** avant de reconstruire l’app dans Android Studio.

---

## Ouvrir le projet Android

- À la racine : **`npm run cap:android`** (ouvre Android Studio si installé).
- Ou dans Android Studio : **File → Open** → choisir le dossier **`android`** à la racine du repo.

---

## Générer le bundle pour le Play Store (AAB)

1. Ouvrir le projet **`android`** dans Android Studio.
2. **Build** → **Generate Signed Bundle / APK**.
3. Choisir **Android App Bundle** → **Next**.
4. Créer ou choisir un **keystore** (à conserver précieusement pour les mises à jour).
5. Renseigner mot de passe et alias, puis **Next**.
6. Sélectionner **release** → **Create**.

Le fichier **`.aab`** est créé (souvent dans `android/app/release/`). C’est ce fichier que vous uploadez sur la **Google Play Console**.

---

## Publier sur le Google Play Store

1. Créer un compte développeur : https://play.google.com/console (paiement unique).
2. Créer une nouvelle application, remplir fiche (titre, description, captures, icône, etc.).
3. Dans **Production** (ou **Tests**), **Créer une version** → upload du **.aab**.
4. Renseigner les notes de version, puis soumettre pour examen.

---

## Chemin du projet contenant « & »

Si le projet est dans un dossier du type **`D:\DEVLAB & DEVOPS\Mbourake`**, Gradle ou Android Studio peuvent parfois échouer à cause du **&**. Dans ce cas :

- Copier tout le projet dans un chemin **sans** `&`, par exemple **`D:\Mbourake`** ou **`D:\DEVLAB_DEVOPS\Mbourake`**.
- Ouvrir ce nouveau dossier dans Android Studio et lancer le build / la génération du AAB depuis là.

---

## Récapitulatif

- **App** : même code que le site (build web dans `dist/`).
- **Sync** : `npm run cap:sync` après chaque changement du site.
- **Build release** : Android Studio → Generate Signed Bundle → AAB.
- **Publication** : Google Play Console → upload du AAB.
