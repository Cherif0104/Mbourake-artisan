import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../shared';
import { getSupabaseAuthOptions } from '../../shared/lib/supabase-core';
import { getSupabaseConfig } from './env';

const { url, anonKey } = getSupabaseConfig();

if (!url || !anonKey) {
  console.warn(
    'Supabase non configuré: définir SUPABASE_URL et SUPABASE_ANON_KEY (voir README_MOBILE.md).',
  );
}

const storage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

export const supabase =
  url && anonKey
    ? createClient<Database>(url, anonKey, {
        auth: getSupabaseAuthOptions(storage),
      })
    : (null as unknown as ReturnType<typeof createClient<Database>>);
