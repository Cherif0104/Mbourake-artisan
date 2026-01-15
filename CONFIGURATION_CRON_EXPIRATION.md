# ⏰ Configuration Cron Job - Expiration Projets

## Vue d'ensemble

La fonction SQL `mark_expired_projects()` marque automatiquement les projets comme expirés après 6 jours sans devis accepté. Cette fonction doit être appelée régulièrement (recommandé : toutes les heures).

## Options de Configuration

### Option 1 : Supabase Edge Function (Recommandé)

Une Edge Function a été créée : `supabase/functions/mark-expired-projects/index.ts`

**Avantages :**
- ✅ Appelable via HTTP (peut être configuré avec un service cron externe)
- ✅ Pas besoin d'activer pg_cron
- ✅ Logs disponibles dans Supabase Dashboard

**Déploiement :**
```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase

# Se connecter à Supabase
supabase login

# Lier le projet
supabase link --project-ref votre-project-ref

# Déployer la fonction
supabase functions deploy mark-expired-projects
```

**Configuration Cron Externe :**
Utiliser un service comme [cron-job.org](https://cron-job.org) ou [EasyCron](https://www.easycron.com/) pour appeler l'Edge Function toutes les heures :

- URL : `https://votre-project-ref.supabase.co/functions/v1/mark-expired-projects`
- Méthode : POST
- Headers :
  - `Authorization: Bearer VOTRE_SERVICE_ROLE_KEY`
  - `Content-Type: application/json`
- Fréquence : Toutes les heures (`0 * * * *`)

---

### Option 2 : pg_cron dans Supabase (Si disponible)

**Avantages :**
- ✅ Directement dans la base de données
- ✅ Pas besoin de service externe
- ✅ Plus performant

**Configuration :**
1. Activer l'extension pg_cron dans Supabase Dashboard :
   - Aller dans Database > Extensions
   - Activer `pg_cron`

2. Créer le cron job :
   ```sql
   SELECT cron.schedule(
     'mark-expired-projects',
     '0 * * * *', -- Toutes les heures
     $$SELECT mark_expired_projects()$$
   );
   ```

3. Vérifier le cron job :
   ```sql
   SELECT * FROM cron.job;
   ```

4. Voir l'historique d'exécution :
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'mark-expired-projects')
   ORDER BY start_time DESC
   LIMIT 10;
   ```

---

### Option 3 : Service Cron Externe (Simple)

Utiliser un service gratuit comme [cron-job.org](https://cron-job.org) pour appeler l'Edge Function :

1. Créer un compte sur cron-job.org
2. Créer un nouveau cron job :
   - **URL** : `https://votre-project-ref.supabase.co/functions/v1/mark-expired-projects`
   - **Méthode** : POST
   - **Headers** :
     ```
     Authorization: Bearer VOTRE_SERVICE_ROLE_KEY
     Content-Type: application/json
     ```
   - **Fréquence** : Toutes les heures (`0 * * * *`)
   - **Activer** : Oui

---

## Test Manuel

Vous pouvez tester la fonction manuellement :

### Via SQL (Supabase Dashboard)
```sql
SELECT mark_expired_projects();
```

### Via Edge Function (curl)
```bash
curl -X POST https://votre-project-ref.supabase.co/functions/v1/mark-expired-projects \
  -H "Authorization: Bearer VOTRE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### Via Supabase Client (Frontend)
```typescript
const { data, error } = await supabase.rpc('mark_expired_projects');
```

---

## Recommandation

**Pour la production :** Utiliser **Option 1 (Edge Function)** avec un service cron externe, car :
- Plus fiable (service dédié)
- Logs accessibles
- Pas de dépendance à pg_cron (qui peut ne pas être disponible sur tous les plans Supabase)

**Pour le développement :** Appeler manuellement via SQL ou Edge Function pour tester.

---

## Monitoring

Vérifier régulièrement que la fonction s'exécute correctement :

```sql
-- Voir les projets expirés récemment
SELECT 
  id, 
  title, 
  status, 
  expires_at, 
  updated_at,
  EXTRACT(EPOCH FROM (updated_at - expires_at)) / 3600 as hours_after_expiration
FROM projects 
WHERE status = 'expired' 
  AND updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;
```

---

**Date de création :** 2025-01-XX  
**Dernière mise à jour :** 2025-01-XX
