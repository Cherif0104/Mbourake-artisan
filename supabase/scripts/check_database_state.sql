-- Script rapide pour vérifier l'état de la base de données
-- Usage: Exécutez dans Supabase SQL Editor

-- ============================================
-- RÉSUMÉ RAPIDE
-- ============================================
SELECT 
    '📊 RÉSUMÉ' as info,
    (SELECT COUNT(*) FROM public.users) as users,
    (SELECT COUNT(*) FROM public.professionals) as professionals,
    (SELECT COUNT(*) FROM public.projects) as projects,
    (SELECT COUNT(*) FROM public.quotes) as quotes,
    (SELECT COUNT(*) FROM public.messages) as messages;

-- ============================================
-- UTILISATEURS EXISTANTS
-- ============================================
SELECT 
    id,
    COALESCE(email, '❌ Pas d''email') as email,
    name,
    role,
    status,
    created_at
FROM public.users
ORDER BY created_at;

-- ============================================
-- COLONNES MANQUANTES
-- ============================================
SELECT 
    'projects' as table_name,
    'audio_url' as missing_column
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'projects' 
      AND column_name = 'audio_url'
)
UNION ALL
SELECT 'projects', 'audio_transcription'
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'projects' 
      AND column_name = 'audio_transcription'
)
UNION ALL
SELECT 'projects', 'photos'
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'projects' 
      AND column_name = 'photos'
)
UNION ALL
SELECT 'projects', 'budget_min'
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'projects' 
      AND column_name = 'budget_min'
)
UNION ALL
SELECT 'projects', 'budget_max'
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'projects' 
      AND column_name = 'budget_max'
)
UNION ALL
SELECT 'messages', 'audio_transcription'
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name = 'audio_transcription'
)
UNION ALL
SELECT 'messages', 'is_read'
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name = 'is_read'
)
UNION ALL
SELECT 'quotes', 'message'
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'quotes' 
      AND column_name = 'message'
)
UNION ALL
SELECT 'quotes', 'status'
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'quotes' 
      AND column_name = 'status'
)
UNION ALL
SELECT 'quotes', 'updated_at'
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'quotes' 
      AND column_name = 'updated_at'
);

