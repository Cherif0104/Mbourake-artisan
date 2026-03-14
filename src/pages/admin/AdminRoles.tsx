import React, { useEffect, useState } from 'react';
import { Shield, User, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToastContext } from '../../contexts/ToastContext';
import { LoadingOverlay } from '../../components/LoadingOverlay';

interface AdminRole {
  id: string;
  code: string;
  name: string;
  scope_type: string;
}

interface Assignment {
  id: string;
  user_id: string;
  role_id: string;
  scope_type: string;
  scope_id: string | null;
  is_active: boolean;
  role?: AdminRole;
  profile?: { full_name: string | null; email: string | null };
}

export function AdminRoles() {
  const { success: showSuccess, error: showError } = useToastContext();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [addUserId, setAddUserId] = useState('');
  const [addRoleId, setAddRoleId] = useState('');
  const [addScopeType, setAddScopeType] = useState('global');
  const [addScopeId, setAddScopeId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const { data: rolesData } = await supabase.from('admin_roles').select('id, code, name, scope_type').eq('is_active', true).order('name');
    setRoles((rolesData || []) as AdminRole[]);

    const { data: assignData } = await supabase
      .from('admin_user_role_assignments')
      .select('id, user_id, role_id, scope_type, scope_id, is_active, role:admin_roles(id, code, name, scope_type), profile:profiles!admin_user_role_assignments_user_id_fkey(full_name, email)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    setAssignments((assignData || []) as Assignment[]);

    const { data: profs } = await supabase.from('profiles').select('id, full_name, email').order('full_name');
    setProfiles((profs || []) as { id: string; full_name: string | null; email: string | null }[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async () => {
    if (!addUserId || !addRoleId) {
      showError('Sélectionnez un utilisateur et un rôle.');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('admin_user_role_assignments').insert({
        user_id: addUserId,
        role_id: addRoleId,
        scope_type: addScopeType,
        scope_id: addScopeType !== 'global' && addScopeId ? addScopeId : null,
        is_active: true,
        assigned_by: user?.id ?? null,
      });
      if (error) throw error;
      showSuccess('Rôle assigné.');
      setAddUserId('');
      setAddRoleId('');
      setAddScopeType('global');
      setAddScopeId('');
      loadData();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    if (!window.confirm('Retirer cette assignation ?')) return;
    const { error } = await supabase.from('admin_user_role_assignments').update({ is_active: false }).eq('id', assignmentId);
    if (error) showError(error.message);
    else {
      showSuccess('Assignation retirée.');
      loadData();
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center">
          <Shield className="text-brand-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Rôles & Assignations</h1>
          <p className="text-sm text-gray-500">
            Assigner les rôles admin (super_admin, platform_admin, compliance_officer, etc.) aux utilisateurs.
          </p>
        </div>
      </div>

      <LoadingOverlay visible={loading} />

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-6">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-bold text-gray-900">Assigner un rôle</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">— Utilisateur —</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.email || p.id}
                </option>
              ))}
            </select>
            <select
              value={addRoleId}
              onChange={(e) => setAddRoleId(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">— Rôle —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
            <select
              value={addScopeType}
              onChange={(e) => setAddScopeType(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="global">Global</option>
              <option value="organisation">Organisation</option>
              <option value="department">Département</option>
              <option value="team">Équipe</option>
            </select>
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !addUserId || !addRoleId}
              className="px-4 py-2.5 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Assigner
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-bold text-gray-900">Assignations actuelles</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {assignments.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              Aucune assignation. Les utilisateurs avec <code className="bg-gray-100 px-1 rounded">role = 'admin'</code> dans profiles ont accès complet par défaut.
            </div>
          ) : (
            assignments.map((a) => (
              <div key={a.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                    <User size={18} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{a.profile?.full_name || a.profile?.email || a.user_id}</p>
                    <p className="text-sm text-gray-500">
                      {(a.role as AdminRole)?.name || a.role_id} · scope: {a.scope_type}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(a.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                  title="Retirer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
