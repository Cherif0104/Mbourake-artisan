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
      company_name?: string | null;
      region?: string | null;
      department?: string | null;
      commune?: string | null;
      category_id?: number; 
      bio?: string;
      specialty?: string;
      portfolio_urls?: string[];
    }) => {
      // Obtenir la session directement depuis Supabase pour éviter les problèmes de synchronisation
      // avec l'état React de useAuth
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      // Vérifier qu'on a une session et un utilisateur valides
      if (sessionError) {
        console.error('[useProfile] Erreur lors de la récupération de la session:', sessionError);
        throw new Error('Not authenticated');
      }
      
      if (!sessionData?.session) {
        console.error('[useProfile] Aucune session trouvée');
        throw new Error('Not authenticated');
      }
      
      if (!sessionData.session.user) {
        console.error('[useProfile] Session trouvée mais pas d\'utilisateur');
        throw new Error('Not authenticated');
      }
      
      const currentUser = sessionData.session.user;

      const avatarFromProvider =
        (currentUser.user_metadata?.avatar_url as string | undefined) ||
        (currentUser.user_metadata?.picture as string | undefined) ||
        null;

      // Update or create Profile
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: currentUser.id,
        email: currentUser.email ?? null,
        full_name: input.full_name,
        role: input.role,
        avatar_url: avatarFromProvider,
        phone: input.phone ?? null,
        // Conserver location comme champ combiné pour compatibilité
        location: input.location ?? null,
        company_name: input.company_name ?? null,
        region: input.region ?? null,
        department: input.department ?? null,
        commune: input.commune ?? null,
        updated_at: new Date().toISOString(),
      });

      if (profileError) throw profileError;

      // If Artisan, update/create Artisan record
      if (input.role === 'artisan') {
        const { error: artisanError } = await supabase.from('artisans').upsert({
          id: currentUser.id,
          user_id: currentUser.id,
          category_id: input.category_id ?? null,
          bio: input.bio ?? null,
          specialty: input.specialty ?? null,
          portfolio_urls: input.portfolio_urls ?? [],
          updated_at: new Date().toISOString(),
        });
        if (artisanError) throw artisanError;

        // Accorder 500 crédits de bienvenue à tous les nouveaux artisans
        // Vérifier d'abord si un wallet existe déjà
        const { data: existingWallet } = await supabase
          .from('artisan_credit_wallets')
          .select('id, balance')
          .eq('artisan_id', currentUser.id)
          .maybeSingle();

        if (!existingWallet) {
          // Créer le wallet avec 500 crédits de bienvenue
          const { error: walletError } = await supabase
            .from('artisan_credit_wallets')
            .insert({
              artisan_id: currentUser.id,
              balance: 500,
              updated_at: new Date().toISOString(),
            });

          if (walletError) {
            console.error('[useProfile] Erreur lors de la création du wallet avec crédits de bienvenue:', walletError);
            // Ne pas faire échouer la création du profil si l'ajout de crédits échoue
          } else {
            console.log('[useProfile] 500 crédits de bienvenue accordés au nouvel artisan:', currentUser.id);
          }
        } else {
          // Si le wallet existe déjà mais a moins de 500 crédits, lui donner 500 crédits minimum
          if (existingWallet.balance < 500) {
            const { error: walletUpdateError } = await supabase
              .from('artisan_credit_wallets')
              .update({ 
                balance: 500,
                updated_at: new Date().toISOString(),
              })
              .eq('artisan_id', currentUser.id);

            if (walletUpdateError) {
              console.error('[useProfile] Erreur lors de l\'attribution des crédits de bienvenue:', walletUpdateError);
            } else {
              console.log('[useProfile] 500 crédits de bienvenue accordés à l\'artisan existant:', currentUser.id);
            }
          }
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          artisans!artisans_id_fkey(category_id)
        `)
        .eq('id', currentUser.id)
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
    [], // Ne plus dépendre de auth.user car on utilise directement la session Supabase
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
