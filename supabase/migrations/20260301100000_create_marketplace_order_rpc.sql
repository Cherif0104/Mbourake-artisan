-- Migration: RPC create_marketplace_order pour checkout transactionnel
-- Crée une commande (order + order_items), vérifie stock et applique promo.

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
BEGIN
  v_buyer_id := auth.uid();
  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'Quantité invalide';
  END IF;

  -- Verrouiller le produit et lire ses infos
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

  -- Contrôle stock (NULL = illimité)
  IF v_product.stock IS NOT NULL AND v_product.stock < p_quantity THEN
    RAISE EXCEPTION 'Stock insuffisant (disponible: %)', v_product.stock;
  END IF;

  -- Prix unitaire avec promo
  v_unit_price := (v_product.price::DECIMAL(12,2)) * (1 - COALESCE(v_product.promo_percent, 0)::DECIMAL / 100);
  v_total := v_unit_price * p_quantity;

  -- Créer la commande
  INSERT INTO orders (buyer_id, seller_id, total_amount, status, shipping_address)
  VALUES (v_buyer_id, v_product.artisan_id, v_total, 'pending', p_shipping_address)
  RETURNING id INTO v_order_id;

  -- Ligne de commande
  INSERT INTO order_items (order_id, product_id, quantity, unit_price)
  VALUES (v_order_id, p_product_id, p_quantity, v_unit_price);

  -- Décrémenter le stock si géré
  IF v_product.stock IS NOT NULL THEN
    UPDATE products
    SET stock = stock - p_quantity,
        updated_at = NOW()
    WHERE id = p_product_id;
  END IF;

  RETURN v_order_id;
END;
$$;

COMMENT ON FUNCTION create_marketplace_order(UUID, INTEGER, JSONB) IS
  'Checkout marketplace: crée une commande pour un produit, vérifie stock et applique promo. Retourne order_id.';
