# Sécurité – Mbourake

## Règles appliquées

### 1. Pas de code confidentiel côté client

- **Ne jamais** mettre de clés secrètes (API secret, JWT signing key, etc.) dans des variables `VITE_*`. Tout ce qui est préfixé par `VITE_` est inclus dans le bundle et visible dans le navigateur.
- Côté front, seules des données **publiques** sont acceptables : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (clé anonyme conçue pour être exposée, protégée par RLS en base).
- Toute logique sensible (paiement, admin, promotion de rôles, etc.) doit rester côté **Supabase** (Edge Functions, RLS, triggers).

### 2. Build de production

- **Source maps désactivées** (`vite.config.ts` : `sourcemap: false`) pour ne pas exposer les sources en production.
- Le code est minifié ; ne pas réactiver les source maps en prod sans besoin explicite.

### 3. En-têtes HTTP (Vercel)

Les en-têtes suivants sont configurés dans `vercel.json` pour toutes les réponses :

| En-tête | Rôle |
|--------|------|
| `X-Content-Type-Options: nosniff` | Empêche le MIME sniffing |
| `X-Frame-Options: DENY` | Empêche l’inclusion en iframe (clickjacking) |
| `X-XSS-Protection: 1; mode=block` | Réduction du risque XSS (navigateurs anciens) |
| `Referrer-Policy: strict-origin-when-cross-origin` | Limite les infos envoyées en Referer |
| `Permissions-Policy` | Restreint caméra, micro, etc. |
| `Content-Security-Policy` | Restreint les sources de scripts, styles, connexions (dont Supabase) |

Sur un autre hébergeur (Nginx, Netlify, etc.), reproduire ces en-têtes pour le même niveau de protection.

### 4. Déploiement sur un autre hébergeur

Si vous ne déployez pas sur Vercel, configurer au minimum :

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- Pas de publication des fichiers `.map` (source maps) en production.

---

*Dernière mise à jour : configuration Vercel + CSP.*
