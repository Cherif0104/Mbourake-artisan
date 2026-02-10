# Guide : de ton PC au Google Play Store

Instructions claires pour publier l’app Mbourake (Capacitor) sur le Google Play Store, depuis ton ordinateur avec Android Studio.

---

## 1. Prérequis sur ton PC

- **Android Studio** installé : https://developer.android.com/studio  
- **JDK 17** : en général fourni avec Android Studio (sinon : Oracle JDK 17 ou Microsoft OpenJDK 17).  
- **Compte Google** pour le Play Console.

---

## 2. Build de l’app et sync Capacitor (terminal)

À la **racine** du projet (`D:\DEVLAB & DEVOPS\Mbourake`) :

```powershell
cd "D:\DEVLAB & DEVOPS\Mbourake"
npm run cap:sync
```

Si tu as modifié le site, refais cette commande avant chaque nouveau build Android.

---

## 3. Ouvrir le projet dans Android Studio

- **Option A** : dans le même terminal :
  ```powershell
  node ./node_modules/@capacitor/cli/bin/capacitor open android
  ```
- **Option B** : Android Studio → **Fichier** → **Ouvrir** → sélectionner le dossier **`android`** à la racine du projet.

En cas d’erreurs liées au chemin (ex. dossier avec **&**), copier tout le projet dans un dossier sans **&**, ex. `D:\Mbourake`, puis ouvrir **ce** dossier dans Android Studio.

---

## 4. Générer le bundle signé (AAB) pour le Play Store

Dans Android Studio :

1. **Build** → **Generate Signed Bundle / APK**  
2. Choisir **Android App Bundle** → **Next**  
3. **Create new** (première fois) pour créer un keystore :
   - **Key store path** : ex. `D:\Mbourake\mbourake-release.keystore` (créer le fichier)
   - **Password** et **Confirm** : mot de passe fort (à noter et conserver)
   - **Alias** : ex. `mbourake`
   - **Validity** : ex. 25 ans
   - **Certificate** : prénom, nom, organisation, ville, pays
   - **Create**  
4. Choisir ce keystore → **Next**  
5. **Build Variants** : **release**  
6. **Create**

Le fichier **`.aab`** est généré (souvent dans `android/app/release/app-release.aab`).  
**Important** : garde le fichier `.keystore` et les mots de passe en lieu sûr ; ils servent pour toutes les mises à jour sur le Play Store.

---

## 5. Créer l’application sur le Google Play Console

1. Aller sur : https://play.google.com/console  
2. Se connecter avec le compte Google (inscription développeur, environ 25 USD une fois, si pas déjà fait).  
3. **Créer une application** → nom **Mbourake** → par défaut ou sans Play App Signing si tu gères toi‑même la signature.  
4. Remplir la **fiche de la fiche de l’application** :
   - Titre court
   - Description courte et longue
   - Icône 512×512, image de bannière (1024×500)
   - Captures d’écran (téléphone, 2 à 8)
   - **Politique de confidentialité** : URL (ex. page sur ton site ou hébergée ailleurs)
   - Classification du contenu, public cible, pays, etc.

---

## 6. Publier la version (déploiement)

1. Dans le Play Console, menu **Production** (ou **Tests internes** pour tester d’abord).  
2. **Créer une version** (ou **Gérer** puis **Créer une version**).  
3. **Télécharger** le fichier **.aab** généré à l’étape 4.  
4. Renseigner les **notes de version** (ce qui change pour les utilisateurs).  
5. **Enregistrer** puis **Vérifier la version** / **Soumettre pour examen**.

Une fois la version validée par Google (souvent 1 à 3 jours), tu peux la **mettre en production** depuis la même page.

---

## Téléchargement direct (sans Play Store)

Tu peux proposer l’app en **téléchargement direct** depuis ton site (APK), sans passer par le Play Store.

### 1. Générer un APK signé

Dans Android Studio, comme pour l’AAB :

1. **Build** → **Generate Signed Bundle / APK**
2. Choisir **APK** (et non Android App Bundle) → **Next**
3. Sélectionner le même keystore que pour le Play Store → **Next**
4. **Build Variants** : **release** → **Create**

L’APK est généré (ex. `android/app/release/app-release.apk`). Renomme-le en `mbourake.apk` si tu veux.

### 2. Héberger l’APK

- **Option A – Sur le site (Vercel)**  
  Place le fichier dans `public/download/mbourake.apk`. Après déploiement, l’URL sera :  
  `https://ton-domaine.com/download/mbourake.apk`  
  (Vercel peut avoir une limite de taille pour les fichiers ; pour un APK ~30–80 Mo, vérifier le plan.)

- **Option B – Stockage externe (recommandé pour gros fichiers)**  
  Héberge l’APK sur Supabase Storage (bucket public), un CDN ou un autre hébergeur. Récupère l’URL publique du fichier.

### 3. Configurer l’URL sur le site

- Si l’APK est sur ton site : rien à faire, le bouton « Télécharger l’app Android » utilise par défaut `/download/mbourake.apk`.
- Si l’APK est ailleurs : dans ton fichier `.env` (et dans les variables d’environnement Vercel), ajoute :  
  `VITE_ANDROID_APK_URL=https://ton-url-publique.com/mbourake.apk`

Le bouton et la popup de téléchargement sont déjà sur la **page d’accueil** (navbar et footer).

---

## Récapitulatif

| Étape | Où | Action |
|--------|-----|--------|
| 1 | PC | Android Studio + JDK installés |
| 2 | Terminal (racine projet) | `npm run cap:sync` |
| 3 | PC | Ouvrir le dossier `android` dans Android Studio |
| 4 | Android Studio | Build → Generate Signed Bundle → AAB (keystore créé et sauvegardé) |
| 5 | play.google.com/console | Créer l’app, fiche, captures, politique de confidentialité |
| 6 | Play Console | Production → Créer version → Upload .aab → Notes de version → Soumettre |

Après approbation Google, l’app est disponible sur le **Google Play Store**.

---

## Dépannage : Gradle « Read timed out »

Si Android Studio affiche **Could not install Gradle distribution** avec **Read timed out** :

1. **Connexion** : vérifier la connexion internet (Wi‑Fi stable, pas de VPN bloquant).
2. **Réessayer** : le délai de téléchargement Gradle a été porté à 2 minutes dans le projet ; **Fichier** → **Sync Project with Gradle Files** (ou l’icône éléphant avec flèche).
3. **Copier le projet sans « & »** : le chemin `D:\DEVLAB & DEVOPS\...` peut poser problème. Copier tout le repo dans `D:\Mbourake`, ouvrir **ce** dossier dans Android Studio et refaire la sync.
4. **Téléchargement manuel** : télécharger Gradle 8.11.1 (https://services.gradle.org/distributions/gradle-8.11.1-all.zip), placer le zip dans `C:\Users\TonUser\.gradle\wrapper\dists\gradle-8.11.1-all\` (créer le dossier si besoin), puis relancer la sync.
