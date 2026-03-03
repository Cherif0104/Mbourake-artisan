import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { User, Briefcase, Shield, CheckCircle, Ban, Trash2, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAudit } from '../../lib/adminAudit';
import { useToastContext } from '../../contexts/ToastContext';
import { LoadingOverlay } from '../../components/LoadingOverlay';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  location: string | null;
  avatar_url: string | null;
  created_at: string;
  is_suspended?: boolean | null;
  suspended_at?: string | null;
  suspended_reason?: string | null;
  formalisation_status?: string | null;
  professionalisation_status?: string | null;
  labellisation_status?: string | null;
}

export function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToastContext();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
      if (error) {
        showError(error.message);
        setLoading(false);
        return;
      }
      setUser(data as UserProfile | null);
      setLoading(false);
    })();
  }, [id, showError]);

  const handleChangeRole = async (userId: string, newRole: string) => {
    const previousRole = user?.id === userId ? user.role : undefined;
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) showError(error.message);
    else {
      await logAdminAudit({
        action: 'profile.role_change',
        entity_type: 'profile',
        entity_id: userId,
        old_data: previousRole != null ? { role: previousRole } : undefined,
        new_data: { role: newRole },
      });
      showSuccess('Rôle mis à jour.');
      setUser((u) => (u?.id === userId ? { ...u, role: newRole } : u));
    }
  };

  const handleSuspend = async (userId: string, suspend: boolean) => {
    setSuspendingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_suspended: suspend,
          suspended_at: suspend ? new Date().toISOString() : null,
          suspended_reason: suspend ? 'Suspendu par un administrateur' : null,
        })
        .eq('id', userId);
      if (error) throw error;
      await logAdminAudit({
        action: suspend ? 'profile.suspend' : 'profile.reactivate',
        entity_type: 'profile',
        entity_id: userId,
        new_data: { is_suspended: suspend },
      });
      showSuccess(suspend ? 'Compte suspendu.' : 'Compte réactivé.');
      setUser((u) => (u?.id === userId ? { ...u, is_suspended: suspend } : u));
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSuspendingId(null);
    }
  };

  const handleDeleteAccount = async (userId: string) => {
    if (!window.confirm('Supprimer définitivement ce compte et toutes ses données ? Cette action est irréversible.')) return;
    setDeletingId(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        showError('Session expirée. Reconnectez-vous.');
        setDeletingId(null);
        return;
      }
      const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const fnUrl = isLocalhost
        ? '/api/supabase-functions/v1/admin-delete-account'
        : (baseUrl ? `${baseUrl.replace(/\/$/, '')}/functions/v1/admin-delete-account` : `${window.location.origin}/functions/v1/admin-delete-account`);
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: userId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Erreur ${res.status}`);
      showSuccess('Compte supprimé.');
      navigate('/admin/users');
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <LoadingOverlay />;
  if (!user) {
    return (
      <div className="space-y-4">
        <Link to="/admin/users" className="inline-flex items-center gap-2 text-brand-600 font-bold hover:underline">
          <ArrowLeft size={18} /> Retour aux utilisateurs
        </Link>
        <p className="text-gray-500">Utilisateur introuvable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <Link to="/admin/users" className="inline-flex items-center gap-2 text-brand-600 font-bold hover:underline">
        <ArrowLeft size={18} /> Retour aux utilisateurs
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne gauche : identité + infos */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden shrink-0">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={28} className="text-brand-600" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-gray-900 truncate">{user.full_name || 'Sans nom'}</h1>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Rôle actuel</span>
              <span className="font-bold text-gray-900 capitalize">{user.role}</span>
            </div>
            <div className="flex justify-between py-2 border-b items-center">
              <span className="text-gray-500">Statut compte</span>
              <span className={`font-bold ${user.is_suspended ? 'text-amber-600' : 'text-green-600'}`}>
                {user.is_suspended ? 'Suspendu' : 'Actif'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Téléphone</span>
              <span className="font-bold text-gray-900">{user.phone || '-'}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Région</span>
              <span className="font-bold text-gray-900">{user.location || '-'}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Inscription</span>
              <span className="font-bold text-gray-900">{new Date(user.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            {user.role === 'artisan' && (
              <div className="flex flex-col gap-2 py-2 border-b">
                <span className="text-gray-500 text-sm">Parcours F‑P‑L</span>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-gray-50 text-[11px] text-gray-700 border border-gray-200">
                    F : {user.formalisation_status || 'à démarrer'}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-gray-50 text-[11px] text-gray-700 border border-gray-200">
                    P : {user.professionalisation_status || 'à démarrer'}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-gray-50 text-[11px] text-gray-700 border border-gray-200">
                    L : {user.labellisation_status || 'à démarrer'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite : actions (rôle, suspension, suppression) */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col gap-6">
          <div className="space-y-3">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Changer le rôle</p>
            <div className="grid grid-cols-3 gap-2">
              {['client', 'artisan', 'admin'].map((role) => (
                <button
                  key={role}
                  onClick={() => handleChangeRole(user.id, role)}
                  disabled={user.role === role}
                  className={`py-2 rounded-xl font-bold text-sm capitalize transition-all ${
                    user.role === role ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Suspension</p>
            <div className="flex gap-2">
              {user.is_suspended ? (
                <button
                  type="button"
                  onClick={() => handleSuspend(user.id, false)}
                  disabled={suspendingId === user.id}
                  className="flex-1 py-2 rounded-xl font-bold text-sm bg-green-100 text-green-700 hover:bg-green-200 transition-colors flex items-center justify-center gap-2"
                >
                  {suspendingId === user.id ? '…' : null}
                  <CheckCircle size={16} /> Réactiver
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSuspend(user.id, true)}
                  disabled={suspendingId === user.id}
                  className="flex-1 py-2 rounded-xl font-bold text-sm bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors flex items-center justify-center gap-2"
                >
                  {suspendingId === user.id ? '…' : null}
                  <Ban size={16} /> Suspendre
                </button>
              )}
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => handleDeleteAccount(user.id)}
              disabled={deletingId === user.id}
              className="w-full py-2.5 rounded-xl font-bold text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
            >
              {deletingId === user.id ? 'Suppression…' : <Trash2 size={16} />}
              Supprimer le compte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
