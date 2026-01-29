-- Rendre client_comments optionnel et ajouter frais sur les révisions
-- Date: 2025-01-28

-- client_comments peut être vide (optionnel)
ALTER TABLE quote_revisions
  ALTER COLUMN client_comments DROP NOT NULL;

-- Frais additionnels (optionnel), en FCFA
ALTER TABLE quote_revisions
  ADD COLUMN IF NOT EXISTS additional_fees NUMERIC;

COMMENT ON COLUMN quote_revisions.additional_fees IS 'Frais additionnels en FCFA (optionnel)';
