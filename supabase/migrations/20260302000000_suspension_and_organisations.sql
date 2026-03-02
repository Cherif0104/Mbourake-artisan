-- Migration: Suspension de comptes + Organisations (sous-rôles)
-- Phase 1: is_suspended sur profiles, RLS admin UPDATE
-- Phase 2: organisation_type sur chambres_metier, table organisation_members

-- ========== Phase 1: Suspension ==========
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

COMMENT ON COLUMN profiles.is_suspended IS 'Compte bloqué par un admin (fraude, arnaque, etc.)';
COMMENT ON COLUMN profiles.suspended_at IS 'Date de suspension';
COMMENT ON COLUMN profiles.suspended_reason IS 'Raison interne (optionnel)';

-- Policy: les admins peuvent mettre à jour tout profil (rôle, suspension)
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ========== Phase 2: Organisations et sous-rôles ==========
ALTER TABLE chambres_metier
  ADD COLUMN IF NOT EXISTS organisation_type TEXT DEFAULT 'chambre'
  CHECK (organisation_type IN ('chambre', 'incubateur', 'sae', 'centre_formation', 'autre'));

COMMENT ON COLUMN chambres_metier.organisation_type IS 'Type de structure partenaire';

-- Table des membres d'une organisation (sous-rôles)
CREATE TABLE IF NOT EXISTS organisation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES chambres_metier(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN (
    'admin_org', 'manager', 'formateur', 'facilitateur', 'conseil_client', 'gestionnaire_dossiers'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organisation_id)
);

CREATE INDEX IF NOT EXISTS idx_organisation_members_user ON organisation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organisation_members_org ON organisation_members(organisation_id);

COMMENT ON TABLE organisation_members IS 'Membres et rôles par organisation partenaire (chambre, SAE, incubateur, etc.)';

ALTER TABLE organisation_members ENABLE ROW LEVEL SECURITY;

-- Admins plateforme voient et gèrent tout
CREATE POLICY "Admins manage organisation_members"
  ON organisation_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admin d'une chambre (admin_id) peut gérer les membres de sa chambre
CREATE POLICY "Chambre admin manages members"
  ON organisation_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chambres_metier cm
      WHERE cm.id = organisation_members.organisation_id AND cm.admin_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chambres_metier cm
      WHERE cm.id = organisation_members.organisation_id AND cm.admin_id = auth.uid()
    )
  );

-- Les membres peuvent lire leur propre entrée
CREATE POLICY "Members read own row"
  ON organisation_members FOR SELECT
  USING (user_id = auth.uid());
