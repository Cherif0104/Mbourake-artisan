import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Lock, Trash2, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useToastContext } from '../contexts/ToastContext';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { BackButton } from '../components/BackButton';
import { supabase } from '../lib/supabase';

interface DeletionRequest {
  id: string;
  user_id: string;
  status: string;
  reason: string | null;
  requested_at: string;
  confirmed_at: string | null;
  expires_at: string;
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
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null);
  const [deletionStep, setDeletionStep] = useState<'request' | 'confirm' | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from('deletion_requests')
      .select('id, user_id, status, reason, requested_at, confirmed_at, expires_at')
      .eq('user_id', profile.id)
      .in('status', ['requested', 'confirmed'])
      .maybeSingle()
      .then(({ data }) => setDeletionRequest(data as DeletionRequest | null));
  }, [profile?.id]);

  const handleRequestDeletion = useCallback(async () => {
    if (!profile?.id) return;
    setDeletingAccount(true);
    try {
      const { error } = await supabase.from('deletion_requests').insert({
        user_id: profile.id,
        status: 'requested',
        reason: deleteReason.trim() || null,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
      showSuccess('Demande enregistrée. Revenez ici pour confirmer (étape 2) avant expiration.');
      setShowDeleteAccountModal(false);
      setDeleteReason('');
      const { data } = await supabase.from('deletion_requests').select('id, user_id, status, reason, requested_at, confirmed_at, expires_at').eq('user_id', profile.id).in('status', ['requested', 'confirmed']).maybeSingle();
      setDeletionRequest(data as DeletionRequest | null);
    } catch (err: any) {
      showError(err?.message ?? 'Impossible d\'enregistrer la demande.');
    } finally {
      setDeletingAccount(false);
    }
  }, [profile?.id, deleteReason, showSuccess, showError]);

  const handleConfirmDeletion = useCallback(async () => {
    if (!deletionRequest || deletionRequest.status !== 'requested') return;
    if (new Date(deletionRequest.expires_at) < new Date()) {
      showError('La demande a expiré. Créez une nouvelle demande si besoin.');
      return;
    }
    setDeletingAccount(true);
    try {
      const { error } = await supabase.from('deletion_requests').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', deletionRequest.id);
      if (error) throw error;
      showSuccess('Demande confirmée. L\'équipe traitera votre compte sous peu.');
      setShowDeleteAccountModal(false);
      setDeletionRequest((prev) => prev ? { ...prev, status: 'confirmed', confirmed_at: new Date().toISOString() } : null);
    } catch (err: any) {
      showError(err?.message ?? 'Impossible de confirmer.');
    } finally {
      setDeletingAccount(false);
    }
  }, [deletionRequest, showSuccess, showError]);

  const handleCancelDeletionRequest = useCallback(async () => {
    if (!deletionRequest || deletionRequest.status !== 'requested') return;
    setDeletingAccount(true);
    try {
      const { error } = await supabase.from('deletion_requests').update({ status: 'cancelled' }).eq('id', deletionRequest.id);
      if (error) throw error;
      showSuccess('Demande annulée.');
      setShowDeleteAccountModal(false);
      setDeletionRequest(null);
    } catch (err: any) {
      showError(err?.message ?? 'Impossible d\'annuler.');
    } finally {
      setDeletingAccount(false);
    }
  }, [deletionRequest, showSuccess, showError]);

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

        {/* Suppression de compte (workflow 2 étapes) */}
        {!deletionRequest && (
          <button
            type="button"
            onClick={() => { setDeletionStep('request'); setShowDeleteAccountModal(true); }}
            className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:bg-red-50 transition-colors text-left border-red-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div>
                <p className="font-bold text-red-700">Supprimer mon compte</p>
                <p className="text-xs text-gray-500">Étape 1 : Demander la suppression (puis confirmer ici).</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        )}
        {deletionRequest?.status === 'requested' && (
          <button
            type="button"
            onClick={() => { setDeletionStep('confirm'); setShowDeleteAccountModal(true); }}
            className="w-full bg-white rounded-2xl p-4 border border-amber-200 shadow-sm flex items-center justify-between hover:bg-amber-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-amber-800">Étape 2 : Confirmer la suppression</p>
                <p className="text-xs text-gray-500">Demande du {new Date(deletionRequest.requested_at).toLocaleDateString('fr-FR')}. Valide jusqu&apos;au {new Date(deletionRequest.expires_at).toLocaleDateString('fr-FR')}.</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        )}
        {deletionRequest?.status === 'confirmed' && (
          <div className="w-full bg-white rounded-2xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Loader2 size={20} className="text-gray-500 animate-spin" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Demande en attente</p>
                <p className="text-xs text-gray-500">Votre compte sera supprimé par l&apos;équipe. Vous serez déconnecté une fois le traitement effectué.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {showDeleteAccountModal && deletionStep === 'request' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !deletingAccount && setShowDeleteAccountModal(false)} role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <h3 id="delete-account-title" className="text-lg font-bold text-gray-900">Étape 1 : Demander la suppression</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">Une fois la demande enregistrée, vous devrez revenir ici pour confirmer (étape 2) avant que l&apos;équipe ne traite votre compte.</p>
            <label className="block text-xs font-medium text-gray-500 mb-1">Motif (optionnel)</label>
            <textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mb-4 resize-none" placeholder="Ex. je n&#39;utilise plus le service" />
            <div className="flex gap-3">
              <button type="button" disabled={deletingAccount} onClick={() => setShowDeleteAccountModal(false)} className="flex-1 py-3 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Annuler</button>
              <button type="button" disabled={deletingAccount} onClick={handleRequestDeletion} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {deletingAccount ? <Loader2 size={20} className="animate-spin" /> : null} Enregistrer la demande
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAccountModal && deletionStep === 'confirm' && deletionRequest?.status === 'requested' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !deletingAccount && setShowDeleteAccountModal(false)} role="dialog" aria-modal="true" aria-labelledby="delete-account-confirm-title">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h3 id="delete-account-confirm-title" className="text-lg font-bold text-gray-900">Étape 2 : Confirmer la suppression</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">Après confirmation, votre demande sera traitée par l&apos;équipe. La suppression est définitive et irréversible.</p>
            <div className="flex gap-3">
              <button type="button" disabled={deletingAccount} onClick={handleCancelDeletionRequest} className="flex-1 py-3 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Annuler la demande</button>
              <button type="button" disabled={deletingAccount} onClick={handleConfirmDeletion} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {deletingAccount ? <Loader2 size={20} className="animate-spin" /> : null} Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
