import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, AlertCircle, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'mbourake_pending_invite';

/**
 * Page publique /invite/:token
 * Valide le token via get_invitation_info, puis redirige vers l'onboarding avec role + invite.
 */
export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'artisan' | 'client' | null>(null);

  useEffect(() => {
    if (!token?.trim()) {
      setStatus('invalid');
      setError('Lien invalide');
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_invitation_info', {
          in_token: token.trim(),
        });

        if (!mounted) return;

        if (rpcError) {
          setStatus('invalid');
          setError(rpcError.message || 'Lien invalide');
          return;
        }

        const info = data as { valid?: boolean; error?: string; role?: string } | null;
        if (!info?.valid || !info?.role) {
          setStatus('invalid');
          setError((info as { error?: string })?.error || 'Lien invalide ou expiré');
          return;
        }

        const r = info.role === 'client' ? 'client' : 'artisan';
        setRole(r);
        setStatus('valid');

        try {
          localStorage.setItem(STORAGE_KEY, token.trim());
        } catch (_) {
          /* ignore */
        }

        const params = new URLSearchParams();
        params.set('mode', 'signup');
        params.set('role', r);
        params.set('invite', token.trim());
        navigate(`/onboard?${params.toString()}`, { replace: true });
      } catch (e) {
        if (!mounted) return;
        setStatus('invalid');
        setError('Lien invalide ou expiré');
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token, navigate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
        <p className="text-gray-600 text-sm">Vérification du lien d&apos;invitation...</p>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-2">Lien invalide ou expiré</h1>
          <p className="text-gray-600 text-sm mb-6">
            {error || 'Ce lien d\'invitation n\'est plus valable. Demandez un nouveau lien à votre organisation.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/onboard?mode=signup')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition-colors"
          >
            <LogIn size={18} />
            Créer un compte
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full mt-3 py-2.5 text-gray-600 text-sm font-medium hover:text-gray-900"
          >
            Retour à l&apos;accueil
          </button>
        </div>
      </div>
    );
  }

  return null;
}
