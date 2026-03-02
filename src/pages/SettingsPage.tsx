import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Lock, Trash2, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useToastContext } from '../contexts/ToastContext';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { BackButton } from '../components/BackButton';
import { supabase } from '../lib/supabase';

export function SettingsPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { error: showError } = useToastContext();
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  /**
   * Suppression de compte via la fonction Edge Supabase "delete-my-account".
   * Pour que le bouton fonctionne, déployer la fonction :
   *   supabase functions deploy delete-my-account --no-verify-jwt
   * Voir supabase/functions/delete-my-account/README.md
   */
  const handleDeleteMyAccount = useCallback(async () => {
    setDeletingAccount(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) {
        showError('Session expirée. Reconnectez-vous puis réessayez.');
        setDeletingAccount(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke('delete-my-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw error;
      const errMsg = (data as { error?: string })?.error;
      if (errMsg) {
        showError(errMsg);
        setDeletingAccount(false);
        return;
      }
      setShowDeleteAccountModal(false);
      await auth.signOut();
      navigate('/?account_deleted=1', { replace: true });
    } catch (err: any) {
      const msg = err?.message || (err?.error ?? 'Impossible de supprimer le compte. La fonction Edge "delete-my-account" est peut-être non déployée.');
      showError(msg);
    } finally {
      setDeletingAccount(false);
    }
  }, [auth, navigate, showError]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (form.newPassword.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (form.newPassword !== form.confirm) {
      setPasswordError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: form.newPassword });
      if (error) throw error;
      setPasswordSuccess(true);
      setForm({ newPassword: '', confirm: '' });
    } catch (err: any) {
      setPasswordError(err?.message || 'Impossible de modifier le mot de passe.');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (auth.loading || profileLoading) {
    return <LoadingOverlay />;
  }
  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-30 shadow-sm border-b border-gray-100/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <BackButton onClick={() => navigate('/profile')} />
          <h1 className="text-lg font-black text-gray-900">Paramètres</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 pb-20 space-y-6">
        <p className="text-sm text-gray-500">
          Modifiez votre compte, mot de passe et préférences de sécurité.
        </p>

        <button
          onClick={() => navigate('/edit-profile')}
          className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <Pencil size={20} className="text-brand-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Modifier le profil</p>
              <p className="text-xs text-gray-500">Nom, photo, téléphone, adresse, métier</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Lock size={20} className="text-gray-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Changer le mot de passe</p>
              <p className="text-xs text-gray-500">Mettez à jour votre mot de passe de connexion</p>
            </div>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <input
              type="password"
              placeholder="Nouveau mot de passe (min. 8 caractères)"
              value={form.newPassword}
              onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
              autoComplete="new-password"
            />
            <input
              type="password"
              placeholder="Confirmer le mot de passe"
              value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
              autoComplete="new-password"
            />
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-green-600">Mot de passe mis à jour.</p>}
            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {passwordLoading ? <Loader2 size={18} className="animate-spin" /> : null}
              Mettre à jour le mot de passe
            </button>
          </form>
        </div>

        <button
          type="button"
          onClick={() => setShowDeleteAccountModal(true)}
          className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:bg-red-50 transition-colors text-left border-red-100"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <div>
              <p className="font-bold text-red-700">Supprimer mon compte</p>
              <p className="text-xs text-gray-500">Irréversible. Toutes vos données seront supprimées.</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>
      </main>

      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !deletingAccount && setShowDeleteAccountModal(false)} role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <h3 id="delete-account-title" className="text-lg font-bold text-gray-900">Supprimer mon compte</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer définitivement votre compte et toutes les données liées à cette adresse email ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => setShowDeleteAccountModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={handleDeleteMyAccount}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingAccount ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                {deletingAccount ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
