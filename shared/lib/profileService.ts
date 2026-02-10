import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type Client = SupabaseClient<Database>;

type ProfileWithArtisan = ProfileRow & {
  artisans?: { category_id: number | null } | null;
};

export async function getProfile(
  client: Client,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from('profiles')
    .select(
      `
      *,
      artisans!artisans_id_fkey(category_id)
    `,
    )
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as ProfileWithArtisan;
  return {
    ...row,
    category_id: row.artisans?.category_id ?? row.category_id ?? null,
  } as ProfileRow;
}
