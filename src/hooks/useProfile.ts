import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Database } from '../types/database.types';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type ProfileRole = 'client' | 'artisan' | 'admin' | 'partner' | 'chambre_metier';

type ProfileState = {
  profile: ProfileRow | null;
  loading: boolean;
};

export function useProfile() {
  const auth = useAuth();
  const [state, setState] = useState<ProfileState>({ profile: null, loading: true });

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!auth.user) {
        if (!mounted) return;
        setState({ profile: null, loading: false });
        return;
      }

      if (!mounted) return;
      setState((s) => ({ ...s, loading: true }));

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          artisans!artisans_id_fkey(category_id)
        `)
        .eq('id', auth.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        // Ne pas afficher d'erreur si c'est un problème de connexion réseau
        const isNetworkError = 
          error.message?.toLowerCase().includes('failed to fetch') ||
          error.message?.toLowerCase().includes('network') ||
          error.message?.toLowerCase().includes('connection') ||
          error.message?.toLowerCase().includes('timeout');
        
        if (!isNetworkError) {
          console.error('Erreur lors du chargement du profil:', error);
        }
        setState({ profile: null, loading: false });
        return;
      }

      // Enrichir le profil avec category_id depuis artisans
      // La relation artisans_id_fkey est one-to-one, donc artisans est un objet unique
      const enrichedProfile = data ? {
        ...data,
        category_id: (data as any).artisans?.category_id ?? data.category_id ?? null
      } : null;

      setState({ profile: enrichedProfile, loading: false });
    };

    run();

    return () => {
      mounted = false;
    };
  }, [auth.user]);

  const upsertProfile = useCallback(
    async (input: { 
      full_name: string; 
      role: ProfileRole; 
      phone?: string | null;
      location?: string | null;
      category_id?: number; 
      bio?: string;
      specialty?: string;
      portfolio_urls?: string[];
    }) => {
      if (!auth.user) throw new Error('Not authenticated');

      const avatarFromProvider =
        (auth.user.user_metadata?.avatar_url as string | undefined) ||
        (auth.user.user_metadata?.picture as string | undefined) ||
        null;

      // Update or create Profile
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: auth.user.id,
        email: auth.user.email ?? null,
        full_name: input.full_name,
        role: input.role,
        avatar_url: avatarFromProvider,
        phone: input.phone ?? null,
        location: input.location ?? null,
        updated_at: new Date().toISOString(),
      });

      if (profileError) throw profileError;

      // If Artisan, update/create Artisan record
      if (input.role === 'artisan') {
        const { error: artisanError } = await supabase.from('artisans').upsert({
          id: auth.user.id,
          user_id: auth.user.id,
          category_id: input.category_id ?? null,
          bio: input.bio ?? null,
          specialty: input.specialty ?? null,
          portfolio_urls: input.portfolio_urls ?? [],
          updated_at: new Date().toISOString(),
        });
        if (artisanError) throw artisanError;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          artisans!artisans_id_fkey(category_id)
        `)
        .eq('id', auth.user.id)
        .single();

      if (error) throw error;
      
      // Enrichir le profil avec category_id depuis artisans
      // La relation artisans_id_fkey est one-to-one, donc artisans est un objet unique
      const enrichedProfile = data ? {
        ...data,
        category_id: (data as any).artisans?.category_id ?? data.category_id ?? null
      } : null;
      
      setState({ profile: enrichedProfile, loading: false });
    },
    [auth.user],
  );

  return useMemo(
    () => ({
      profile: state.profile,
      loading: state.loading,
      upsertProfile,
    }),
    [state.profile, state.loading, upsertProfile],
  );
}
