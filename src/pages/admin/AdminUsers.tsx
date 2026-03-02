import React, { useEffect, useState } from 'react';
import { Search, Filter, MoreVertical, User, Briefcase, Shield, CheckCircle, XCircle, Eye, Ban, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { useToastContext } from '../../contexts/ToastContext';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  location: string | null;
  avatar_url: string | null;
  created_at: string;
  is_verified?: boolean;
  is_suspended?: boolean | null;
  suspended_at?: string | null;
  suspended_reason?: string | null;
  formalisation_status?: string | null;
  professionalisation_status?: string | null;
  labellisation_status?: string | null;
}

export function AdminUsers() {
  const { success: showSuccess, error: showError } = useToastContext();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleChangeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) showError(error.message);
    else showSuccess('Rôle mis à jour.');
    fetchUsers();
    setSelectedUser(null);
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
      showSuccess(suspend ? 'Compte suspendu.' : 'Compte réactivé.');
      fetchUsers();
      setSelectedUser((u) => (u?.id === userId ? { ...u, is_suspended: suspend } : u));
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
      const fnUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/functions/v1/admin-delete-account` : `${window.location.origin}/functions/v1/admin-delete-account`;
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: userId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? `Erreur ${res.status}`);
      }
      showSuccess('Compte supprimé.');
      setSelectedUser(null);
      fetchUsers();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportCsv = () => {
    const rows = filteredUsers;
    if (!rows.length) return;

    const headers = [
      'id',
      'full_name',
      'email',
      'role',
      'phone',
      'location',
      'created_at',
      'formalisation_status',
      'professionalisation_status',
      'labellisation_status',
    ];

    const csvContent = [
      headers.join(';'),
      ...rows.map((u) =>
        [
          u.id,
          u.full_name ?? '',
          u.email ?? '',
          u.role ?? '',
          u.phone ?? '',
          u.location ?? '',
          u.created_at ?? '',
          u.formalisation_status ?? '',
          u.professionalisation_status ?? '',
          u.labellisation_status ?? '',
        ]
          .map((value) => `"${(value ?? '').toString().replace(/"/g, '""')}"`)
          .join(';'),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mbourake-utilisateurs.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom ou email..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none font-medium"
        >
          <option value="all">Tous les rôles</option>
          <option value="client">Clients</option>
          <option value="artisan">Artisans</option>
          <option value="admin">Admins</option>
        </select>
        <button
          type="button"
          onClick={handleExportCsv}
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-brand-300 hover:text-brand-600 transition-colors flex items-center gap-2"
        >
          <Filter size={16} className="text-gray-400" />
          Export CSV
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Utilisateur</th>
              <th className="text-left px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Rôle</th>
              <th className="text-left px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Contact</th>
              <th className="text-left px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Inscription</th>
              <th className="text-right px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  Aucun utilisateur trouvé
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={18} className="text-brand-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{user.full_name || 'Sans nom'}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'artisan' ? 'bg-brand-100 text-brand-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role === 'artisan' && <Briefcase size={12} />}
                      {user.role === 'admin' && <Shield size={12} />}
                      {user.role === 'client' && <User size={12} />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{user.phone || '-'}</p>
                    <p className="text-xs text-gray-400">{user.location || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden">
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={28} className="text-brand-600" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">{selectedUser.full_name}</h3>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Rôle actuel</span>
                <span className="font-bold text-gray-900 capitalize">{selectedUser.role}</span>
              </div>
              <div className="flex justify-between py-2 border-b items-center">
                <span className="text-gray-500">Statut compte</span>
                <span className={`font-bold ${selectedUser.is_suspended ? 'text-amber-600' : 'text-green-600'}`}>
                  {selectedUser.is_suspended ? 'Suspendu' : 'Actif'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Téléphone</span>
                <span className="font-bold text-gray-900">{selectedUser.phone || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Région</span>
                <span className="font-bold text-gray-900">{selectedUser.location || '-'}</span>
              </div>
              {selectedUser.role === 'artisan' && (
                <div className="flex flex-col gap-2 py-2 border-b">
                  <span className="text-gray-500 text-sm">Parcours F‑P‑L</span>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-gray-50 text-[11px] text-gray-700 border border-gray-200">
                      F : {selectedUser.formalisation_status || 'à démarrer'}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-gray-50 text-[11px] text-gray-700 border border-gray-200">
                      P : {selectedUser.professionalisation_status || 'à démarrer'}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-gray-50 text-[11px] text-gray-700 border border-gray-200">
                      L : {selectedUser.labellisation_status || 'à démarrer'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Changer le rôle</p>
              <div className="grid grid-cols-3 gap-2">
                {['client', 'artisan', 'admin'].map((role) => (
                  <button
                    key={role}
                    onClick={() => handleChangeRole(selectedUser.id, role)}
                    disabled={selectedUser.role === role}
                    className={`py-2 rounded-xl font-bold text-sm capitalize transition-all ${
                      selectedUser.role === role
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Suspension</p>
              <div className="flex gap-2">
                {selectedUser.is_suspended ? (
                  <button
                    type="button"
                    onClick={() => handleSuspend(selectedUser.id, false)}
                    disabled={suspendingId === selectedUser.id}
                    className="flex-1 py-2 rounded-xl font-bold text-sm bg-green-100 text-green-700 hover:bg-green-200 transition-colors flex items-center justify-center gap-2"
                  >
                    {suspendingId === selectedUser.id ? '…' : null}
                    <CheckCircle size={16} />
                    Réactiver
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSuspend(selectedUser.id, true)}
                    disabled={suspendingId === selectedUser.id}
                    className="flex-1 py-2 rounded-xl font-bold text-sm bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors flex items-center justify-center gap-2"
                  >
                    {suspendingId === selectedUser.id ? '…' : null}
                    <Ban size={16} />
                    Suspendre
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => handleDeleteAccount(selectedUser.id)}
                disabled={deletingId === selectedUser.id}
                className="w-full py-2.5 rounded-xl font-bold text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
              >
                {deletingId === selectedUser.id ? 'Suppression…' : <Trash2 size={16} />}
                Supprimer le compte
              </button>
            </div>

            <button
              onClick={() => setSelectedUser(null)}
              className="w-full mt-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
