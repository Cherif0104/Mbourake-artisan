-- Migration: Ajout de la possibilité pour les artisans de répondre aux commentaires
-- Date: 2025-01-21

-- Ajouter colonnes pour la réponse de l'artisan
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS artisan_response TEXT;

ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS artisan_response_at TIMESTAMPTZ;

-- Commentaires pour documentation
COMMENT ON COLUMN reviews.artisan_response IS 'Réponse de l''artisan au commentaire du client';
COMMENT ON COLUMN reviews.artisan_response_at IS 'Date et heure de la réponse de l''artisan';

-- Index pour optimiser les requêtes (reviews avec réponses)
CREATE INDEX IF NOT EXISTS idx_reviews_artisan_response ON reviews(artisan_id, artisan_response_at) 
  WHERE artisan_response IS NOT NULL;
