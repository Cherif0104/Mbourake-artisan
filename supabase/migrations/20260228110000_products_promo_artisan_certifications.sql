-- Migration: Promo sur products + table artisan_certifications (CENEGEL Phase 3)

-- 1. Ajouter colonne promo sur products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS promo_percent INTEGER DEFAULT NULL CHECK (promo_percent IS NULL OR (promo_percent >= 0 AND promo_percent <= 100));

COMMENT ON COLUMN products.promo_percent IS 'Pourcentage de réduction (0-100). Si non null, afficher prix barré + prix promo.';

-- 2. Table artisan_certifications : diplômes, badges, reconnaissances
CREATE TABLE IF NOT EXISTS artisan_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'diplome' CHECK (type IN ('diplome', 'badge', 'reconnaissance')),
  image_url TEXT,
  issued_at DATE,
  issuer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artisan_certifications_artisan_id ON artisan_certifications(artisan_id);

-- RLS
ALTER TABLE artisan_certifications ENABLE ROW LEVEL SECURITY;

-- Lecture : tout le monde peut voir les certifications des artisans (profil public)
CREATE POLICY "artisan_certifications_select_public"
  ON artisan_certifications FOR SELECT
  USING (true);

-- Insert/Update/Delete : uniquement l'artisan concerné
CREATE POLICY "artisan_certifications_insert_own"
  ON artisan_certifications FOR INSERT
  WITH CHECK (auth.uid() = artisan_id);

CREATE POLICY "artisan_certifications_update_own"
  ON artisan_certifications FOR UPDATE
  USING (auth.uid() = artisan_id);

CREATE POLICY "artisan_certifications_delete_own"
  ON artisan_certifications FOR DELETE
  USING (auth.uid() = artisan_id);
