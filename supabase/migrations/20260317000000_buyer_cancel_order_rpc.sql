-- L'acheteur peut annuler sa commande tant qu'elle est en attente (pending).

CREATE OR REPLACE FUNCTION cancel_order_by_buyer(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE orders
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_order_id
    AND buyer_id = auth.uid()
    AND status = 'pending';
END;
$$;

COMMENT ON FUNCTION cancel_order_by_buyer(UUID) IS
  'Permet à l''acheteur d''annuler sa commande si elle est encore en attente.';
