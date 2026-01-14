import { useCallback, useEffect, useMemo, useState } from 'react';
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
      .catch(() => {
        if (!mounted) return;
        setState({ user: null, session: null, loading: false });
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        session: session ?? null,
        loading: false,
      });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async (mode: 'login' | 'signup' = 'signup') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login?mode=${mode}`,
      },
    });
    if (error) throw error;
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
      signInWithGoogle,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    }),
    [state.user, state.session, state.loading, signInWithGoogle, signInWithPassword, signUpWithPassword, signOut],
  );
}
