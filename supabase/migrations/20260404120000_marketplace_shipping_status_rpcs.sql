-- Ancienne signature (un seul argument) : retirer pour éviter deux implémentations
DROP FUNCTION IF EXISTS create_marketplace_orders_from_cart(JSONB);

-- Panier : adresse de livraison partagée sur toutes les commandes créées
CREATE OR REPLACE FUNCTION create_marketplace_orders_from_cart(
  p_items JSONB,
  p_shipping_address JSONB DEFAULT NULL
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id UUID;
  v_item JSONB;
  v_product RECORD;
  v_artisan_id UUID;
  v_order_id UUID;
  v_result UUID[] := '{}';
  v_unit_price DECIMAL(12,2);
  v_order_total DECIMAL(12,2);
  v_qty INTEGER;
BEGIN
  v_buyer_id := auth.uid();
  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Panier vide';
  END IF;

  CREATE TEMP TABLE _cart_artisan_items (
    artisan_id UUID,
    product_id UUID,
    quantity INTEGER,
    unit_price DECIMAL(12,2),
    line_total DECIMAL(12,2),
    stock INTEGER
  ) ON COMMIT DROP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::INTEGER;
    IF v_item->>'product_id' IS NULL OR v_qty IS NULL OR v_qty < 1 THEN
      CONTINUE;
    END IF;

    SELECT id, artisan_id, title, status, price, stock, promo_percent
    INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::UUID
    FOR UPDATE;

    IF v_product.id IS NULL THEN
      RAISE EXCEPTION 'Produit introuvable: %', v_item->>'product_id';
    END IF;

    IF v_product.status != 'published' THEN
      RAISE EXCEPTION 'Produit non disponible: %', v_product.title;
    END IF;

    IF v_product.artisan_id = v_buyer_id THEN
      RAISE EXCEPTION 'Vous ne pouvez pas commander votre propre produit: %', v_product.title;
    END IF;

    IF v_product.stock IS NOT NULL AND v_product.stock < v_qty THEN
      RAISE EXCEPTION 'Stock insuffisant pour % (disponible: %)', v_product.title, v_product.stock;
    END IF;

    v_unit_price := (v_product.price::DECIMAL(12,2)) * (1 - COALESCE(v_product.promo_percent, 0)::DECIMAL / 100);

    INSERT INTO _cart_artisan_items (artisan_id, product_id, quantity, unit_price, line_total, stock)
    VALUES (v_product.artisan_id, v_product.id, v_qty, v_unit_price, v_unit_price * v_qty, v_product.stock);
  END LOOP;

  FOR v_artisan_id IN SELECT DISTINCT artisan_id FROM _cart_artisan_items
  LOOP
    SELECT COALESCE(SUM(line_total), 0) INTO v_order_total FROM _cart_artisan_items WHERE artisan_id = v_artisan_id;

    INSERT INTO orders (buyer_id, seller_id, total_amount, status, shipping_address)
    VALUES (v_buyer_id, v_artisan_id, v_order_total, 'pending', p_shipping_address)
    RETURNING id INTO v_order_id;

    v_result := array_append(v_result, v_order_id);

    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    SELECT v_order_id, product_id, quantity, unit_price
    FROM _cart_artisan_items
    WHERE artisan_id = v_artisan_id;

    UPDATE products p
    SET stock = p.stock - c.quantity, updated_at = NOW()
    FROM _cart_artisan_items c
    WHERE p.id = c.product_id AND c.artisan_id = v_artisan_id AND c.stock IS NOT NULL;
  END LOOP;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION create_marketplace_orders_from_cart(JSONB, JSONB) IS
  'Checkout panier: crée une commande par artisan. p_shipping_address optionnel (même pour toutes).';

-- Acheteur : shipped -> delivered
CREATE OR REPLACE FUNCTION buyer_confirm_marketplace_delivery(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id UUID;
BEGIN
  UPDATE orders o
  SET status = 'delivered', updated_at = NOW()
  WHERE o.id = p_order_id
    AND o.buyer_id = auth.uid()
    AND o.status = 'shipped'
  RETURNING o.seller_id INTO v_seller_id;

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Commande introuvable, non expédiée ou accès refusé';
  END IF;

  INSERT INTO notifications (user_id, type, title, message, data, is_read)
  VALUES (
    v_seller_id,
    'system',
    'Réception confirmée',
    'Le client a confirmé la réception de la commande.',
    jsonb_build_object(
      'kind', 'marketplace_order',
      'order_id', p_order_id,
      'status', 'delivered'
    ),
    false
  );
END;
$$;

COMMENT ON FUNCTION buyer_confirm_marketplace_delivery(UUID) IS
  'Acheteur : passage shipped -> delivered + notification vendeur.';

-- Vendeur : pending->confirmed ou confirmed->shipped + notification acheteur
CREATE OR REPLACE FUNCTION seller_advance_marketplace_order(p_order_id UUID, p_new_status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_title TEXT;
  v_msg TEXT;
BEGIN
  SELECT id, buyer_id, seller_id, status
  INTO v_row
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  IF v_row.seller_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF p_new_status NOT IN ('confirmed', 'shipped') THEN
    RAISE EXCEPTION 'Statut invalide';
  END IF;

  IF v_row.status = 'pending' AND p_new_status = 'confirmed' THEN
    v_title := 'Commande confirmée';
    v_msg := 'Votre commande a été confirmée par le vendeur.';
  ELSIF v_row.status = 'confirmed' AND p_new_status = 'shipped' THEN
    v_title := 'Commande expédiée';
    v_msg := 'Votre commande a été marquée comme expédiée.';
  ELSE
    RAISE EXCEPTION 'Transition de statut non autorisée';
  END IF;

  UPDATE orders
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_order_id;

  INSERT INTO notifications (user_id, type, title, message, data, is_read)
  VALUES (
    v_row.buyer_id,
    'system',
    v_title,
    v_msg,
    jsonb_build_object(
      'kind', 'marketplace_order',
      'order_id', p_order_id,
      'status', p_new_status
    ),
    false
  );
END;
$$;

COMMENT ON FUNCTION seller_advance_marketplace_order(UUID, TEXT) IS
  'Vendeur : pending->confirmed ou confirmed->shipped + notification acheteur.';

GRANT EXECUTE ON FUNCTION create_marketplace_orders_from_cart(JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION buyer_confirm_marketplace_delivery(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION seller_advance_marketplace_order(UUID, TEXT) TO authenticated;
-- Si la RPC existe déjà sur le projet : GRANT EXECUTE ON FUNCTION notify_artisan_new_order(UUID, UUID, TEXT, TEXT) TO authenticated;
