-- Migration: Table order_escrows pour la séquestration marketplace
-- Une ligne par commande quand payment_mode = escrow (ou relay)

CREATE TABLE IF NOT EXISTS order_escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  total_amount DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'held', 'released', 'refunded', 'frozen')),
  commission_amount DECIMAL(12, 2),
  artisan_payout DECIMAL(12, 2),
  platform_commission DECIMAL(12, 2),
  partner_commission DECIMAL(12, 2),
  payment_method TEXT,
  transaction_reference TEXT,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_order_escrows_order_id ON order_escrows(order_id);
CREATE INDEX IF NOT EXISTS idx_order_escrows_status ON order_escrows(status);

ALTER TABLE order_escrows ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent lire et modifier les order_escrows
CREATE POLICY "Admins manage order_escrows"
  ON order_escrows FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE TRIGGER update_order_escrows_updated_at
  BEFORE UPDATE ON order_escrows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE order_escrows IS 'Séquestration (escrow) des paiements marketplace par commande.';
