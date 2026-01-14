import React, { useEffect, useState } from 'react';
import { Search, Filter, MoreVertical, User, Briefcase, Shield, CheckCircle, XCircle, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

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
    await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);
    fetchUsers();
    setSelectedUser(null);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
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
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
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
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Téléphone</span>
                <span className="font-bold text-gray-900">{selectedUser.phone || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Région</span>
                <span className="font-bold text-gray-900">{selectedUser.location || '-'}</span>
              </div>
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
