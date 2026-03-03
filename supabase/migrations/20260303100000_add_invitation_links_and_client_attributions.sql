-- Migration: Liens d'invitation (artisans / clients) et attributions clients
-- Phase 3 du plan super admin
-- Prérequis : chambres_metier et organisation_members. Si absents (migrations antérieures non jouées), on les crée ici.

-- Créer chambres_metier si elle n'existe pas (dépendance de invitation_links et client_attributions)
CREATE TABLE IF NOT EXISTS chambres_metier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  admin_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chambres_metier ADD COLUMN IF NOT EXISTS organisation_type TEXT DEFAULT 'chambre';

ALTER TABLE chambres_metier ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chambres actives visibles par tous" ON chambres_metier;
CREATE POLICY "Chambres actives visibles par tous" ON chambres_metier FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Seuls les admins gèrent les chambres" ON chambres_metier;
CREATE POLICY "Seuls les admins gèrent les chambres" ON chambres_metier FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Créer organisation_members si elle n'existe pas (référencée dans les policies)
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

ALTER TABLE organisation_members ENABLE ROW LEVEL SECURITY;

-- Policies organisation_members (au cas où la migration 20260302 n'a pas été jouée)
DROP POLICY IF EXISTS "Admins manage organisation_members" ON organisation_members;
CREATE POLICY "Admins manage organisation_members"
  ON organisation_members FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Chambre admin manages members" ON organisation_members;
CREATE POLICY "Chambre admin manages members"
  ON organisation_members FOR ALL
  USING (EXISTS (SELECT 1 FROM chambres_metier cm WHERE cm.id = organisation_members.organisation_id AND cm.admin_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM chambres_metier cm WHERE cm.id = organisation_members.organisation_id AND cm.admin_id = auth.uid()));

DROP POLICY IF EXISTS "Members read own row" ON organisation_members;
CREATE POLICY "Members read own row"
  ON organisation_members FOR SELECT
  USING (user_id = auth.uid());

-- Table des liens d'invitation
CREATE TABLE IF NOT EXISTS invitation_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  organisation_id UUID NOT NULL REFERENCES chambres_metier(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invitation_type TEXT NOT NULL CHECK (invitation_type IN ('artisan', 'client')),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitation_links_token ON invitation_links(token);
CREATE INDEX IF NOT EXISTS idx_invitation_links_organisation ON invitation_links(organisation_id);
CREATE INDEX IF NOT EXISTS idx_invitation_links_expires ON invitation_links(expires_at);

COMMENT ON TABLE invitation_links IS 'Liens d''invitation générés par les orgs pour rattacher artisans ou clients';

ALTER TABLE invitation_links ENABLE ROW LEVEL SECURITY;

-- Admins plateforme : tout
DROP POLICY IF EXISTS "Admins manage invitation_links" ON invitation_links;
CREATE POLICY "Admins manage invitation_links"
  ON invitation_links FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Admin d'une chambre ou membre manager/admin_org : créer et lire les liens de son org
DROP POLICY IF EXISTS "Org managers create and read invitation_links" ON invitation_links;
CREATE POLICY "Org managers create and read invitation_links"
  ON invitation_links FOR ALL
  USING (
    organisation_id IN (
      SELECT id FROM chambres_metier WHERE admin_id = auth.uid()
      UNION
      SELECT organisation_id FROM organisation_members
       WHERE user_id = auth.uid() AND role IN ('admin_org', 'manager')
    )
  )
  WITH CHECK (
    organisation_id IN (
      SELECT id FROM chambres_metier WHERE admin_id = auth.uid()
      UNION
      SELECT organisation_id FROM organisation_members
       WHERE user_id = auth.uid() AND role IN ('admin_org', 'manager')
    )
  );

-- RPC publique : valider un token et retourner le type (pour la page /invite/:token sans exposer la table)
CREATE OR REPLACE FUNCTION get_invitation_info(in_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  IF in_token IS NULL OR in_token = '' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Token manquant');
  END IF;

  SELECT invitation_type, used_at, expires_at INTO rec
  FROM invitation_links
  WHERE token = in_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Lien invalide');
  END IF;

  IF rec.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Lien déjà utilisé');
  END IF;

  IF rec.expires_at IS NOT NULL AND rec.expires_at < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Lien expiré');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'invitation_type', rec.invitation_type,
    'role', rec.invitation_type
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_invitation_info(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_invitation_info(TEXT) TO authenticated;

-- RPC : consommer un lien d'invitation (appelée après inscription par l'utilisateur connecté)
CREATE OR REPLACE FUNCTION consume_invitation(in_token TEXT, in_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link_row invitation_links%ROWTYPE;
  org_id UUID;
  inv_type TEXT;
BEGIN
  IF in_token IS NULL OR in_token = '' OR in_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Paramètres manquants');
  END IF;

  SELECT * INTO link_row
  FROM invitation_links
  WHERE token = in_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Lien invalide');
  END IF;

  IF link_row.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Lien déjà utilisé');
  END IF;

  IF link_row.expires_at IS NOT NULL AND link_row.expires_at < NOW() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Lien expiré');
  END IF;

  org_id := link_row.organisation_id;
  inv_type := link_row.invitation_type;

  IF inv_type = 'artisan' THEN
    INSERT INTO artisan_affiliations (artisan_id, chambre_id, affiliation_type, status)
    VALUES (in_user_id, org_id, 'chambre', 'verified')
    ON CONFLICT DO NOTHING;
  ELSIF inv_type = 'client' THEN
    INSERT INTO client_attributions (client_id, organisation_id, invitation_link_id, invited_by_user_id, source)
    VALUES (in_user_id, org_id, link_row.id, link_row.created_by, 'invitation_link');
  END IF;

  UPDATE invitation_links SET used_at = NOW() WHERE id = link_row.id;

  RETURN jsonb_build_object('ok', true, 'organisation_id', org_id, 'invitation_type', inv_type);
END;
$$;

COMMENT ON FUNCTION consume_invitation IS 'Consomme un lien d''invitation et rattache l''utilisateur à l''organisation (artisan → affiliation, client → attribution)';
GRANT EXECUTE ON FUNCTION consume_invitation(TEXT, UUID) TO authenticated;

-- Table des attributions clients (parrainage)
CREATE TABLE IF NOT EXISTS client_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES chambres_metier(id) ON DELETE CASCADE,
  invited_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invitation_link_id UUID REFERENCES invitation_links(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'invitation_link',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_attributions_client ON client_attributions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_attributions_organisation ON client_attributions(organisation_id);

COMMENT ON TABLE client_attributions IS 'Attribution d''un client à une organisation (parrainage, rémunération)';

ALTER TABLE client_attributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read client_attributions" ON client_attributions;
CREATE POLICY "Admins read client_attributions"
  ON client_attributions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Org members read their org client_attributions" ON client_attributions;
CREATE POLICY "Org members read their org client_attributions"
  ON client_attributions FOR SELECT
  USING (
    organisation_id IN (
      SELECT id FROM chambres_metier WHERE admin_id = auth.uid()
      UNION
      SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()
    )
  );

-- Insert depuis la RPC consume_invitation (service role ou SECURITY DEFINER)
-- On autorise l'insert pour l'utilisateur connecté quand client_id = auth.uid() (auto-attribution après inscription)
DROP POLICY IF EXISTS "User can insert own client_attribution" ON client_attributions;
CREATE POLICY "User can insert own client_attribution"
  ON client_attributions FOR INSERT
  WITH CHECK (client_id = auth.uid());
