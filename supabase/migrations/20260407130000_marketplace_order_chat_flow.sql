-- Chat de commande marketplace: ouvrir une discussion directe acheteur <-> artisan
-- pendant le cycle de commande via un projet de chat lié à la commande.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS chat_project_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_chat_project_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_chat_project_id_fkey
      FOREIGN KEY (chat_project_id)
      REFERENCES public.projects(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_orders_chat_project_id
  ON public.orders(chat_project_id);

CREATE OR REPLACE FUNCTION public.ensure_marketplace_order_chat(
  p_order_id UUID,
  p_title TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_chat_project_id UUID;
  v_first_title TEXT;
  v_title TEXT;
BEGIN
  SELECT id, buyer_id, seller_id, status, chat_project_id
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  IF auth.uid() IS DISTINCT FROM v_order.buyer_id
     AND auth.uid() IS DISTINCT FROM v_order.seller_id THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Discussion indisponible pour une commande annulée';
  END IF;

  IF v_order.chat_project_id IS NOT NULL THEN
    RETURN v_order.chat_project_id;
  END IF;

  SELECT p.title
  INTO v_first_title
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = p_order_id
  LIMIT 1;

  v_title := COALESCE(NULLIF(TRIM(p_title), ''), NULLIF(TRIM(v_first_title), ''), 'Commande marketplace');

  INSERT INTO public.projects (
    client_id,
    target_artisan_id,
    title,
    status,
    is_open,
    updated_at
  )
  VALUES (
    v_order.buyer_id,
    v_order.seller_id,
    'Commande: ' || v_title,
    'in_progress',
    false,
    NOW()
  )
  RETURNING id INTO v_chat_project_id;

  UPDATE public.orders
  SET chat_project_id = v_chat_project_id,
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN v_chat_project_id;
END;
$$;

COMMENT ON FUNCTION public.ensure_marketplace_order_chat(UUID, TEXT) IS
  'Crée (si absent) et retourne le projet de chat lié à une commande marketplace.';

GRANT EXECUTE ON FUNCTION public.ensure_marketplace_order_chat(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_marketplace_order(
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
  FROM public.products
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

  INSERT INTO public.orders (buyer_id, seller_id, total_amount, status, shipping_address)
  VALUES (v_buyer_id, v_product.artisan_id, v_total, 'pending', p_shipping_address)
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
  VALUES (v_order_id, p_product_id, p_quantity, v_unit_price);

  IF v_product.stock IS NOT NULL THEN
    UPDATE public.products
    SET stock = stock - p_quantity,
        updated_at = NOW()
    WHERE id = p_product_id;
  END IF;

  PERFORM public.ensure_marketplace_order_chat(v_order_id, v_product.title);

  SELECT COALESCE(NULLIF(TRIM(full_name), ''), 'Un client')
  INTO v_buyer_name
  FROM public.profiles
  WHERE id = v_buyer_id;

  INSERT INTO public.notifications (user_id, type, title, message, data, is_read)
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

CREATE OR REPLACE FUNCTION public.create_marketplace_orders_from_cart(
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
  FROM public.profiles
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
    FROM public.products
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

    INSERT INTO public.orders (buyer_id, seller_id, total_amount, status, shipping_address)
    VALUES (v_buyer_id, v_artisan_id, v_order_total, 'pending', p_shipping_address)
    RETURNING id INTO v_order_id;

    v_result := array_append(v_result, v_order_id);

    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
    SELECT v_order_id, product_id, quantity, unit_price
    FROM _cart_artisan_items
    WHERE artisan_id = v_artisan_id;

    UPDATE public.products p
    SET stock = p.stock - c.quantity, updated_at = NOW()
    FROM _cart_artisan_items c
    WHERE p.id = c.product_id AND c.artisan_id = v_artisan_id AND c.stock IS NOT NULL;

    SELECT p.title
    INTO v_first_title
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = v_order_id
    LIMIT 1;

    PERFORM public.ensure_marketplace_order_chat(v_order_id, v_first_title);

    INSERT INTO public.notifications (user_id, type, title, message, data, is_read)
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

DROP POLICY IF EXISTS "Participants can read project messages" ON public.messages;
CREATE POLICY "Participants can read project messages"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = messages.project_id
      AND (
        p.client_id = auth.uid()
        OR p.target_artisan_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.quotes q
          WHERE q.project_id = p.id
            AND q.artisan_id = auth.uid()
            AND q.status IN ('pending', 'viewed', 'accepted')
        )
      )
  )
);

DROP POLICY IF EXISTS "Participants can send messages in project" ON public.messages;
CREATE POLICY "Participants can send messages in project"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = messages.project_id
      AND (
        p.client_id = auth.uid()
        OR p.target_artisan_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.quotes q
          WHERE q.project_id = p.id
            AND q.artisan_id = auth.uid()
            AND q.status IN ('pending', 'viewed', 'accepted')
        )
      )
  )
);
