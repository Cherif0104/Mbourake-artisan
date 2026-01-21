-- ============================================
-- MIGRATION COMPLÈTE : Système d'affiliations avec chambres de métier
-- ============================================
-- À EXÉCUTER DANS SUPABASE SQL EDITOR
-- Date: 2025-01-21
-- ============================================

-- 1. Créer la table chambres_metier si elle n'existe pas
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

-- 2. Créer la table artisan_affiliations si elle n'existe pas
CREATE TABLE IF NOT EXISTS artisan_affiliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chambre_id UUID REFERENCES chambres_metier(id) ON DELETE SET NULL,
  affiliation_type TEXT NOT NULL CHECK (affiliation_type IN ('chambre', 'incubateur', 'sae', 'autre')),
  affiliation_name TEXT,
  affiliation_number TEXT,
  ninea TEXT,
  rccm TEXT,
  certificate_url TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(artisan_id, chambre_id) WHERE chambre_id IS NOT NULL
);

-- 3. Ajouter colonnes NINEA et RCCM si elles n'existent pas
ALTER TABLE artisan_affiliations
ADD COLUMN IF NOT EXISTS ninea TEXT;

ALTER TABLE artisan_affiliations
ADD COLUMN IF NOT EXISTS rccm TEXT;

ALTER TABLE artisan_affiliations
ADD COLUMN IF NOT EXISTS certificate_url TEXT;

-- 4. Insérer toutes les chambres de métier par région (14 régions du Sénégal)
INSERT INTO chambres_metier (name, region, address, phone, email) VALUES
  ('Chambre de Métiers de Dakar', 'Dakar', 'Avenue Malick Sy x Rue 6, Dakar', '+221 33 822 28 40', 'contact@cm-dakar.sn'),
  ('Chambre de Métiers de Thiès', 'Thiès', 'Quartier Escale, Thiès', '+221 33 951 11 58', 'contact@cm-thies.sn'),
  ('Chambre de Métiers de Saint-Louis', 'Saint-Louis', 'Quartier Nord, Saint-Louis', '+221 33 961 12 10', 'contact@cm-saintlouis.sn'),
  ('Chambre de Métiers de Diourbel', 'Diourbel', 'Route de Gossas, Diourbel', '+221 33 971 10 45', 'contact@cm-diourbel.sn'),
  ('Chambre de Métiers de Kaolack', 'Kaolack', 'Quartier Kasnack, Kaolack', '+221 33 941 12 30', 'contact@cm-kaolack.sn'),
  ('Chambre de Métiers de Ziguinchor', 'Ziguinchor', 'Boulevard de 50m, Ziguinchor', '+221 33 991 14 20', 'contact@cm-ziguinchor.sn'),
  ('Chambre de Métiers de Louga', 'Louga', 'Quartier Artillerie, Louga', '+221 33 967 11 05', 'contact@cm-louga.sn'),
  ('Chambre de Métiers de Fatick', 'Fatick', 'Quartier Escale, Fatick', '+221 33 949 10 15', 'contact@cm-fatick.sn'),
  ('Chambre de Métiers de Kolda', 'Kolda', 'Quartier Doumassou, Kolda', '+221 33 996 11 40', 'contact@cm-kolda.sn'),
  ('Chambre de Métiers de Matam', 'Matam', 'Quartier Soubalo, Matam', '+221 33 966 10 08', 'contact@cm-matam.sn'),
  ('Chambre de Métiers de Kaffrine', 'Kaffrine', 'Centre-ville, Kaffrine', '+221 33 946 10 10', 'contact@cm-kaffrine.sn'),
  ('Chambre de Métiers de Kédougou', 'Kédougou', 'Quartier Dandé Mayo, Kédougou', '+221 33 981 10 05', 'contact@cm-kedougou.sn'),
  ('Chambre de Métiers de Sédhiou', 'Sédhiou', 'Quartier Moricounda, Sédhiou', '+221 33 995 10 02', 'contact@cm-sedhiou.sn'),
  ('Chambre de Métiers de Tambacounda', 'Tambacounda', 'Quartier Liberté, Tambacounda', '+221 33 981 11 20', 'contact@cm-tambacounda.sn')
