-- Migration: Ajouter payment_mode sur orders (marketplace escrow)
-- Valeurs: on_delivery (défaut), escrow, relay

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'on_delivery'
  CHECK (payment_mode IN ('on_delivery', 'escrow', 'relay'));

COMMENT ON COLUMN orders.payment_mode IS 'Mode de paiement: on_delivery (à la livraison), escrow (séquestration), relay (point relais).';
