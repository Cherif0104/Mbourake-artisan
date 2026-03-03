# Guide : pousser le projet sur GitHub et mettre à jour Vercel

## 1. Vérifications avant push

- [ ] Build local OK : `npm run build`
- [ ] Migrations Supabase appliquées (Dashboard Supabase → SQL Editor ou `supabase db push`)
- [ ] Variables d'environnement Vercel à jour (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, etc.)

## 2. Pousser sur GitHub

```bash
# Depuis la racine du projet
git add .
git status
git commit -m "feat: notifications montant corrigé, PWA optimisée, admin protégé, satisfaction artisan, guide déploiement"
git push origin main
```

Si la branche par défaut est `master` :

```bash
git push origin master
```

## 3. Vercel

- Vercel est en général connecté au dépôt GitHub : chaque push sur la branche suivie (souvent `main`) déclenche un **nouveau déploiement**.
- Consulter [Vercel Dashboard](https://vercel.com/dashboard) → projet Mbourake → onglet **Deployments** pour voir le build et l’URL de préview/production.
- Après déploiement, les utilisateurs PWA reçoivent la nouvelle version au prochain rechargement (grâce au service worker avec `skipWaiting` + `controllerchange` → reload).

## 4. Restaurer le rôle super admin (une fois)

Si un compte admin a été rétrogradé en artisan/client :

1. **Option A** : Depuis un autre compte admin, aller dans **Admin → Utilisateurs**, ouvrir l’utilisateur concerné et changer le rôle en **Admin**.
2. **Option B** : Exécuter la migration SQL qui remet `role = 'admin'` pour les emails concernés :
   - Fichier : `supabase/migrations/20260303120000_restore_super_admin_role.sql`
   - Adapter la liste des emails dans le `UPDATE`, puis exécuter le script dans Supabase (SQL Editor) ou via `supabase db push`.

## 5. Edge Functions Supabase (optionnel)

Pour que la suppression de compte par l’admin et la suppression par l’utilisateur fonctionnent en production :

```bash
npx supabase functions deploy delete-my-account
npx supabase functions deploy admin-delete-account
```

(En cas d’erreur, vérifier que la CLI Supabase est installée et que le token est configuré.)
