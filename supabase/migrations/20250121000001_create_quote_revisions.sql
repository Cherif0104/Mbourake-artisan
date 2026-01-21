-- Migration: Création de la table quote_revisions pour gérer les demandes de révision de devis
-- Date: 2025-01-21

-- Table pour stocker les demandes de révision
CREATE TABLE IF NOT EXISTS quote_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Client qui demande
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  client_comments TEXT NOT NULL, -- Commentaires du client expliquant la demande
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'modified')),
  artisan_response TEXT, -- Réponse/commentaire de l'artisan
  modified_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL, -- ID du nouveau devis si l'artisan a modifié
  responded_at TIMESTAMPTZ, -- Date de réponse de l'artisan
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_quote_revisions_quote_id ON quote_revisions(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_revisions_project_id ON quote_revisions(project_id);
CREATE INDEX IF NOT EXISTS idx_quote_revisions_requested_by ON quote_revisions(requested_by);
CREATE INDEX IF NOT EXISTS idx_quote_revisions_status ON quote_revisions(status);

-- Index composite pour les requêtes fréquentes (artisan qui voit ses révisions en attente)
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