ON CONFLICT DO NOTHING;

-- 5. Créer les index
CREATE INDEX IF NOT EXISTS idx_chambres_metier_region ON chambres_metier(region);
CREATE INDEX IF NOT EXISTS idx_chambres_metier_admin ON chambres_metier(admin_id);
CREATE INDEX IF NOT EXISTS idx_artisan_affiliations_artisan ON artisan_affiliations(artisan_id);
CREATE INDEX IF NOT EXISTS idx_artisan_affiliations_chambre ON artisan_affiliations(chambre_id);
CREATE INDEX IF NOT EXISTS idx_artisan_affiliations_status ON artisan_affiliations(status);
CREATE INDEX IF NOT EXISTS idx_artisan_affiliations_type ON artisan_affiliations(affiliation_type);
CREATE INDEX IF NOT EXISTS idx_artisan_affiliations_ninea ON artisan_affiliations(ninea) WHERE ninea IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artisan_affiliations_rccm ON artisan_affiliations(rccm) WHERE rccm IS NOT NULL;

-- 6. Activer RLS
ALTER TABLE chambres_metier ENABLE ROW LEVEL SECURITY;
ALTER TABLE artisan_affiliations ENABLE ROW LEVEL SECURITY;

-- 7. Policies pour chambres_metier
DROP POLICY IF EXISTS "Chambres actives visibles par tous" ON chambres_metier;
CREATE POLICY "Chambres actives visibles par tous"
  ON chambres_metier FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Seuls les admins gèrent les chambres" ON chambres_metier;
CREATE POLICY "Seuls les admins gèrent les chambres"
  ON chambres_metier FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 8. Policies pour artisan_affiliations
DROP POLICY IF EXISTS "Artisans voient leurs affiliations" ON artisan_affiliations;
CREATE POLICY "Artisans voient leurs affiliations"
  ON artisan_affiliations FOR SELECT
  USING (artisan_id = auth.uid());

DROP POLICY IF EXISTS "Artisans créent leurs affiliations" ON artisan_affiliations;
CREATE POLICY "Artisans créent leurs affiliations"
  ON artisan_affiliations FOR INSERT
  WITH CHECK (artisan_id = auth.uid());

DROP POLICY IF EXISTS "Artisans modifient leurs affiliations en attente" ON artisan_affiliations;
CREATE POLICY "Artisans modifient leurs affiliations en attente"
  ON artisan_affiliations FOR UPDATE
  USING (artisan_id = auth.uid() AND status = 'pending')
  WITH CHECK (artisan_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Admins plateforme gèrent tout" ON artisan_affiliations;
CREATE POLICY "Admins plateforme gèrent tout"
  ON artisan_affiliations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 9. Commentaires
COMMENT ON TABLE chambres_metier IS 'Chambres de Métiers du Sénégal par région (14 régions)';
COMMENT ON TABLE artisan_affiliations IS 'Affiliations des artisans (chambres, incubateurs, SAE)';
COMMENT ON COLUMN artisan_affiliations.ninea IS 'Numéro d''Identification Nationale des Entreprises et Associations (NINEA)';
COMMENT ON COLUMN artisan_affiliations.rccm IS 'Registre du Commerce et du Crédit Mobilier (RCCM)';

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Vérifier que les tables existent :
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('chambres_metier', 'artisan_affiliations');

-- Vérifier les chambres créées :
-- SELECT name, region FROM chambres_metier ORDER BY region;

-- Vérifier les colonnes de artisan_affiliations :
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'artisan_affiliations' AND column_name IN ('ninea', 'rccm', 'certificate_url');
