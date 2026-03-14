-- Migration: RPC pour notifier l'artisan d'une nouvelle commande
-- Contourne la RLS (insert user_id ≠ auth.uid()) en utilisant SECURITY DEFINER.

CREATE OR REPLACE FUNCTION notify_artisan_new_order(
  p_artisan_id UUID,
  p_order_id UUID,
  p_product_title TEXT,
  p_buyer_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_artisan_id IS NULL OR p_order_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO notifications (user_id, type, title, message, data, is_read)
  VALUES (
    p_artisan_id,
    'new_order',
    'Nouvelle commande',
    p_buyer_name || ' a commandé "' || COALESCE(p_product_title, 'Produit') || '". Consultez vos commandes boutique.',
    jsonb_build_object('order_id', p_order_id),
    false
  );
END;
$$;

COMMENT ON FUNCTION notify_artisan_new_order(UUID, UUID, TEXT, TEXT) IS
  'Crée une notification new_order pour l''artisan. Appelé par l''acheteur après création de commande.';
