-- Sprint 2: Contrats organisation v1 + réaffectation tracée

-- ========== 1) Contrats organisation ==========
CREATE TABLE IF NOT EXISTS organisation_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES chambres_metier(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'partenariat' CHECK (contract_type IN ('partenariat', 'convention', 'accord_cadre', 'autre')),
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'actif', 'expire', 'resilie')),
  starts_at DATE NULL,
  ends_at DATE NULL,
  signed_at TIMESTAMPTZ NULL,
  document_url TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organisation_contracts_org ON organisation_contracts(organisation_id);
CREATE INDEX IF NOT EXISTS idx_organisation_contracts_status ON organisation_contracts(status);

COMMENT ON TABLE organisation_contracts IS 'Contrats entre la plateforme et une organisation partenaire (v1)';

ALTER TABLE organisation_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage organisation_contracts" ON organisation_contracts;
CREATE POLICY "Admins manage organisation_contracts"
  ON organisation_contracts FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Org admins read organisation_contracts" ON organisation_contracts;
CREATE POLICY "Org admins read organisation_contracts"
  ON organisation_contracts FOR SELECT
  USING (
    organisation_id IN (
      SELECT id FROM chambres_metier WHERE admin_id = auth.uid()
      UNION
      SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()
    )
  );

-- Trigger updated_at
CREATE TRIGGER trg_organisation_contracts_updated
  BEFORE UPDATE ON organisation_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== 2) Réaffectation tracée (client d'une org vers une autre) ==========
-- Colonne ended_at sur client_attributions pour clôturer une attribution sans la supprimer
ALTER TABLE client_attributions ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN client_attributions.ended_at IS 'Date de fin d''attribution (réaffectation ou résiliation)';

-- Table des transferts (traçabilité)
CREATE TABLE IF NOT EXISTS client_attribution_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_organisation_id UUID NOT NULL REFERENCES chambres_metier(id) ON DELETE CASCADE,
  to_organisation_id UUID NOT NULL REFERENCES chambres_metier(id) ON DELETE CASCADE,
  transferred_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_attribution_transfers_client ON client_attribution_transfers(client_id);
CREATE INDEX IF NOT EXISTS idx_client_attribution_transfers_from ON client_attribution_transfers(from_organisation_id);
CREATE INDEX IF NOT EXISTS idx_client_attribution_transfers_to ON client_attribution_transfers(to_organisation_id);

COMMENT ON TABLE client_attribution_transfers IS 'Historique des réaffectations de clients entre organisations (traçabilité)';

ALTER TABLE client_attribution_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage client_attribution_transfers" ON client_attribution_transfers;
CREATE POLICY "Admins manage client_attribution_transfers"
  ON client_attribution_transfers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Org read client_attribution_transfers" ON client_attribution_transfers;
CREATE POLICY "Org read client_attribution_transfers"
  ON client_attribution_transfers FOR SELECT
  USING (
    from_organisation_id IN (SELECT id FROM chambres_metier WHERE admin_id = auth.uid() UNION SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
    OR to_organisation_id IN (SELECT id FROM chambres_metier WHERE admin_id = auth.uid() UNION SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

-- Admins peuvent mettre à jour (ended_at) et insérer des attributions (réaffectation)
DROP POLICY IF EXISTS "Admins update client_attributions" ON client_attributions;
CREATE POLICY "Admins update client_attributions"
  ON client_attributions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins insert client_attributions" ON client_attributions;
CREATE POLICY "Admins insert client_attributions"
  ON client_attributions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
