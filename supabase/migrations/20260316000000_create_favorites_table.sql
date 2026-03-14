-- Migration: Table favorites (artisans favoris des clients)
-- Permet aux clients connectés d'ajouter des artisans à leur liste de favoris

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  artisan_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, artisan_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_client_id ON favorites(client_id);
CREATE INDEX IF NOT EXISTS idx_favorites_artisan_id ON favorites(artisan_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Les clients voient uniquement leurs favoris
CREATE POLICY "Clients see own favorites"
  ON favorites FOR SELECT
  USING (client_id = auth.uid());

-- Les clients peuvent ajouter des favoris (eux-mêmes comme client_id)
CREATE POLICY "Clients insert own favorites"
  ON favorites FOR INSERT
  WITH CHECK (client_id = auth.uid());

-- Les clients peuvent supprimer leurs favoris
CREATE POLICY "Clients delete own favorites"
  ON favorites FOR DELETE
  USING (client_id = auth.uid());

-- Admins : gestion complète
CREATE POLICY "Admins manage all favorites"
  ON favorites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE favorites IS 'Artisans favoris des clients (liste de préférés)';
