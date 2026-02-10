## 📱 Application mobile Mbourake

Ce dossier contient l'application **mobile native** Mbourake, développée avec **React Native** (projet bare) et **TypeScript**.

L'application mobile est développée **en parallèle** de l'application web (Vite/React) et utilise **la même base de données Supabase**.  
Elle n'impacte **pas** le déploiement Vercel de la version web.

---

## 📁 Structure

- `mobile/` : projet React Native bare initialisé avec `@react-native-community/cli`
  - `App.tsx` : point d'entrée de l'application mobile
  - `android/`, `ios/` : projets natifs
  - `index.js`, `metro.config.js`, etc.

L'application web reste dans `src/` et continue d'être servie par Vite.

---

## ▶️ Lancer l'app mobile

**Important :** Les scripts `mobile:env`, `mobile:metro`, `mobile:android`, `mobile:ios` sont dans le **package.json à la racine** du projet. Il faut les exécuter depuis la racine (`D:\DEVLAB & DEVOPS\Mbourake`), **pas** depuis le dossier `mobile/`.

```bash
# À la racine du projet (pas dans mobile/)
npm install
cd mobile
npm install
cd ..
```

Ensuite, **toujours depuis la racine** :

```bash
npm run mobile:env        # synchronise le .env racine vers mobile/.env (une fois ou après changement du .env)
npm run mobile:metro      # lance Metro dans mobile/
npm run mobile:android    # build + run sur émulateur / appareil Android
# ou
npm run mobile:ios        # build + run sur simulateur iOS (sur macOS)
```

Si vous êtes déjà dans le dossier `mobile/`, vous pouvez synchroniser le .env avec `npm run env:sync`, puis pour Metro/Android revenez à la racine et utilisez `npm run mobile:metro` / `npm run mobile:android`.

> ⚠️ Prérequis : avoir configuré l'environnement React Native (SDK Android, émulateur ou device branché, Xcode si iOS).  
> Voir la doc officielle : https://reactnative.dev/docs/environment-setup

> 💡 **Chemin avec "&" (ex: `D:\DEVLAB & DEVOPS\Mbourake`)** : sous Windows, le `&` peut casser les commandes. Les scripts `mobile:metro` et `mobile:android` utilisent un launcher Node (`scripts/run-mobile.cjs`) qui évite ce problème. Si vous avez encore des erreurs, déplacer le projet dans un dossier sans `&` (ex: `D:\Mbourake`) est une solution fiable.

---

## 🌐 Connexion à Supabase

L'application mobile utilise la **même instance Supabase** que l'app web.

### Variables d'environnement (même .env que le web)

Le **.env à la racine** du repo (avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`) est utilisé pour l'app mobile via une synchronisation :

1. À la racine, lancez une fois (ou à chaque changement du .env) :
   ```bash
   npm run mobile:env
   ```
   Cela copie les variables Supabase du `.env` racine vers `mobile/.env`.

2. Les commandes `npm run mobile:metro`, `mobile:android` et `mobile:ios` lancent automatiquement cette synchro avant de démarrer.

L'app mobile utilise [react-native-config](https://github.com/luggit/react-native-config) pour lire `mobile/.env`. Après un `npm run mobile:env`, **redémarrez Metro** (et rebuilder l'app si nécessaire) pour que les nouvelles variables soient prises en compte.

Sans config Supabase, l'app mobile affiche un avertissement et l’auth / projets / chat ne fonctionneront pas.

---

## 🔒 Séparation web / mobile

- Le **build web** sur Vercel continue d'utiliser :
  - `npm run build`
  - Le dossier `dist/` comme output.
- Le dossier `mobile/` n'est **pas** utilisé par le build Vercel et peut évoluer indépendamment.

---

## ✅ Avancement

- [x] Création du dossier `mobile/` et initialisation d'un projet React Native bare TypeScript.
- [x] Documentation `README_MOBILE.md` et configuration Supabase (variables d'environnement).
- [x] Module partagé `shared/`, client Supabase mobile (AsyncStorage), services métier partagés.
- [x] Navigation (React Navigation) et écrans : Auth, Onboard, Dashboard, Projets, Détails, Paiement, Travaux, Clôture, Chat.

