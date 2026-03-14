-- Migration: RPC create_marketplace_orders_from_cart
-- Crée une commande par artisan à partir du panier (items: [{product_id, quantity}]).
-- Retourne un tableau d'order_id (un par artisan).

CREATE OR REPLACE FUNCTION create_marketplace_orders_from_cart(p_items JSONB)
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

  -- Table temporaire: artisan_id, product_id, quantity, unit_price, line_total
  CREATE TEMP TABLE _cart_artisan_items (
    artisan_id UUID,
    product_id UUID,
    quantity INTEGER,
    unit_price DECIMAL(12,2),
    line_total DECIMAL(12,2),
    stock INTEGER
  ) ON COMMIT DROP;

  -- Valider chaque item et remplir la table
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

  -- Créer une commande par artisan
  FOR v_artisan_id IN SELECT DISTINCT artisan_id FROM _cart_artisan_items
  LOOP
    SELECT COALESCE(SUM(line_total), 0) INTO v_order_total FROM _cart_artisan_items WHERE artisan_id = v_artisan_id;

    INSERT INTO orders (buyer_id, seller_id, total_amount, status, shipping_address)
    VALUES (v_buyer_id, v_artisan_id, v_order_total, 'pending', NULL)
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

COMMENT ON FUNCTION create_marketplace_orders_from_cart(JSONB) IS
  'Checkout panier: crée une commande par artisan à partir des items. Retourne order_ids.';
