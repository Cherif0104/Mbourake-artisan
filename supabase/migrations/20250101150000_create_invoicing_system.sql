-- Migration: Système de Facturation Automatique
-- Génération automatique de factures pour les projets terminés

-- Table des factures
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE, -- Numéro de facture unique (ex: INV-2025-0001)
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  artisan_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Montants
  base_amount DECIMAL(12, 2) NOT NULL, -- Montant HT
  tva_percent DECIMAL(5, 2) DEFAULT 18.00, -- TVA 18% par défaut au Sénégal
  tva_amount DECIMAL(12, 2) NOT NULL, -- Montant TVA
  total_amount DECIMAL(12, 2) NOT NULL, -- Montant TTC
  
  -- Informations facture
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE, -- Date d'échéance
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  payment_date DATE, -- Date de paiement effectif
  payment_method TEXT, -- Méthode de paiement (wave, orange_money, stripe, etc.)
  
  -- Documents
  pdf_url TEXT, -- URL du PDF généré
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Séquence pour générer les numéros de facture
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- Fonction pour générer le numéro de facture
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  year_val INTEGER;
  seq_val INTEGER;
  invoice_num TEXT;
BEGIN
  year_val := EXTRACT(YEAR FROM CURRENT_DATE);
  seq_val := nextval('invoice_number_seq');
  invoice_num := 'INV-' || year_val || '-' || LPAD(seq_val::TEXT, 6, '0');
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour générer automatiquement le numéro de facture
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_number_trigger
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_artisan ON invoices(artisan_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- RLS Policies
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Les clients peuvent voir leurs factures
CREATE POLICY "Clients see their invoices"
  ON invoices FOR SELECT
  USING (client_id = auth.uid());

-- Les artisans peuvent voir leurs factures
CREATE POLICY "Artisans see their invoices"
  ON invoices FOR SELECT
  USING (artisan_id = auth.uid());

-- Les admins peuvent tout voir/gérer
CREATE POLICY "Admins manage all invoices"
  ON invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger pour updated_at
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour calculer automatiquement les montants TVA et total
CREATE OR REPLACE FUNCTION calculate_invoice_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculer TVA
  NEW.tva_amount := NEW.base_amount * (NEW.tva_percent / 100.0);
  -- Calculer total TTC
  NEW.total_amount := NEW.base_amount + NEW.tva_amount;
  
  -- Définir la date d'échéance par défaut (30 jours)
  IF NEW.due_date IS NULL THEN
    NEW.due_date := NEW.issue_date + INTERVAL '30 days';
  END IF;
  
  -- Mettre à jour le statut si payé
  IF NEW.payment_date IS NOT NULL AND NEW.status = 'sent' THEN
    NEW.status := 'paid';
  END IF;
  
  -- Marquer comme overdue si date d'échéance passée
  IF NEW.due_date < CURRENT_DATE AND NEW.status = 'sent' THEN
    NEW.status := 'overdue';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_invoice_amounts_trigger
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_amounts();

-- Fonction pour créer automatiquement une facture quand un projet est terminé
CREATE OR REPLACE FUNCTION create_invoice_on_project_completion()
RETURNS TRIGGER AS $$
DECLARE
  accepted_quote RECORD;
  escrow_record RECORD;
BEGIN
  -- Vérifier si le projet vient d'être marqué comme terminé
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Récupérer le devis accepté
    SELECT * INTO accepted_quote
    FROM quotes
    WHERE project_id = NEW.id
      AND status = 'accepted'
    LIMIT 1;
    
    -- Récupérer les informations de l'escrow
    SELECT * INTO escrow_record
    FROM escrows
    WHERE project_id = NEW.id
    LIMIT 1;
    
    -- Si on a un devis accepté, créer la facture
    IF accepted_quote IS NOT NULL THEN
      INSERT INTO invoices (
        project_id,
        client_id,
        artisan_id,
        base_amount,
        tva_percent,
        status,
        issue_date
      ) VALUES (
        NEW.id,
        NEW.client_id,
        accepted_quote.artisan_id,
        COALESCE(escrow_record.total_amount, accepted_quote.amount),
        18.00,
        'draft', -- Statut draft, l'admin ou le système peut le passer à 'sent'
        CURRENT_DATE
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement une facture
CREATE TRIGGER create_invoice_trigger
  AFTER UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION create_invoice_on_project_completion();

-- Commentaires
COMMENT ON TABLE invoices IS 'Factures automatiques générées pour les projets terminés';
COMMENT ON COLUMN invoices.invoice_number IS 'Numéro unique généré automatiquement (INV-YYYY-XXXXXX)';
COMMENT ON COLUMN invoices.status IS 'Statut: draft (brouillon), sent (envoyée), paid (payée), overdue (en retard), cancelled (annulée)';
COMMENT ON COLUMN invoices.tva_percent IS 'TVA à 18% par défaut au Sénégal';
