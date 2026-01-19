import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setState({
          user: data.session?.user ?? null,
          session: data.session ?? null,
          loading: false,
        });
      })
      .catch((error) => {
        if (!mounted) return;
        console.warn('Erreur lors du chargement de la session:', error);
        setState({ user: null, session: null, loading: false });
      });
    
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Ne jamais logger INITIAL_SESSION (se produit trop souvent)
      if (event !== 'INITIAL_SESSION') {
        console.log('[useAuth] Auth state changed:', {
          event,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          email: session?.user?.email,
        });
      }
      
      // Éviter les mises à jour inutiles si l'état n'a pas changé
      setState((prevState) => {
        const newUser = session?.user ?? null;
        const newSession = session ?? null;
        
        // Si l'utilisateur n'a pas changé, ne pas mettre à jour
        if (prevState.user?.id === newUser?.id && prevState.session?.access_token === newSession?.access_token) {
          return prevState;
        }
        
        return {
          user: newUser,
          session: newSession,
          loading: false,
        };
      });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async (mode: 'login' | 'signup' = 'signup', role?: string) => {
    console.log('[useAuth] signInWithGoogle appelé avec mode:', mode, 'role:', role);
    console.log('[useAuth] URL actuelle:', window.location.href);
    console.log('[useAuth] Origin:', window.location.origin);
    
    // Rediriger vers /onboard avec le bon mode et préserver le rôle si présent
    const params = new URLSearchParams({ mode });
    if (role) {
      params.set('role', role);
    }
    const redirectTo = `${window.location.origin}/onboard?${params.toString()}`;
    
    console.log('[useAuth] Google OAuth redirectTo configuré:', redirectTo);
    
    try {
      console.log('[useAuth] Tentative de connexion Google OAuth avec redirectTo:', redirectTo);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          // Forcer la sélection du compte pour éviter les problèmes de cache
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      
      if (error) {
        console.error('[useAuth] Erreur Google OAuth:', error);
        console.error('[useAuth] Détails erreur:', {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        
        // Message d'erreur plus explicite
        if (error.message?.includes('redirect') || error.message?.includes('URL') || error.message?.includes('mismatch')) {
          throw new Error(
            'Erreur de configuration OAuth. ' +
            'Vérifiez que l\'URL de redirection est configurée dans Supabase Dashboard: ' +
            'Settings → Authentication → URL Configuration → Redirect URLs. ' +
            'Ajoutez: ' + redirectTo + ' ' +
            'Si le problème persiste, vérifiez aussi Google Cloud Console.'
          );
        }
        
        throw error;
      }
      
      console.log('[useAuth] Google OAuth initié avec succès');
      console.log('[useAuth] Data retournée:', data);
      console.log('[useAuth] URL de redirection Google:', data?.url);
      
      // Note: signInWithOAuth redirige automatiquement vers Google
      // Si data.url existe, c'est l'URL vers laquelle rediriger
      if (data?.url) {
        console.log('[useAuth] Redirection automatique vers Google OAuth dans 100ms...');
        // La redirection se fait automatiquement via window.location
        // Attendre un peu pour s'assurer que les logs sont visibles
        setTimeout(() => {
          window.location.href = data.url;
        }, 100);
      } else {
        console.warn('[useAuth] Pas d\'URL de redirection retournée par Supabase');
        throw new Error('Aucune URL de redirection retournée par Supabase. Vérifiez la configuration OAuth.');
      }
    } catch (err: any) {
      console.error('[useAuth] Exception lors de l\'initiation OAuth:', err);
      throw err;
    }
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return useMemo(
    () => ({
      user: state.user,
      session: state.session,
      loading: state.loading,
      signInWithGoogle: (mode?: 'login' | 'signup', role?: string) => signInWithGoogle(mode, role),
      signInWithPassword,
      signUpWithPassword,
      signOut,
    }),
    [state.user, state.session, state.loading, signInWithGoogle, signInWithPassword, signUpWithPassword, signOut],
  );
}
