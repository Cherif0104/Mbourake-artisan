# Guide : Application de toutes les migrations nécessaires

## ⚠️ IMPORTANT : Les migrations doivent être appliquées dans Supabase

Les migrations SQL créées dans le projet doivent être exécutées manuellement dans Supabase pour que les fonctionnalités fonctionnent.

## Migrations à appliquer

### 1. Migration : Table quote_revisions (OBLIGATOIRE)
**Fichier :** `APPLIQUER_MIGRATION_REVISION.sql`

**Pourquoi :** Cette table est nécessaire pour le système de révision de devis. Sans elle, vous aurez l'erreur :
```
Could not find the table 'public.quote_revisions' in the schema cache
```

**Comment appliquer :**
1. Ouvrez Supabase Dashboard → SQL Editor
2. Copiez le contenu de `APPLIQUER_MIGRATION_REVISION.sql`
3. Collez et exécutez dans Supabase

### 2. Migration : Colonnes artisan_response dans reviews (OBLIGATOIRE)
**Fichier :** `APPLIQUER_MIGRATION_REVIEWS.sql`

**Pourquoi :** Permet aux artisans de répondre aux commentaires des clients.

**Comment appliquer :**
1. Ouvrez Supabase Dashboard → SQL Editor
2. Copiez le contenu de `APPLIQUER_MIGRATION_REVIEWS.sql`
3. Collez et exécutez dans Supabase

### 3. Migration : Colonne certificate_url dans artisan_affiliations (OBLIGATOIRE)
**Fichier :** `supabase/migrations/20250121000000_add_certificate_url_to_affiliations.sql`

**Pourquoi :** Permet aux artisans d'uploader des certificats d'affiliation.

**Comment appliquer :**
1. Ouvrez Supabase Dashboard → SQL Editor
2. Copiez le contenu du fichier de migration
3. Collez et exécutez dans Supabase

## Ordre d'application

Vous pouvez appliquer les migrations dans n'importe quel ordre, elles sont indépendantes. Mais je recommande cet ordre :

1. ✅ `APPLIQUER_MIGRATION_REVISION.sql` (priorité - erreur actuelle)
2. ✅ `APPLIQUER_MIGRATION_REVIEWS.sql`
3. ✅ `20250121000000_add_certificate_url_to_affiliations.sql`

## Vérification après application

Après avoir appliqué chaque migration, vérifiez dans Supabase :

1. **Table Editor** → Vérifiez que les tables/colonnes existent
2. **Rechargez l'application** → Les erreurs 404 devraient disparaître
3. **Testez les fonctionnalités** :
   - Demander une révision de devis
   - Répondre à une révision (artisan)
   - Répondre à un commentaire (artisan)

## Erreurs courantes

### "Could not find the table 'public.quote_revisions'"
→ La migration `APPLIQUER_MIGRATION_REVISION.sql` n'a pas été appliquée

### "column 'artisan_response' does not exist"
→ La migration `APPLIQUER_MIGRATION_REVIEWS.sql` n'a pas été appliquée

### "column 'certificate_url' does not exist"
→ La migration `20250121000000_add_certificate_url_to_affiliations.sql` n'a pas été appliquée

## Support

Si vous rencontrez des erreurs lors de l'application des migrations, vérifiez :
- Que vous êtes connecté au bon projet Supabase
- Que vous avez les permissions nécessaires (admin)
- Que les tables référencées existent (`quotes`, `projects`, `profiles`, `reviews`, `artisan_affiliations`)
