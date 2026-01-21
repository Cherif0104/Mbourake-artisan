-- Script SQL pour accorder 500 crédits à TOUS les artisans
-- Ce script peut être exécuté directement dans Supabase SQL Editor pour accorder immédiatement les crédits

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

-- 2. Accorder 500 crédits minimum à TOUS les artisans existants qui ont moins de 500 crédits
UPDATE artisan_credit_wallets
SET 
  balance = 500,
  updated_at = NOW()
WHERE artisan_id IN (
  SELECT id FROM artisans
)
AND balance < 500;

-- 3. Vérifier le résultat
SELECT 
  a.id,
  p.full_name,
  p.email,
  w.balance,
  CASE 
    WHEN w.balance >= 500 THEN 'OK (500+ crédits)'
    ELSE 'ATTENTION (moins de 500 crédits)'
  END as status
FROM artisans a
LEFT JOIN profiles p ON p.id = a.id
LEFT JOIN artisan_credit_wallets w ON w.artisan_id = a.id
ORDER BY w.balance ASC, p.full_name;
