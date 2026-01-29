-- Migration: Tracker de confirmation de clôture par le client
-- Tant que le client n'a pas confirmé, l'admin ne clôture pas.
-- Une fois client_confirmed_closure_at rempli, l'admin peut "Clôturer et payer l'artisan".

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS client_confirmed_closure_at TIMESTAMPTZ;

COMMENT ON COLUMN projects.client_confirmed_closure_at IS 'Date à laquelle le client a confirmé la fin des travaux et demandé la clôture. L''admin déclenche alors le paiement vers l''artisan.';
