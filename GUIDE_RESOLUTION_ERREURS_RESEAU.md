# Guide de Résolution des Erreurs Réseau

## 🔴 Problème Identifié

Vous rencontrez des erreurs de connexion réseau lors du test en localhost :

```
- ERR_CONNECTION_TIMED_OUT
- ERR_NAME_NOT_RESOLVED  
- ERR_INTERNET_DISCONNECTED
```

Ces erreurs indiquent que l'application ne peut pas se connecter à Supabase.

## ✅ Solutions

### 1. Vérifier votre Connexion Internet

**Étapes :**
1. Vérifiez que vous êtes connecté à Internet
2. Testez une autre page web dans votre navigateur
3. Vérifiez votre connexion WiFi/Ethernet

### 2. Vérifier le Projet Supabase

**Le projet Supabase peut être en pause (mode free tier) :**

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Vérifiez si le projet est actif ou en pause
4. Si en pause, cliquez sur "Restore" pour le réactiver

**Vérification de l'URL Supabase :**
- Assurez-vous que l'URL `https://snhoxuqaskgoownshvgr.supabase.co` est accessible
- Testez dans votre navigateur : ouvrez cette URL (vous devriez voir une page Supabase)

### 3. Vérifier les Variables d'Environnement

**Fichier `.env.local` doit contenir :**

```env
VITE_SUPABASE_URL=https://snhoxuqaskgoownshvgr.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_anon_ici
```

**Vérification :**
1. Ouvrez `.env.local` dans votre projet
2. Vérifiez que les valeurs sont correctes
3. Si le fichier n'existe pas, créez-le à partir de `env.example`

### 4. Redémarrer le Serveur de Développement

**Après avoir modifié `.env.local` :**

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis relancez :
npm run dev
```

### 5. Vérifier le Firewall/Antivirus

Parfois, les firewalls ou antivirus bloquent les connexions :

1. Vérifiez les paramètres de votre firewall
2. Autorisez Node.js/npm dans votre antivirus
3. Désactivez temporairement l'antivirus pour tester

### 6. Tester la Connexion Directement

**Dans la console du navigateur (F12), testez :**

```javascript
fetch('https://snhoxuqaskgoownshvgr.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'votre_clé_anon'
  }
})
.then(r => console.log('✅ Connexion OK', r))
.catch(e => console.error('❌ Erreur connexion', e));
```

## 🛠️ Améliorations Apportées

### Composant OfflineBanner

Un composant a été créé pour afficher un message lorsque la connexion est perdue :

- **Banner rouge** : "Vous êtes hors ligne" quand pas de connexion
- **Banner vert** : "Connexion rétablie !" quand la connexion revient
- **Bouton "Réessayer"** : Pour recharger la page

Le composant est intégré dans `App.tsx` et apparaît automatiquement.

### Gestion Améliorée des Erreurs Réseau

Les hooks `useAuth` et `useProfile` gèrent maintenant mieux les erreurs réseau :

- Ne loguent plus d'erreurs redondantes pour les problèmes réseau
- Affichent le banner offline automatiquement
- Permettent à l'application de continuer à fonctionner hors ligne (avec limitations)

## 📋 Checklist de Diagnostic

Cocher chaque point :

- [ ] Connexion internet active
- [ ] Projet Supabase actif (pas en pause)
- [ ] URL Supabase accessible dans le navigateur
- [ ] Fichier `.env.local` existe et contient les bonnes valeurs
- [ ] Serveur de développement redémarré après modification `.env.local`
- [ ] Firewall/antivirus n'block pas les connexions
- [ ] Test de connexion directe dans la console réussit

## 🎯 Prochaines Étapes

1. **Vérifiez d'abord votre connexion internet**
2. **Vérifiez que le projet Supabase est actif**
3. **Vérifiez les variables d'environnement**
4. **Redémarrez le serveur de développement**
5. **Testez à nouveau**

Une fois la connexion rétablie, l'application devrait fonctionner normalement. Le banner offline disparaîtra automatiquement.

## 💡 Note

Les erreurs `ERR_INTERNET_DISCONNECTED` et `ERR_CONNECTION_TIMED_OUT` sont **normales** lorsque :
- Vous n'avez pas de connexion internet
- Le projet Supabase est en pause
- Il y a un problème réseau temporaire

Le code gère maintenant ces situations de manière élégante avec le banner offline.
