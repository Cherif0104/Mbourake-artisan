-- ============================================
-- MIGRATION : Ajout de champs supplémentaires pour les révisions
-- ============================================
-- À EXÉCUTER DANS SUPABASE SQL EDITOR
-- Date: 2025-01-21
-- ============================================

-- Ajouter colonnes pour prix suggéré, message vocal et document
ALTER TABLE quote_revisions
ADD COLUMN IF NOT EXISTS suggested_price NUMERIC;

ALTER TABLE quote_revisions
ADD COLUMN IF NOT EXISTS audio_url TEXT;

ALTER TABLE quote_revisions
ADD COLUMN IF NOT EXISTS document_url TEXT;

-- Commentaires pour documentation
COMMENT ON COLUMN quote_revisions.suggested_price IS 'Prix suggéré par le client (optionnel)';
COMMENT ON COLUMN quote_revisions.audio_url IS 'URL du message vocal du client (optionnel)';
COMMENT ON COLUMN quote_revisions.document_url IS 'URL du document/facture joint par le client (optionnel)';

-- ============================================
-- VÉRIFICATION (optionnel)
-- ============================================
-- Exécutez cette requête pour vérifier que les colonnes ont été ajoutées :
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'quote_revisions' AND column_name IN ('suggested_price', 'audio_url', 'document_url');
