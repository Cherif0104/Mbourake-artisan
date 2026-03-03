-- Sprint 3 gouvernance : demandes de suppression de compte (workflow 2 étapes)
-- Étape 1 : l'utilisateur demande la suppression (requested)
-- Étape 2 : l'utilisateur confirme dans les paramètres (confirmed) → puis l'admin exécute (executed)

CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'confirmed', 'cancelled', 'rejected', 'executed')),
  reason TEXT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  rejected_at TIMESTAMPTZ NULL,
  rejected_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  admin_notes TEXT NULL,
  executed_at TIMESTAMPTZ NULL,
  executed_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deletion_requests_user_pending
  ON deletion_requests(user_id)
  WHERE status IN ('requested', 'confirmed');

CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_requested_at ON deletion_requests(requested_at DESC);

COMMENT ON TABLE deletion_requests IS 'Demandes de suppression de compte (workflow 2 étapes : demande → confirmation user → exécution admin)';

ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

-- L'utilisateur peut créer sa propre demande (une seule en requested/confirmed)
DROP POLICY IF EXISTS "User insert own deletion_request" ON deletion_requests;
CREATE POLICY "User insert own deletion_request" ON deletion_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- L'utilisateur peut lire ses propres demandes
DROP POLICY IF EXISTS "User read own deletion_requests" ON deletion_requests;
CREATE POLICY "User read own deletion_requests" ON deletion_requests FOR SELECT
  USING (user_id = auth.uid());

-- L'utilisateur peut mettre à jour sa demande uniquement si status = requested (confirmer ou annuler)
DROP POLICY IF EXISTS "User update own requested" ON deletion_requests;
CREATE POLICY "User update own requested" ON deletion_requests FOR UPDATE
  USING (user_id = auth.uid() AND status = 'requested')
  WITH CHECK (user_id = auth.uid());

-- Admins : tout
DROP POLICY IF EXISTS "Admins read deletion_requests" ON deletion_requests;
CREATE POLICY "Admins read deletion_requests" ON deletion_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins update deletion_requests" ON deletion_requests;
CREATE POLICY "Admins update deletion_requests" ON deletion_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE TRIGGER trg_deletion_requests_updated
  BEFORE UPDATE ON deletion_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
