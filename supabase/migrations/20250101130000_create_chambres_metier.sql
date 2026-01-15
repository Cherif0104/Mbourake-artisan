-- Migration: Système complet des Chambres de Métier
-- Création des tables et relations pour gérer l'affiliation des artisans

-- Table des Chambres de Métier
CREATE TABLE IF NOT EXISTS chambres_metier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- "Chambre de Métiers de Dakar"
  region TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  admin_id UUID REFERENCES profiles(id), -- Admin de la chambre
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des affiliations artisans (chambres, incubateurs, SAE, etc.)
CREATE TABLE IF NOT EXISTS artisan_affiliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chambre_id UUID REFERENCES chambres_metier(id) ON DELETE SET NULL,
  affiliation_type TEXT NOT NULL CHECK (affiliation_type IN ('chambre', 'incubateur', 'sae', 'autre')),
  affiliation_name TEXT, -- Nom de l'incubateur/SAE si autre que chambre
  affiliation_number TEXT, -- Numéro d'affiliation/certificat
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id), -- Admin qui a vérifié
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Un artisan peut avoir plusieurs affiliations mais une seule active par type
  UNIQUE(artisan_id, chambre_id) WHERE chambre_id IS NOT NULL
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_chambres_metier_region ON chambres_metier(region);
CREATE INDEX IF NOT EXISTS idx_chambres_metier_admin ON chambres_metier(admin_id);
CREATE INDEX IF NOT EXISTS idx_artisan_affiliations_artisan ON artisan_affiliations(artisan_id);
CREATE INDEX IF NOT EXISTS idx_artisan_affiliations_chambre ON artisan_affiliations(chambre_id);
CREATE INDEX IF NOT EXISTS idx_artisan_affiliations_status ON artisan_affiliations(status);
CREATE INDEX IF NOT EXISTS idx_artisan_affiliations_type ON artisan_affiliations(affiliation_type);

-- RLS Policies pour chambres_metier
ALTER TABLE chambres_metier ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les chambres actives
CREATE POLICY "Chambres actives visibles par tous"
  ON chambres_metier FOR SELECT
  USING (is_active = true);

-- Seuls les admins peuvent créer/modifier/supprimer
CREATE POLICY "Seuls les admins gèrent les chambres"
  ON chambres_metier FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies pour artisan_affiliations
ALTER TABLE artisan_affiliations ENABLE ROW LEVEL SECURITY;

-- Les artisans peuvent voir leurs propres affiliations
CREATE POLICY "Artisans voient leurs affiliations"
  ON artisan_affiliations FOR SELECT
  USING (artisan_id = auth.uid());

-- Les artisans peuvent créer leurs propres affiliations
CREATE POLICY "Artisans créent leurs affiliations"
  ON artisan_affiliations FOR INSERT
  WITH CHECK (artisan_id = auth.uid());

-- Les artisans peuvent modifier leurs affiliations en attente
CREATE POLICY "Artisans modifient leurs affiliations en attente"
  ON artisan_affiliations FOR UPDATE
  USING (artisan_id = auth.uid() AND status = 'pending')
  WITH CHECK (artisan_id = auth.uid() AND status = 'pending');

-- Les chambres de métier peuvent voir les affiliations de leur chambre
CREATE POLICY "Chambres voient leurs affiliations"
  ON artisan_affiliations FOR SELECT
  USING (
    chambre_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM chambres_metier
      WHERE chambres_metier.id = artisan_affiliations.chambre_id
      AND chambres_metier.admin_id = auth.uid()
    )
  );

-- Les admins chambres peuvent vérifier/rejeter les affiliations
CREATE POLICY "Admins chambres vérifient affiliations"
  ON artisan_affiliations FOR UPDATE
  USING (
    chambre_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM chambres_metier
      WHERE chambres_metier.id = artisan_affiliations.chambre_id
      AND chambres_metier.admin_id = auth.uid()
    )
  );

-- Les admins plateforme peuvent tout voir/gérer
CREATE POLICY "Admins plateforme gèrent tout"
  ON artisan_affiliations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insertion des chambres de métier par région (données initiales)
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

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_chambres_metier_updated_at BEFORE UPDATE ON chambres_metier
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artisan_affiliations_updated_at BEFORE UPDATE ON artisan_affiliations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Commentaires
COMMENT ON TABLE chambres_metier IS 'Chambres de Métiers du Sénégal par région';
COMMENT ON TABLE artisan_affiliations IS 'Affiliations des artisans (chambres, incubateurs, SAE)';
COMMENT ON COLUMN artisan_affiliations.affiliation_type IS 'Type: chambre, incubateur, sae, autre';
COMMENT ON COLUMN artisan_affiliations.status IS 'Statut: pending (en attente), verified (vérifié), rejected (rejeté)';
