-- Assure la notification artisan côté serveur lors de la création d'une commande marketplace.
-- Objectif: ne plus dépendre d'un appel front susceptible d'échouer silencieusement.

CREATE OR REPLACE FUNCTION create_marketplace_order(
  p_product_id UUID,
  p_quantity INTEGER,
  p_shipping_address JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id UUID;
  v_product RECORD;
  v_unit_price DECIMAL(12,2);
  v_total DECIMAL(12,2);
  v_order_id UUID;
  v_buyer_name TEXT;
BEGIN
  v_buyer_id := auth.uid();
  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'Quantité invalide';
  END IF;

  SELECT id, artisan_id, title, status, price, stock, promo_percent
  INTO v_product
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF v_product.id IS NULL THEN
    RAISE EXCEPTION 'Produit introuvable';
  END IF;

  IF v_product.status != 'published' THEN
    RAISE EXCEPTION 'Produit non disponible à la vente';
  END IF;

  IF v_product.artisan_id = v_buyer_id THEN
    RAISE EXCEPTION 'Vous ne pouvez pas commander votre propre produit';
  END IF;

  IF v_product.stock IS NOT NULL AND v_product.stock < p_quantity THEN
    RAISE EXCEPTION 'Stock insuffisant (disponible: %)', v_product.stock;
  END IF;

  v_unit_price := (v_product.price::DECIMAL(12,2)) * (1 - COALESCE(v_product.promo_percent, 0)::DECIMAL / 100);
  v_total := v_unit_price * p_quantity;

  INSERT INTO orders (buyer_id, seller_id, total_amount, status, shipping_address)
  VALUES (v_buyer_id, v_product.artisan_id, v_total, 'pending', p_shipping_address)
  RETURNING id INTO v_order_id;

  INSERT INTO order_items (order_id, product_id, quantity, unit_price)
  VALUES (v_order_id, p_product_id, p_quantity, v_unit_price);

  IF v_product.stock IS NOT NULL THEN
    UPDATE products
    SET stock = stock - p_quantity,
        updated_at = NOW()
    WHERE id = p_product_id;
  END IF;

  SELECT COALESCE(NULLIF(TRIM(full_name), ''), 'Un client')
  INTO v_buyer_name
  FROM profiles
  WHERE id = v_buyer_id;

  INSERT INTO notifications (user_id, type, title, message, data, is_read)
  VALUES (
    v_product.artisan_id,
    'new_order',
    'Nouvelle commande',
    COALESCE(v_buyer_name, 'Un client') || ' a commandé "' || COALESCE(v_product.title, 'Produit') || '". Consultez vos commandes boutique.',
    jsonb_build_object('order_id', v_order_id),
    false
  );

  RETURN v_order_id;
END;
$$;

COMMENT ON FUNCTION create_marketplace_order(UUID, INTEGER, JSONB) IS
  'Checkout marketplace: crée une commande pour un produit, vérifie stock, notifie l''artisan et retourne order_id.';

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
  v_buyer_name TEXT;
  v_first_title TEXT;
BEGIN
  v_buyer_id := auth.uid();
  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Panier vide';
  END IF;

  SELECT COALESCE(NULLIF(TRIM(full_name), ''), 'Un client')
  INTO v_buyer_name
  FROM profiles
  WHERE id = v_buyer_id;

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

    SELECT p.title
    INTO v_first_title
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = v_order_id
    LIMIT 1;

    INSERT INTO notifications (user_id, type, title, message, data, is_read)
    VALUES (
      v_artisan_id,
      'new_order',
      'Nouvelle commande',
      COALESCE(v_buyer_name, 'Un client') || ' a commandé "' || COALESCE(v_first_title, 'Produit') || '". Consultez vos commandes boutique.',
      jsonb_build_object('order_id', v_order_id),
      false
    );
  END LOOP;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION create_marketplace_orders_from_cart(JSONB, JSONB) IS
  'Checkout panier: crée une commande par artisan, notifie chaque artisan et retourne order_ids.';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'notify_artisan_new_order'
      AND pg_get_function_identity_arguments(p.oid) = 'uuid, uuid, text, text'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.notify_artisan_new_order(UUID, UUID, TEXT, TEXT) TO authenticated';
  END IF;
END;
$$;
