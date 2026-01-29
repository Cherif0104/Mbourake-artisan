# Checklist pré-déploiement Mbourake

## Déploiement GitHub → Vercel

- [ ] **Variables d'environnement Vercel** (Settings → Environment Variables) :
  - `VITE_SUPABASE_URL` = URL de ton projet Supabase
  - `VITE_SUPABASE_ANON_KEY` = clé anon Supabase
- [ ] Branche connectée : en général `main` ou `master` ; chaque push déclenche un déploiement.
- [ ] Build : `npm run build` → sortie dans `dist/`. Vercel utilise déjà cette config (`vercel.json`).

## PWA & Icônes

- [ ] **Icône PWA (fond blanc + logo Mbourake)**  
  Créer `public/icons/icon-192.png` et `public/icons/icon-512.png` avec **fond blanc** et le logo Mbourake (ex. depuis `src/pages/LOGO MboURAKE.png`).  
  Ensuite dans `public/manifest.json`, les premières entrées `icons` pointent déjà vers ces fichiers ; le fallback actuel est `logo-senegel.png`.  
  Optionnel : mettre à jour `index.html` → `apple-touch-icon` vers `/icons/icon-192.png` et les balises `og:image` / `twitter:image` vers `https://mbourake.com/icons/icon-512.png`.
- [ ] Manifest : `background_color: #FFFFFF`, `theme_color: #FBBF24`, Service Worker enregistré en production (HTTPS).

## SEO / MEO & partage de lien

- [ ] **index.html** : meta description, Open Graph et Twitter Card sont en place.  
  En production, vérifier que l’URL canonique et les `og:url` / `twitter:url` correspondent au domaine réel (ex. `https://mbourake.com`).
- [ ] Image de partage : actuellement `logo-senegel.png`. Pour une image dédiée (ex. 1200×630), créer l’asset et mettre à jour `og:image` et `twitter:image`.

## Mobile & parcours

- [ ] Viewport et `viewport-fit=cover` dans `index.html` pour safe areas (notch, etc.).
- [ ] Parcours projet (client / artisan) : redirections selon l’étape (détail → paiement → thank-you → travaux → clôture) déjà en place ; vérifier en manuel sur mobile.

## Résumé

| Élément              | Statut |
|----------------------|--------|
| Build Vercel         | OK (vercel.json) |
| Env Vercel           | À configurer (VITE_*) |
| SEO / OG / Twitter   | OK (index.html) |
| PWA manifest         | OK (fond blanc, icônes avec fallback) |
| Icônes 192/512 Mbourake | À ajouter (voir `public/icons/README.md`) |

Une fois les variables Vercel et (optionnel) les icônes blanc + logo en place, le déploiement est prêt.
