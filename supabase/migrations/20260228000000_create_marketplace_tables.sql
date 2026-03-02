-- Migration: Marketplace Produits (products, orders, order_items)
-- Objectif : ajouter un socle simple pour le catalogue produits et les commandes

-- TABLE products : produits publiés par les artisans
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12, 2) NOT NULL,
  images JSONB, -- liste d'URLs d'images
  category_id INTEGER REFERENCES categories(id),
  region TEXT,
  department TEXT,
  commune TEXT,
  tags JSONB, -- ex: ["bois", "sur_mesure"]
  stock INTEGER, -- NULL = non géré / illimité
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived', 'sold_out')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_artisan_id ON products(artisan_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_region_commune ON products(region, department, commune);

-- TABLE orders : commandes client ↔ artisan
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  total_amount DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  shipping_address JSONB, -- { name, phone, address_line1, region, department, commune }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- TABLE order_items : lignes de commande
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- RLS : sécuriser l'accès aux données marketplace

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- PRODUCTS

-- Lecture publique des produits publiés
CREATE POLICY "Public read published products"
  ON products FOR SELECT
  USING (status = 'published');

-- Les artisans propriétaires gèrent leurs produits
CREATE POLICY "Artisans manage their products"
  ON products FOR ALL
  USING (artisan_id = auth.uid());

-- Les admins peuvent tout gérer
CREATE POLICY "Admins manage all products"
  ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ORDERS

-- Les acheteurs voient leurs commandes
CREATE POLICY "Buyers see their orders"
  ON orders FOR SELECT
  USING (buyer_id = auth.uid());

-- Les vendeurs voient leurs commandes reçues
CREATE POLICY "Sellers see their received orders"
  ON orders FOR SELECT
  USING (seller_id = auth.uid());

-- Création de commande par l'acheteur connecté
CREATE POLICY "Buyers create their orders"
  ON orders FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

-- Mise à jour côté vendeur (ex: statut)
CREATE POLICY "Sellers update their orders"
  ON orders FOR UPDATE
  USING (seller_id = auth.uid());

-- Admins : gestion complète
CREATE POLICY "Admins manage all orders"
  ON orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ORDER_ITEMS

-- Visibilité basée sur l'appartenance à la commande (acheteur, vendeur ou admin)
CREATE POLICY "Order participants see their order_items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insertion restreinte aux commandes appartenant à l'acheteur (contrôlé côté frontend/service)
CREATE POLICY "Insert order_items for own orders"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.buyer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Mettre à jour updated_at automatiquement
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE products IS 'Produits vendus par les artisans sur le marketplace';
COMMENT ON TABLE orders IS 'Commandes de produits entre clients et artisans';
COMMENT ON TABLE order_items IS 'Lignes de commande (produit, quantité, prix unitaire)';

