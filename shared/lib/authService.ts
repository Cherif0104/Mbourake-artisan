import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

export type AuthClient = SupabaseClient<Database>;

export async function getSession(client: AuthClient) {
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data;
}

export async function signInWithPassword(
  client: AuthClient,
  email: string,
  password: string,
) {
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithPassword(
  client: AuthClient,
  email: string,
  password: string,
) {
  const { error } = await client.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signOut(client: AuthClient) {
  const { error } = await client.auth.signOut();
  if (error) throw error;
}
