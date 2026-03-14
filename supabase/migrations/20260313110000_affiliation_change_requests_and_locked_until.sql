-- Phase 2 Affiliations: artisan_affiliations (if missing) + affiliation_locked_until + affiliation_change_requests

-- 1) Create artisan_affiliations if not exists
CREATE TABLE IF NOT EXISTS artisan_affiliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chambre_id UUID REFERENCES chambres_metier(id) ON DELETE SET NULL,
  affiliation_type TEXT NOT NULL DEFAULT 'chambre' CHECK (affiliation_type IN ('chambre', 'incubateur', 'sae', 'autre')),
  affiliation_name TEXT,
  affiliation_number TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artisan_affiliations_artisan ON artisan_affiliations(artisan_id);
CREATE INDEX IF NOT EXISTS idx_artisan_affiliations_chambre ON artisan_affiliations(chambre_id);
CREATE INDEX IF NOT EXISTS idx_artisan_affiliations_status ON artisan_affiliations(status);

-- 2) Champ affiliation_locked_until
ALTER TABLE artisan_affiliations ADD COLUMN IF NOT EXISTS affiliation_locked_until TIMESTAMPTZ NULL;

-- 3) Table affiliation_change_requests
CREATE TABLE IF NOT EXISTS affiliation_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_chambre_id UUID REFERENCES chambres_metier(id) ON DELETE SET NULL,
  to_chambre_id UUID NOT NULL REFERENCES chambres_metier(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ NULL,
  rejection_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliation_change_requests_artisan ON affiliation_change_requests(artisan_id);
CREATE INDEX IF NOT EXISTS idx_affiliation_change_requests_status ON affiliation_change_requests(status);

-- 4) Contrainte: une seule affiliation verified par artisan
CREATE UNIQUE INDEX IF NOT EXISTS idx_artisan_affiliations_one_verified_per_artisan
  ON artisan_affiliations (artisan_id) WHERE status = 'verified';

-- RLS artisan_affiliations (if not already)
ALTER TABLE artisan_affiliations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage artisan_affiliations" ON artisan_affiliations;
CREATE POLICY "Admins manage artisan_affiliations" ON artisan_affiliations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
DROP POLICY IF EXISTS "Artisans see own affiliations" ON artisan_affiliations;
CREATE POLICY "Artisans see own affiliations" ON artisan_affiliations FOR SELECT USING (artisan_id = auth.uid());

-- RLS affiliation_change_requests
ALTER TABLE affiliation_change_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "affiliation_change_requests_select" ON affiliation_change_requests;
CREATE POLICY "affiliation_change_requests_select" ON affiliation_change_requests FOR SELECT
  USING (artisan_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
DROP POLICY IF EXISTS "affiliation_change_requests_insert" ON affiliation_change_requests;
CREATE POLICY "affiliation_change_requests_insert" ON affiliation_change_requests FOR INSERT
  WITH CHECK (artisan_id = auth.uid());
DROP POLICY IF EXISTS "affiliation_change_requests_update" ON affiliation_change_requests;
CREATE POLICY "affiliation_change_requests_update" ON affiliation_change_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
