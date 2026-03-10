import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Lock, Trash2, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useToastContext } from '../contexts/ToastContext';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { BackButton } from '../components/BackButton';
import { supabase } from '../lib/supabase';

const CONFIRM_DELETE_KEYWORD = 'SUPPRIMER';

/** Normalise le texte (accents retirés) pour la comparaison. Accepte "supprimer" et "supprimé". */
function normalizeForCompare(s: string): string {
  return s.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isConfirmDeleteMatch(value: string): boolean {
  return normalizeForCompare(value) === CONFIRM_DELETE_KEYWORD;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { success: showSuccess, error: showError } = useToastContext();
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');

  const handleDeleteMyAccount = useCallback(async () => {
    if (!isConfirmDeleteMatch(confirmDeleteText)) return;
    setDeletingAccount(true);
    try {
      // Rafraîchir la session pour obtenir un token valide (évite 401 en prod si token expiré)
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      const token = session?.access_token;
      if (refreshError || !token) {
        showError('Session expirée. Reconnectez-vous puis réessayez.');
        setDeletingAccount(false);
        return;
      }
      const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const fnUrl = isLocalhost
        ? '/api/supabase-functions/v1/delete-my-account'
        : (baseUrl ? `${baseUrl.replace(/\/$/, '')}/functions/v1/delete-my-account` : `${window.location.origin}/functions/v1/delete-my-account`);
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Erreur ${res.status}`);
      await auth.signOut();
      navigate('/?account_deleted=1', { replace: true });
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Impossible de supprimer le compte. Réessayez ou contactez le support.');
    } finally {
      setDeletingAccount(false);
    }
  }, [confirmDeleteText, auth.signOut, navigate, showError]);

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
      <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-40 shadow-sm border-b border-gray-100/50">
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

        {/* Suppression de compte (self-service immédiat) */}
        <button
          type="button"
          onClick={() => { setConfirmDeleteText(''); setShowDeleteAccountModal(true); }}
          className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:bg-red-50 transition-colors text-left border-red-100"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <div>
              <p className="font-bold text-red-700">Supprimer mon compte</p>
              <p className="text-xs text-gray-500">Définitif et irréversible. Toutes vos données seront effacées.</p>
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
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h3 id="delete-account-title" className="text-lg font-bold text-gray-900">Supprimer définitivement mon compte</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">Cette action supprime votre compte et toutes les données associées. Elle est irréversible.</p>
            <label className="block text-xs font-medium text-gray-500 mb-1">Pour confirmer, tapez <strong>SUPPRIMER</strong> ou <strong>supprimé</strong></label>
            <input
              type="text"
              value={confirmDeleteText}
              onChange={(e) => setConfirmDeleteText(e.target.value)}
              placeholder="SUPPRIMER"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mb-4 placeholder:normal-case"
              autoComplete="off"
              autoCapitalize="off"
            />
            <div className="flex gap-3">
              <button type="button" disabled={deletingAccount} onClick={() => setShowDeleteAccountModal(false)} className="flex-1 py-3 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Annuler</button>
              <button
                type="button"
                disabled={deletingAccount || !isConfirmDeleteMatch(confirmDeleteText)}
                onClick={handleDeleteMyAccount}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                {deletingAccount ? <Loader2 size={20} className="animate-spin" /> : null} Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
