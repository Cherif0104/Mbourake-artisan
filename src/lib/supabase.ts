import { createClient } from '@supabase/supabase-js';
import type { Database } from '@shared';
import { getSupabaseAuthOptions } from '@shared/lib/supabase-core';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Mbourake] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquants. Créez un fichier .env à la racine (voir env.example). Connexion et données seront désactivées.',
  );
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
  auth: getSupabaseAuthOptions(localStorage),
});
