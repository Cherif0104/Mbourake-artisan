-- Système de tracing complet pour toutes les actions
-- Migration: Audit logs pour traçabilité complète

-- Audit logs pour projets
CREATE TABLE IF NOT EXISTS project_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'status_changed', 'viewed', 'deleted'
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs pour devis
CREATE TABLE IF NOT EXISTS quote_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'submitted', 'accepted', 'rejected', 'revision_requested', 'updated'
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs pour escrow
CREATE TABLE IF NOT EXISTS escrow_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  escrow_id UUID REFERENCES escrows(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'created', 'paid', 'released', 'refund_requested', 'refund_approved', 'refund_rejected'
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs pour invoices
CREATE TABLE IF NOT EXISTS invoice_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'generated', 'sent', 'paid', 'cancelled', 'viewed'
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_project_audit_project_id ON project_audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_audit_user_id ON project_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_project_audit_action ON project_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_project_audit_created_at ON project_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quote_audit_quote_id ON quote_audit_logs(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_audit_project_id ON quote_audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_quote_audit_action ON quote_audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_escrow_audit_escrow_id ON escrow_audit_logs(escrow_id);
CREATE INDEX IF NOT EXISTS idx_escrow_audit_action ON escrow_audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_invoice_audit_invoice_id ON invoice_audit_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_audit_action ON invoice_audit_logs(action);

-- RLS policies
ALTER TABLE project_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view project audit logs for their own projects
CREATE POLICY "Users can view project audit logs for own projects" 
  ON project_audit_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_audit_logs.project_id 
      AND (projects.client_id = auth.uid() OR projects.target_artisan_id = auth.uid())
    ) OR 
    auth.uid() = user_id
  );

-- Users can view quote audit logs for their own quotes/projects
CREATE POLICY "Users can view quote audit logs for own quotes" 
  ON quote_audit_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE quotes.id = quote_audit_logs.quote_id 
      AND quotes.artisan_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = quote_audit_logs.project_id 
      AND projects.client_id = auth.uid()
    ) OR
    auth.uid() = user_id
  );

-- Users can view escrow audit logs for their own escrows
CREATE POLICY "Users can view escrow audit logs for own escrows" 
  ON escrow_audit_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM escrows 
      JOIN projects ON projects.id = escrows.project_id
      WHERE escrows.id = escrow_audit_logs.escrow_id 
      AND (projects.client_id = auth.uid() OR projects.target_artisan_id = auth.uid())
    ) OR
    auth.uid() = user_id
  );

-- Users can view invoice audit logs for their own invoices
CREATE POLICY "Users can view invoice audit logs for own invoices" 
  ON invoice_audit_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_audit_logs.invoice_id 
      AND (invoices.client_id = auth.uid() OR invoices.artisan_id = auth.uid())
    ) OR
    auth.uid() = user_id
  );

-- Function to log project actions (to be called from application)
CREATE OR REPLACE FUNCTION log_project_action(
  p_project_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO project_audit_logs (
    project_id, user_id, action, old_value, new_value, metadata
  ) VALUES (
    p_project_id, p_user_id, p_action, p_old_value, p_new_value, p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log quote actions
CREATE OR REPLACE FUNCTION log_quote_action(
  p_quote_id UUID,
  p_project_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO quote_audit_logs (
    quote_id, project_id, user_id, action, old_value, new_value, metadata
  ) VALUES (
    p_quote_id, p_project_id, p_user_id, p_action, p_old_value, p_new_value, p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log escrow actions
CREATE OR REPLACE FUNCTION log_escrow_action(
  p_escrow_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO escrow_audit_logs (
    escrow_id, user_id, action, old_value, new_value, metadata
  ) VALUES (
    p_escrow_id, p_user_id, p_action, p_old_value, p_new_value, p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log invoice actions
CREATE OR REPLACE FUNCTION log_invoice_action(
  p_invoice_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO invoice_audit_logs (
    invoice_id, user_id, action, old_value, new_value, metadata
  ) VALUES (
    p_invoice_id, p_user_id, p_action, p_old_value, p_new_value, p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE project_audit_logs IS 'Trace toutes les actions sur les projets pour audit et sécurité';
COMMENT ON TABLE quote_audit_logs IS 'Trace toutes les actions sur les devis pour audit et sécurité';
COMMENT ON TABLE escrow_audit_logs IS 'Trace toutes les actions sur les escrows pour audit et sécurité';
COMMENT ON TABLE invoice_audit_logs IS 'Trace toutes les actions sur les factures pour audit et sécurité';
