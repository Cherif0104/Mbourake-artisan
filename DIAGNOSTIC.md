# Diagnostic Mbourake – Rapport

**Date :** 5 mars 2026  
**Branche :** main

---

## 1. Build & déploiement

| Élément | Statut |
|--------|--------|
| Build production (`npm run build`) | OK (≈ 22 s) |
| Source maps en production | Désactivées (sécurité) |
| Base des assets | `/` (refresh marketplace OK) |
| Linter (IDE) | Aucune erreur |

**Avertissements build (non bloquants) :**
- `notificationService.ts` importé à la fois dynamiquement et statiquement → possible optimisation en ne gardant qu’un type d’import.
- Chunks > 500 kB (ex. `index-*.js` ~1,4 MB, `jspdf` ~388 kB) → envisager du code-splitting / lazy routes pour alléger le premier chargement.
- APK absent : `public/download/mbourake.apk` manquant → le lien « Télécharger l’app Android » renverra 404 en production tant que l’APK n’est pas ajouté.

---

## 2. Sécurité & configuration

| Élément | Statut |
|--------|--------|
| Headers (Vercel) | OK (CSP, X-Frame-Options, Referrer-Policy, etc.) |
| Secrets côté client | Aucun (uniquement `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) |
| Fichier `.env` | Non versionné (normal) ; prévoir un `.env.example` pour doc |
| SECURITE.md | Présent |

---

## 3. PWA & mobile

| Élément | Statut |
|--------|--------|
| manifest.json | OK (start_url, scope, icons, shortcuts) |
| service-worker.js | v2.6.0, fallback index.html sur 404/500 |
| Rewrites Vercel | Toutes les routes (hors `/download/`) → `index.html` |
| Bouton « Télécharger sur mobile » | Un clic = installation (native ou instructions selon navigateur) |

---

## 4. Fonctionnalités désactivées

- **Crédits** : `CREDITS_ENABLED = false` dans `src/config/features.ts`  
  → Page crédits masquée, artisans non bloqués à l’acceptation de devis.

---

## 5. Dépendances (npm audit)

**8 vulnérabilités signalées (1 modérée, 7 élevées) :**

| Package | Sévérité | Remarque |
|---------|----------|----------|
| jspdf | Élevée | Plusieurs CVE (injection PDF, DoS, etc.) → `npm audit fix` possible |
| xlsx | Élevée | ReDoS, prototype pollution → **aucun correctif disponible** pour l’instant ; à surveiller / remplacer si usage critique |
| minimatch, rollup, tar, @isaacs/brace-expansion | Élevée | Souvent dépendances transitives ; `npm audit fix` à tester |
| dompurify | Modérée | XSS → correctif via `npm audit fix` |
| @capacitor/cli | Dépend de tar | Impact surtout en dev/build, pas en runtime navigateur |

**Recommandation :** exécuter `npm audit fix`, puis vérifier que build et tests passent. Pour `xlsx`, limiter les entrées (fichiers utilisateur) ou chercher une alternative si le risque est jugé trop élevé.

---

## 6. Code

| Élément | Détail |
|--------|--------|
| TODO repérés | 1 : `InvoicesPage.tsx` – « Envoyer l’email avec la facture » |
| ErrorBoundary | Présent autour de l’app |
| Routes | Toutes déclarées dans `App.tsx`, route 404 en dernier |

---

## 7. Vérification TypeScript

`tsc --noEmit` n’a pas pu être exécuté dans l’environnement de diagnostic (module `tsc` non résolu). Le build Vite inclut la compilation TS et a réussi, donc le projet compile. Pour vérifier en local : `npx tsc --noEmit`.

---

## 8. Synthèse

- **Production :** le projet build correctement, les assets sont en `/`, le refresh sur marketplace/produit ne doit plus donner de page blanche.
- **Sécurité :** headers et bonnes pratiques (pas de secrets côté client) en place ; traiter les vulnérabilités npm (audit fix + suivi xlsx).
- **PWA :** install multi-navigateurs et fallback SPA OK.
- **À faire (optionnel) :** ajouter `.env.example`, corriger les vulnérabilités npm, réduire la taille des chunks (lazy routes), ajouter l’APK si le lien Android doit fonctionner.
