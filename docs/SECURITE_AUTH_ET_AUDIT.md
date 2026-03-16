# Sécurité : Auth OAuth et pistes pour un diagnostic

**Contexte :** Lors du parcours de connexion/inscription avec Google, l’écran « Sélectionnez un compte » / « Accéder à l’application » affiche l’URL du projet Supabase (ex. `snhoxuqaskgoownshvgr.supabase.co`). Ce document clarifie le risque et les mesures possibles, puis propose une base pour un diagnostic sécurité plus large.

---

## 1. Exposition de l’URL du projet lors du login Google

### Ce qui est exposé

- **Où :** Sur la page Google « Se connecter avec Google » / « Sélectionnez un compte », dans la section **« Accéder à l’application »**.
- **Quoi :** L’URL de **callback OAuth** = l’URL vers laquelle Google redirige après authentification. Avec Supabase en défaut, c’est l’URL du projet, du type `https://<project-ref>.supabase.co/auth/v1/callback`.
- **Pourquoi :** Google affiche cette URL pour indiquer à l’utilisateur à quelle « application » il donne accès (transparence OAuth).

### Niveau de risque

| Élément | Risque |
|--------|--------|
| **URL projet Supabase visible** | **Faible** en soi : ce n’est pas une clé secrète. Sans les clés (anon, service_role, etc.), on ne peut pas accéder au projet. |
| **Divulgation d’information** | **Modéré** : on révèle l’usage de Supabase et l’identifiant projet. En audit, on peut le noter comme « information disclosure » (architecture exposée). |
| **Clés API / secrets** | **Aucune** : elles ne doivent jamais apparaître dans l’URL ou sur l’écran Google. À garder côté serveur / variables d’environnement. |

En résumé : ce n’est pas une faille critique, mais on peut réduire la surface en ne montrant plus l’URL Supabase à l’utilisateur.

---

## 2. Mesure recommandée : domaine personnalisé Supabase (Auth)

Pour que l’écran Google affiche **votre domaine** au lieu de `xxx.supabase.co` :

1. **Configurer un domaine personnalisé pour le projet Supabase**
   - Dashboard Supabase → **Project Settings** → **Custom Domains**.
   - Ajouter un sous-domaine dédié à l’API/Auth (ex. `api.mbourake.com` ou `auth.mbourake.com`).
   - Suivre les instructions Supabase (enregistrement DNS CNAME, éventuellement SSL).

2. **Configurer Auth avec ce domaine**
   - **Authentication** → **URL Configuration** :
     - **Site URL** : votre front (ex. `https://mbourake.com`).
     - Les **Redirect URLs** doivent inclure votre front ; le callback Auth passera par le custom domain une fois celui-ci actif.

3. **Côté Google Cloud Console**
   - Dans les **Authorized redirect URIs** de l’application OAuth Google, ajouter l’URL de callback qui utilisera le custom domain (ex. `https://api.mbourake.com/auth/v1/callback`), conformément à ce que Supabase indique une fois le custom domain configuré.

Résultat attendu : sur l’écran « Accéder à l’application », l’utilisateur voit par exemple `api.mbourake.com` (ou `auth.mbourake.com`) au lieu de `snhoxuqaskgoownshvgr.supabase.co`. La confiance et la cohérence de marque s’en trouvent renforcées.

---

## 3. Bonnes pratiques déjà en place (à conserver)

- **Redirect après OAuth** : le `redirectTo` dans le code pointe vers votre front (`window.location.origin/dashboard`), pas vers une URL externe.
- **Redirect URLs** : à maintenir à jour dans Supabase (Dashboard → Authentication → URL Configuration) pour chaque environnement (prod, staging, localhost si utilisé).

---

## 4. Pistes pour un diagnostic sécurité plus large

À traiter lors d’un audit dédié (sans tout faire d’un coup) :

| Domaine | Points à vérifier |
|---------|-------------------|
| **Auth / OAuth** | Custom domain (ci‑dessus) ; pas de clés en front ; scope Google minimal ; gestion des sessions (refresh, expiration). |
| **Secrets** | Clés Supabase (anon, service_role) uniquement en env / backend ; pas de `service_role` côté client ; `.env` dans `.gitignore`. |
| **RLS (Supabase)** | Politiques RLS sur toutes les tables sensibles ; aucun accès direct aux données d’autres utilisateurs. |
| **API / CORS** | Origines autorisées limitées à vos domaines (prod + staging). |
| **Données personnelles** | Données affichées / loguées (éviter emails, IDs en clair dans les logs publics). |
| **Admin** | Accès admin protégé (rôle, éventuellement 2FA ou renforcement) ; RPC admin (escrow, etc.) bien protégées (SECURITY DEFINER + vérification rôle). |
| **Paiements / Escrow** | Pas de données bancaires en clair ; actions sensibles (déblocage, remboursement) tracées et réservées aux admins. |

Ce document pourra être complété au fil du diagnostic (résultats des vérifications, actions correctives, priorités).
