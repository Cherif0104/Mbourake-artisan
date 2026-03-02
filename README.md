# 🏗️ Mbourake - Plateforme de Mise en Relation Artisans/Clients

Plateforme web moderne de mise en relation entre artisans et clients au Sénégal, avec système d'escrow sécurisé et gestion complète des projets.

## 🚀 Fonctionnalités

### Pour les Clients
- ✅ Création de projets avec description vocale, photos et vidéos
- ✅ Réception et comparaison de devis
- ✅ Système de paiement sécurisé (escrow)
- ✅ Chat en temps réel avec messages vocaux
- ✅ Notation et avis sur les artisans

### Pour les Artisans
- ✅ Réception de notifications pour nouveaux projets
- ✅ Soumission de devis détaillés avec facture proforma
- ✅ Gestion des révisions de devis
- ✅ Réception d'avances (artisans vérifiés)
- ✅ Export PDF des devis
- ✅ Chat avec clients

### Système Escrow
- ✅ Calcul automatique des commissions et TVA
- ✅ Paiement sécurisé (mode bypass temporaire)
- ✅ Versement d'avances pour artisans vérifiés
- ✅ Gestion des litiges

### Notifications
- ✅ Notifications en temps réel pour tous les événements
- ✅ Système de notifications push intégré

## 🛠️ Technologies

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Icons**: Lucide React
- **Android (Google Play)** : même app web empaquetée avec [Capacitor](https://capacitorjs.com) → dossier `android/`, voir [docs/ANDROID_GOOGLE_PLAY.md](docs/ANDROID_GOOGLE_PLAY.md)

## 📦 Installation

### Prérequis
- Node.js 18+ 
- npm ou yarn
- Compte Supabase

### Étapes

1. **Cloner le repository**
```bash
git clone https://github.com/Cherif0104/Mbourake.git
cd Mbourake
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
```

Éditez `.env` et ajoutez vos clés Supabase :
```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon_supabase
```

4. **Lancer le serveur de développement**
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3002`

## 🏗️ Build de Production

```bash
npm run build
```

Les fichiers de production seront générés dans le dossier `dist/`.

## 📋 Structure du Projet

```
Mbourake/
├── src/
│   ├── components/      # Composants réutilisables
│   ├── hooks/          # Hooks React personnalisés
│   ├── lib/            # Utilitaires et services
│   ├── pages/          # Pages de l'application
│   ├── types/          # Types TypeScript
│   └── styles.css      # Styles globaux
├── supabase/
│   ├── functions/      # Edge Functions
│   └── scripts/        # Scripts SQL
├── public/             # Fichiers statiques
└── dist/               # Build de production
```

## 🔐 Configuration Supabase

### Tables Principales
- `profiles` - Profils utilisateurs
- `projects` - Projets clients
- `quotes` - Devis artisans
- `escrows` - Fonds sécurisés
- `messages` - Messages chat
- `notifications` - Notifications
- `reviews` - Avis clients

### Storage Buckets
- `photos` - Photos projets et profils
- `audio` - Messages vocaux et descriptions

### Politiques RLS
Toutes les tables ont des politiques Row Level Security (RLS) activées pour la sécurité.

### Edge Functions – Suppression de compte
Le bouton « Supprimer mon compte » (Paramètres) appelle la fonction Edge `delete-my-account`. Pour qu’il fonctionne, déployer la fonction après avoir lié le projet Supabase :
```bash
supabase functions deploy delete-my-account --no-verify-jwt
```
Voir [supabase/functions/delete-my-account/README.md](supabase/functions/delete-my-account/README.md) pour le détail.

## 🚢 Déploiement

### Vercel / Netlify

1. Connectez votre repository GitHub
2. Configurez les variables d'environnement :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Déployez !

### Build Command
```bash
npm run build
```

### Output Directory
```
dist
```

## 🔄 Système de Paiement

⚠️ **Mode Bypass Actif** : Le système utilise actuellement un mode bypass temporaire pour simuler les paiements en attendant l'intégration des API partenaires financiers (Wave, Orange Money, etc.).

Les transactions sont simulées mais le flux complet est opérationnel.

## 📝 Migrations Database

Les migrations sont gérées via Supabase. Les triggers automatiques sont configurés pour :
- Génération de `project_number` (format: MBK-YYYY-NNNNNNNN)
- Génération de `quote_number` (format: DEV-YYYY-NNNNNNNN)

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est privé et propriétaire.

## 👥 Équipe

Développé par l'équipe Mbourake

---

**Version**: 2.0.0  
**Dernière mise à jour**: Janvier 2025
