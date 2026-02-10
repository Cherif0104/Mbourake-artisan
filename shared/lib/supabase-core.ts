/**
 * Configuration et constantes partagées pour le client Supabase (web + mobile).
 * Chaque plateforme crée son client avec createClient<Database>(url, key, { auth: { storage, storageKey } }).
 */

export const SUPABASE_AUTH_STORAGE_KEY = 'mbourake-auth';

export type SupabaseAuthOptions = {
  persistSession: boolean;
  autoRefreshToken: boolean;
  detectSessionInUrl?: boolean;
  storageKey: string;
  /** Web: localStorage, Mobile: adapter AsyncStorage */
  storage: {
    getItem(key: string): string | null | Promise<string | null>;
    setItem(key: string, value: string): void | Promise<void>;
    removeItem(key: string): void | Promise<void>;
  };
};

export function getSupabaseAuthOptions(
  storage: SupabaseAuthOptions['storage'],
): Omit<SupabaseAuthOptions, 'storage'> & { storage: SupabaseAuthOptions['storage'] } {
  return {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
    storage,
  };
}
