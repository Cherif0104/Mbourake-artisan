-- Migration: Accorder 500 crédits de bienvenue à TOUS les artisans
-- Donne 500 crédits à tous les artisans (nouveaux et existants)

-- 1. S'assurer que tous les artisans ont un wallet
-- Créer les wallets manquants avec 500 crédits
INSERT INTO artisan_credit_wallets (artisan_id, balance, updated_at)
SELECT 
  a.id as artisan_id,
  500 as balance,
  NOW() as updated_at
FROM artisans a
WHERE NOT EXISTS (
  SELECT 1 FROM artisan_credit_wallets w 
  WHERE w.artisan_id = a.id
)
ON CONFLICT (artisan_id) DO NOTHING;

-- 2. Accorder 500 crédits à TOUS les artisans existants
-- Si un artisan a moins de 500 crédits, on lui donne 500 crédits (minimum garanti)
-- IMPORTANT: Cette migration garantit que tous les artisans ont au minimum 500 crédits
UPDATE artisan_credit_wallets
SET 
  balance = CASE 
    WHEN balance < 500 THEN 500       -- Si moins de 500, mettre à 500 (minimum garanti)
    ELSE balance                       -- Si 500 ou plus, garder le solde actuel
  END,
  updated_at = NOW()
WHERE artisan_id IN (
  SELECT id FROM artisans
)
AND balance < 500;  -- Uniquement mettre à jour ceux qui ont moins de 500 crédits

-- Commentaire pour documentation
COMMENT ON COLUMN artisan_credit_wallets.balance IS 
  'Solde de crédits de l''artisan. Minimum garanti: 500 crédits de bienvenue. Chaque projet accepté coûte 10 crédits.';
