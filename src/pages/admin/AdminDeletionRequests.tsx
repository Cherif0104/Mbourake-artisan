import React, { useEffect, useState } from 'react';
import { Trash2, CheckCircle, XCircle, Loader2, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToastContext } from '../../contexts/ToastContext';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { logAdminAudit } from '../../lib/adminAudit';

interface DeletionRequestRow {
  id: string;
  user_id: string;
  status: string;
  reason: string | null;
  requested_at: string;
  confirmed_at: string | null;
  expires_at: string;
  admin_notes: string | null;
  executed_at: string | null;
  profile?: { full_name: string | null; email: string | null };
}

export function AdminDeletionRequests() {
  const { success: showSuccess, error: showError } = useToastContext();
  const [list, setList] = useState<DeletionRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const fetchList = async () => {
    const { data, error } = await supabase
      .from('deletion_requests')
      .select('id, user_id, status, reason, requested_at, confirmed_at, expires_at, admin_notes, executed_at, profile:profiles!deletion_requests_user_id_fkey(full_name, email)')
      .in('status', ['requested', 'confirmed', 'executed', 'rejected'])
      .order('requested_at', { ascending: false });
    if (error) {
      showError(error.message);
      setList([]);
    } else {
      setList((data as DeletionRequestRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleExecute = async (row: DeletionRequestRow) => {
    if (row.status !== 'confirmed') return;
    setExecutingId(row.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        showError('Session expirée. Reconnectez-vous.');
        setExecutingId(null);
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
        body: JSON.stringify({ user_id: row.user_id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Erreur ${res.status}`);
      await supabase.from('deletion_requests').update({ status: 'executed', executed_at: new Date().toISOString(), executed_by: session?.user?.id ?? null }).eq('id', row.id);
      await logAdminAudit({ action: 'deletion_request.executed', entity_type: 'deletion_request', entity_id: row.id, new_data: { user_id: row.user_id } });
      showSuccess('Compte supprimé.');
      fetchList();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Erreur lors de la suppression');
    } finally {
      setExecutingId(null);
    }
  };

  const handleReject = async (row: DeletionRequestRow) => {
    if (row.status !== 'requested') return;
    const note = window.prompt('Motif du rejet (optionnel) :');
    if (note === null) return;
    setRejectingId(row.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('deletion_requests')
        .update({ status: 'rejected', rejected_at: new Date().toISOString(), rejected_by: user?.id ?? null, admin_notes: note?.trim() || null })
        .eq('id', row.id);
      if (error) throw error;
      await logAdminAudit({ action: 'deletion_request.rejected', entity_type: 'deletion_request', entity_id: row.id, new_data: { user_id: row.user_id }, reason: note?.trim() || undefined });
      showSuccess('Demande rejetée.');
      fetchList();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setRejectingId(null);
    }
  };

  if (loading) return <LoadingOverlay />;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
          <Trash2 size={20} className="text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">Demandes de suppression de compte</h1>
          <p className="text-sm text-gray-500">Workflow 2 étapes : demande → confirmation user → exécution par l&apos;admin</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-600 font-semibold">
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Demandé le</th>
                <th className="px-4 py-3">Confirmé le</th>
                <th className="px-4 py-3">Motif</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Aucune demande.</td></tr>
              ) : (
                list.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><User size={14} className="text-gray-500" /></div>
                        <div>
                          <p className="font-medium text-gray-900 truncate max-w-[180px]">{row.profile?.full_name || row.user_id}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[180px]">{row.profile?.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        row.status === 'confirmed' ? 'bg-amber-100 text-amber-800' :
                        row.status === 'requested' ? 'bg-gray-100 text-gray-700' :
                        row.status === 'executed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {row.status === 'requested' ? 'En attente' : row.status === 'confirmed' ? 'Confirmé' : row.status === 'executed' ? 'Exécuté' : 'Rejeté'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{new Date(row.requested_at).toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 text-gray-600">{row.confirmed_at ? new Date(row.confirmed_at).toLocaleString('fr-FR') : '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate" title={row.reason || ''}>{row.reason || '—'}</td>
                    <td className="px-4 py-3">
                      {row.status === 'confirmed' && (
                        <button
                          type="button"
                          disabled={executingId === row.id}
                          onClick={() => handleExecute(row)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50"
                        >
                          {executingId === row.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          Exécuter
                        </button>
                      )}
                      {row.status === 'requested' && (
                        <button
                          type="button"
                          disabled={rejectingId === row.id}
                          onClick={() => handleReject(row)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 disabled:opacity-50"
                        >
                          {rejectingId === row.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                          Rejeter
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
