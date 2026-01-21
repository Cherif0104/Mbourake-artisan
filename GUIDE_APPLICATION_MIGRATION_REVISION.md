# Guide : Application de la migration pour les révisions de devis

## Problème
La table `quote_revisions` n'existe pas dans Supabase, ce qui cause l'erreur :
```
Could not find the table 'public.quote_revisions' in the schema cache
```

## Solution : Appliquer la migration SQL

### Option 1 : Via l'interface Supabase (Recommandé)

1. **Connectez-vous à votre projet Supabase**
   - Allez sur https://supabase.com/dashboard
   - Sélectionnez votre projet

2. **Ouvrez l'éditeur SQL**
   - Dans le menu de gauche, cliquez sur "SQL Editor"
   - Cliquez sur "New query"

3. **Copiez et exécutez la migration**
   - Ouvrez le fichier `supabase/migrations/20250121000001_create_quote_revisions.sql`
   - Copiez tout le contenu
   - Collez-le dans l'éditeur SQL de Supabase
   - Cliquez sur "Run" ou appuyez sur `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

4. **Vérifiez que la table a été créée**
   - Allez dans "Table Editor"
   - Vous devriez voir la table `quote_revisions` dans la liste

### Option 2 : Via Supabase CLI (si installé)

```bash
# Si vous avez Supabase CLI installé
supabase db push
```

### Option 3 : Exécution directe du SQL

Si vous préférez, vous pouvez exécuter directement ce SQL dans Supabase :

```sql
-- Migration: Création de la table quote_revisions pour gérer les demandes de révision de devis
-- Date: 2025-01-21

-- Table pour stocker les demandes de révision
CREATE TABLE IF NOT EXISTS quote_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  client_comments TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'modified')),
  artisan_response TEXT,
  modified_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_quote_revisions_quote_id ON quote_revisions(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_revisions_project_id ON quote_revisions(project_id);
CREATE INDEX IF NOT EXISTS idx_quote_revisions_requested_by ON quote_revisions(requested_by);
CREATE INDEX IF NOT EXISTS idx_quote_revisions_status ON quote_revisions(status);

-- Index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_quote_revisions_artisan_status ON quote_revisions(project_id, status) 
  WHERE status = 'pending';

-- Commentaires pour documentation
COMMENT ON TABLE quote_revisions IS 'Demandes de révision de devis par les clients';
COMMENT ON COLUMN quote_revisions.quote_id IS 'ID du devis concerné par la révision';
COMMENT ON COLUMN quote_revisions.client_comments IS 'Commentaires du client expliquant pourquoi il demande une révision';
COMMENT ON COLUMN quote_revisions.status IS 'Statut: pending (en attente), accepted (acceptée), rejected (refusée), modified (devis modifié créé)';
COMMENT ON COLUMN quote_revisions.modified_quote_id IS 'ID du nouveau devis créé si l''artisan a choisi de modifier le devis';
COMMENT ON COLUMN quote_revisions.artisan_response IS 'Réponse ou commentaire de l''artisan concernant la demande de révision';

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_quote_revisions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quote_revisions_updated_at
  BEFORE UPDATE ON quote_revisions
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_revisions_updated_at();
```

## Vérification

Après avoir appliqué la migration, vérifiez que tout fonctionne :

1. **Vérifiez la table dans Supabase**
   - Table Editor → `quote_revisions` doit apparaître

2. **Testez dans l'application**
   - Rechargez la page
   - Essayez de demander une révision
   - L'erreur 404 devrait disparaître

## Note importante

Si vous avez déjà des données de test, elles ne seront pas affectées. La migration utilise `CREATE TABLE IF NOT EXISTS`, donc elle est sûre à exécuter même si la table existe déjà (elle ne fera rien dans ce cas).
