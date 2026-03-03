import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, MoreVertical, User, Briefcase, Shield } from 'lucide-react';
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
                    <Link
                      to={`/admin/users/${user.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                    >
                      <MoreVertical size={18} /> Détail
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
