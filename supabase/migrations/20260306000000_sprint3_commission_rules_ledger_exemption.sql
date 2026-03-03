-- Sprint 3: Règles de commission, ledger des commissions, règles d'exemption

-- ========== 1) Règles de commission ==========
CREATE TABLE IF NOT EXISTS commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  scope_type TEXT NOT NULL DEFAULT 'global' CHECK (scope_type IN ('global', 'organisation')),
  scope_id UUID NULL REFERENCES chambres_metier(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('percent', 'fixed')),
  value NUMERIC(12, 4) NOT NULL CHECK (value >= 0),
  applicable_to TEXT NOT NULL DEFAULT 'project_escrow' CHECK (applicable_to IN ('project_escrow', 'marketplace_order')),
  min_amount NUMERIC(12, 2) NULL,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_rules_scope ON commission_rules(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_applicable ON commission_rules(applicable_to);
CREATE INDEX IF NOT EXISTS idx_commission_rules_valid ON commission_rules(valid_from, valid_to);

COMMENT ON TABLE commission_rules IS 'Règles de calcul des commissions (%, fixe) par scope et type de transaction';

ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read commission_rules" ON commission_rules;
CREATE POLICY "Admins read commission_rules" ON commission_rules FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins manage commission_rules" ON commission_rules;
CREATE POLICY "Admins manage commission_rules" ON commission_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Trigger updated_at
CREATE TRIGGER trg_commission_rules_updated
  BEFORE UPDATE ON commission_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== 2) Ledger des commissions (traçabilité) ==========
CREATE TABLE IF NOT EXISTS commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('escrow_release', 'marketplace_order')),
  source_id UUID NOT NULL,
  amount_base NUMERIC(12, 2) NOT NULL CHECK (amount_base >= 0),
  amount_commission NUMERIC(12, 2) NOT NULL CHECK (amount_commission >= 0),
  organisation_id UUID NULL REFERENCES chambres_metier(id) ON DELETE SET NULL,
  project_id UUID NULL REFERENCES projects(id) ON DELETE SET NULL,
  rule_id UUID NULL REFERENCES commission_rules(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_ledger_source ON commission_ledger(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_org ON commission_ledger(organisation_id);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_created ON commission_ledger(created_at DESC);

COMMENT ON TABLE commission_ledger IS 'Journal des commissions prélevées (escrow release, commandes boutique)';

ALTER TABLE commission_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read commission_ledger" ON commission_ledger;
CREATE POLICY "Admins read commission_ledger" ON commission_ledger FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins insert commission_ledger" ON commission_ledger;
CREATE POLICY "Admins insert commission_ledger" ON commission_ledger FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Les orgs peuvent lire les lignes qui les concernent (organisation_id = leur chambre)
DROP POLICY IF EXISTS "Orgs read own commission_ledger" ON commission_ledger;
CREATE POLICY "Orgs read own commission_ledger" ON commission_ledger FOR SELECT
  USING (
    organisation_id IN (
      SELECT id FROM chambres_metier WHERE admin_id = auth.uid()
      UNION
      SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()
    )
  );

-- ========== 3) Règles d'exemption ==========
CREATE TABLE IF NOT EXISTS exemption_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('organisation', 'category', 'user')),
  entity_id UUID NULL,
  category_id INTEGER NULL REFERENCES categories(id) ON DELETE CASCADE,
  reason TEXT NULL,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT exemption_entity_check CHECK (
    (entity_type = 'organisation' AND entity_id IS NOT NULL AND category_id IS NULL) OR
    (entity_type = 'category' AND category_id IS NOT NULL AND entity_id IS NULL) OR
    (entity_type = 'user' AND entity_id IS NOT NULL AND category_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_exemption_rules_entity ON exemption_rules(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_exemption_rules_category ON exemption_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_exemption_rules_valid ON exemption_rules(valid_from, valid_to);

COMMENT ON TABLE exemption_rules IS 'Exemptions de commission (par organisation, catégorie ou utilisateur)';

ALTER TABLE exemption_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read exemption_rules" ON exemption_rules;
CREATE POLICY "Admins read exemption_rules" ON exemption_rules FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins manage exemption_rules" ON exemption_rules;
CREATE POLICY "Admins manage exemption_rules" ON exemption_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE TRIGGER trg_exemption_rules_updated
  BEFORE UPDATE ON exemption_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== 4) Seed règle par défaut (commission plateforme globale) ==========
INSERT INTO commission_rules (code, name, scope_type, rule_type, value, applicable_to, valid_from)
VALUES ('default_platform_percent', 'Commission plateforme (défaut)', 'global', 'percent', 5.0000, 'project_escrow', NOW())
ON CONFLICT (code) DO NOTHING;
