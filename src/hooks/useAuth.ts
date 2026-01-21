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

  // Référence pour éviter les redirections multiples
  const redirectingRef = useRef(false);

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

      // Redirection globale après authentification réussie
      if (event === 'SIGNED_IN' && typeof window !== 'undefined') {
        try {
          const search = new URLSearchParams(window.location.search);
          let mode = search.get('mode');
          let role = search.get('role');

          // Si mode/role ne sont pas dans l'URL (perdus pendant OAuth),
          // les récupérer depuis localStorage où on les a mémorisés avant OAuth
          if (!mode) {
            mode = localStorage.getItem('mbourake_pending_mode') || undefined;
          }
          if (!role) {
            role = localStorage.getItem('mbourake_pending_role') || undefined;
          }

          // IMPORTANT : Ne PAS nettoyer localStorage ici, car EditProfilePage en a besoin
          // Il sera nettoyé par EditProfilePage après avoir été lu

          // Pour tous les nouveaux utilisateurs en signup (client ou artisan) :
          // rediriger directement vers la page de profil pour compléter leur profil
          if (mode === 'signup') {
            const profileParams = new URLSearchParams();
            profileParams.set('mode', 'onboarding');
            // Toujours inclure le rôle s'il est disponible (URL ou localStorage)
            const finalRole = role || localStorage.getItem('mbourake_pending_role') || undefined;
            if (finalRole) {
              profileParams.set('role', finalRole);
              console.log('[useAuth] Rôle déterminé pour redirection:', finalRole);
            } else {
              console.warn('[useAuth] ATTENTION: Aucun rôle trouvé pour signup, redirection sans rôle');
            }
            const profileUrl = `/edit-profile?${profileParams.toString()}`;
            console.log('[useAuth] SIGNED_IN (signup) → redirection directe vers', profileUrl);
            setTimeout(() => {
              window.location.replace(profileUrl);
            }, 0);
            return;
          }

          // Pour les utilisateurs existants en login, vérifier si profil complet
          // Si profil incomplet, rediriger vers edit-profile aussi
          // (Cette logique sera gérée par Dashboard ou LandingPage)
          const params = new URLSearchParams();
          if (mode) params.set('mode', mode);
          if (role) params.set('role', role);

          const dashboardUrl = `/dashboard${params.toString() ? `?${params.toString()}` : ''}`;

          // Éviter de naviguer si on est déjà sur /dashboard
          if (window.location.pathname !== '/dashboard') {
            console.log('[useAuth] SIGNED_IN (login) → redirection vers', dashboardUrl);
            setTimeout(() => {
              window.location.replace(dashboardUrl);
            }, 0);
          }
        } catch (e) {
          console.warn('[useAuth] Erreur pendant la redirection SIGNED_IN:', e);
          redirectingRef.current = false;
        }
      }
      
      // Éviter les mises à jour inutiles si l'état n'a pas changé
      setState((prevState) => {
        const newUser = session?.user ?? null;
        const newSession = session ?? null;
        
        // Si l'utilisateur n'a pas changé et que la session est identique, ne pas mettre à jour
        // Comparer aussi les tokens pour éviter les mises à jour inutiles
        const userChanged = prevState.user?.id !== newUser?.id;
        const tokenChanged = prevState.session?.access_token !== newSession?.access_token;
        
        // Si rien n'a changé, retourner l'état précédent pour éviter un re-render
        if (!userChanged && !tokenChanged && prevState.loading === false) {
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
    
    // Rediriger vers /dashboard après OAuth et préserver le rôle si présent
    const params = new URLSearchParams();
    params.set('mode', mode);
    if (role) {
      params.set('role', role);
    }
    const redirectQuery = params.toString();
    const redirectTo = `${window.location.origin}/dashboard${redirectQuery ? `?${redirectQuery}` : ''}`;
    
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
