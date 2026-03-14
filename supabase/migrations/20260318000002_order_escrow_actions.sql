-- Migration: RPCs admin pour piloter les order_escrows (débloquer, rembourser, geler, dégeler)
-- + RPC pour marquer payé (passage pending → held) en mode manuel V1

CREATE OR REPLACE FUNCTION release_order_escrow(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escrow RECORD;
  v_order RECORD;
  v_commission_pct DECIMAL(5,2) := 10;
  v_platform DECIMAL(12,2);
  v_artisan DECIMAL(12,2);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Accès réservé aux admins';
  END IF;

  SELECT * INTO v_escrow FROM order_escrows WHERE order_id = p_order_id FOR UPDATE;
  IF v_escrow.id IS NULL THEN
    RAISE EXCEPTION 'Aucun escrow pour cette commande';
  END IF;
  IF v_escrow.status != 'held' THEN
    RAISE EXCEPTION 'Seul un escrow en "held" peut être débloqué (actuel: %)', v_escrow.status;
  END IF;

  v_platform := ROUND(v_escrow.total_amount * v_commission_pct / 100, 2);
  v_artisan := v_escrow.total_amount - v_platform;

  UPDATE order_escrows
  SET status = 'released',
      released_at = NOW(),
      platform_commission = v_platform,
      artisan_payout = v_artisan,
      commission_amount = v_platform,
      partner_commission = 0,
      updated_at = NOW()
  WHERE order_id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION refund_order_escrow(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Accès réservé aux admins';
  END IF;

  UPDATE order_escrows
  SET status = 'refunded', updated_at = NOW()
  WHERE order_id = p_order_id
    AND status IN ('pending', 'held');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Escrow introuvable ou statut non remboursable';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION freeze_order_escrow(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Accès réservé aux admins';
  END IF;

  UPDATE order_escrows
  SET status = 'frozen', updated_at = NOW()
  WHERE order_id = p_order_id AND status = 'held';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Escrow introuvable ou non gelable (doit être "held")';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION unfreeze_order_escrow(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Accès réservé aux admins';
  END IF;

  UPDATE order_escrows
  SET status = 'held', updated_at = NOW()
  WHERE order_id = p_order_id AND status = 'frozen';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Escrow introuvable ou non dégelable (doit être "frozen")';
  END IF;
END;
$$;

-- Marquer payé (pending → held) pour la V1 sans intégration Wave
CREATE OR REPLACE FUNCTION mark_order_escrow_paid(p_order_id UUID, p_transaction_reference TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Accès réservé aux admins';
  END IF;

  UPDATE order_escrows
  SET status = 'held',
      transaction_reference = COALESCE(p_transaction_reference, transaction_reference),
      updated_at = NOW()
  WHERE order_id = p_order_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Escrow introuvable ou déjà payé (doit être "pending")';
  END IF;
END;
$$;

COMMENT ON FUNCTION release_order_escrow(UUID) IS 'Débloque l''escrow vers l''artisan (admin).';
COMMENT ON FUNCTION refund_order_escrow(UUID) IS 'Rembourse le client (admin).';
COMMENT ON FUNCTION freeze_order_escrow(UUID) IS 'Gèle l''escrow (litige, admin).';
COMMENT ON FUNCTION unfreeze_order_escrow(UUID) IS 'Dégèle l''escrow (admin).';
COMMENT ON FUNCTION mark_order_escrow_paid(UUID, TEXT) IS 'Marque l''escrow comme payé (admin, V1 manuel).';
