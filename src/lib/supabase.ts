import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Activer la persistance automatique de la session dans localStorage
    persistSession: true,
    // Stocker la session dans localStorage (par défaut)
    storage: localStorage,
    // Rafraîchir automatiquement le token avant expiration
    autoRefreshToken: true,
    // Détecter les changements de session dans d'autres onglets
    detectSessionInUrl: true,
    // Clé de stockage personnalisée pour éviter les conflits
    storageKey: 'mbourake-auth',
  },
});
