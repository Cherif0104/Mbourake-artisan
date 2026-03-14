import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToastContext } from '../../contexts/ToastContext';
import { LoadingOverlay } from '../../components/LoadingOverlay';

interface Team {
  id: string;
  department_id: string;
  code: string | null;
  name: string;
  manager_user_id: string | null;
  is_active: boolean;
  created_at: string;
  department?: { name: string; code: string | null };
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role_in_team: string | null;
  is_active: boolean;
  profile?: { full_name: string | null; email: string | null };
}

interface Department {
  id: string;
  name: string;
  code: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export function AdminTeams() {
  const [searchParams] = useSearchParams();
  const departmentId = searchParams.get('department');
  const { success: showSuccess, error: showError } = useToastContext();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Record<string, TeamMember[]>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; code: string; department_id: string; manager_user_id: string }>({
    name: '',
    code: '',
    department_id: '',
    manager_user_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);
  const [addMemberUserId, setAddMemberUserId] = useState('');

  const loadMembers = async (teamIds: string[]) => {
    if (teamIds.length === 0) {
      setMembers({});
      return;
    }
    const { data } = await supabase
      .from('team_members')
      .select('id, team_id, user_id, role_in_team, is_active, profile:profiles!team_members_user_id_fkey(full_name, email)')
      .in('team_id', teamIds);
    const byTeam: Record<string, TeamMember[]> = {};
    teamIds.forEach((tid) => (byTeam[tid] = []));
    (data || []).forEach((m: TeamMember) => {
      if (byTeam[m.team_id]) byTeam[m.team_id].push(m);
    });
    setMembers(byTeam);
  };

  const loadData = async () => {
    setLoading(true);
    const { data: depts } = await supabase
      .from('departments')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name');
    setDepartments((depts || []) as Department[]);

    let teamsQuery = supabase
      .from('teams')
      .select('id, department_id, code, name, manager_user_id, is_active, created_at, department:departments(name, code)')
      .order('name');
    if (departmentId) {
      teamsQuery = teamsQuery.eq('department_id', departmentId);
    }
    const { data: teamsData, error: teamsErr } = await teamsQuery;
    if (teamsErr) {
      showError(teamsErr.message);
      setTeams([]);
    } else {
      const t = (teamsData || []) as Team[];
      setTeams(t);
      await loadMembers(t.map((x) => x.id));
    }

    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name');
    setProfiles((profs || []) as Profile[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [departmentId]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.department_id) {
      showError('Nom et département requis.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('teams')
          .update({
            name: form.name.trim(),
            code: form.code.trim() || null,
            department_id: form.department_id,
            manager_user_id: form.manager_user_id || null,
          })
          .eq('id', editingId);
        if (error) throw error;
        showSuccess('Équipe mise à jour.');
      } else {
        const { error } = await supabase.from('teams').insert({
          name: form.name.trim(),
          code: form.code.trim() || null,
          department_id: form.department_id,
          manager_user_id: form.manager_user_id || null,
          is_active: true,
        });
        if (error) throw error;
        showSuccess('Équipe créée.');
      }
      setEditingId(null);
      setShowAddForm(false);
      setForm({ name: '', code: '', department_id: departmentId || departments[0]?.id || '', manager_user_id: '' });
      setEditingId(null);
      setShowAddForm(false);
      setAddMemberTeamId(null);
      setAddMemberUserId('');
      await loadData();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (t: Team) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      code: t.code || '',
      department_id: t.department_id,
      manager_user_id: t.manager_user_id || '',
    });
    setShowAddForm(false);
  };

  const handleToggleActive = async (t: Team) => {
    const { error } = await supabase.from('teams').update({ is_active: !t.is_active }).eq('id', t.id);
    if (error) showError(error.message);
    else {
      showSuccess(t.is_active ? 'Équipe désactivée.' : 'Équipe activée.');
      loadData();
    }
  };

  const handleAddMember = async () => {
    if (!addMemberTeamId || !addMemberUserId) return;
    const { error } = await supabase.from('team_members').insert({
      team_id: addMemberTeamId,
      user_id: addMemberUserId,
      is_active: true,
    });
    if (error) {
      if (error.code === '23505') showError('Cet utilisateur est déjà dans l\'équipe.');
      else showError(error.message);
    } else {
      showSuccess('Membre ajouté.');
      setAddMemberTeamId(null);
      setAddMemberUserId('');
      loadMembers();
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Retirer ce membre de l\'équipe ?')) return;
    const { error } = await supabase.from('team_members').delete().eq('id', memberId);
    if (error) showError(error.message);
    else {
      showSuccess('Membre retiré.');
      loadMembers();
    }
  };

  const defaultDeptId = departmentId || departments[0]?.id || '';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center">
            <Users className="text-brand-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Équipes</h1>
            <p className="text-sm text-gray-500">
              Équipes par département — assignation des agents.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={departmentId || ''}
            onChange={(e) => {
              const v = e.target.value;
              window.location.href = v ? `/admin/teams?department=${v}` : '/admin/teams';
            }}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="">Tous les départements</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setShowAddForm(true);
              setEditingId(null);
              setForm({ name: '', code: '', department_id: defaultDeptId, manager_user_id: '' });
            }}
            className="px-4 py-2.5 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600 flex items-center gap-2"
          >
            <Plus size={18} /> Nouvelle équipe
          </button>
        </div>
      </div>

      <LoadingOverlay visible={loading} />

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-bold text-gray-900">Liste des équipes</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {(showAddForm || editingId) && (
            <div className="px-6 py-4 bg-brand-50/50 border-b border-brand-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                {editingId ? 'Modifier' : 'Nouvelle équipe'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <select
                  value={form.department_id}
                  onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="">— Département —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="Code (optionnel)"
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nom de l'équipe"
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none"
                />
                <select
                  value={form.manager_user_id}
                  onChange={(e) => setForm((f) => ({ ...f, manager_user_id: e.target.value }))}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="">— Responsable —</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email || p.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !form.name.trim() || !form.department_id}
                  className="px-4 py-2 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600 disabled:opacity-50"
                >
                  {saving ? '…' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
          {teams.length === 0 && !loading ? (
            <div className="px-6 py-12 text-center text-gray-500">
              Aucune équipe. Créez d'abord des départements, puis des équipes.
            </div>
          ) : (
            teams.map((t) => (
              <div key={t.id} className="px-6 py-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                      <Users size={18} className="text-brand-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{t.name}</p>
                      <p className="text-sm text-gray-500">
                        {(t.department as { name?: string })?.name || '—'}
                        {t.code ? ` · ${t.code}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEdit(t)}
                      className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"
                      title="Modifier"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(t)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
                    >
                      {t.is_active ? 'Actif' : 'Inactif'}
                    </button>
                  </div>
                </div>
                <div className="pl-13 space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Membres</p>
                  {(members[t.id] || []).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border border-gray-100"
                    >
                      <span className="font-medium text-gray-900">
                        {m.profile?.full_name || m.profile?.email || m.user_id}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Retirer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {addMemberTeamId === t.id ? (
                    <div className="flex items-center gap-2 py-2">
                      <select
                        value={addMemberUserId}
                        onChange={(e) => setAddMemberUserId(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-500 focus:outline-none"
                      >
                        <option value="">— Choisir un utilisateur —</option>
                        {profiles
                          .filter((p) => !(members[t.id] || []).some((m) => m.user_id === p.id))
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.full_name || p.email || p.id}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddMember}
                        disabled={!addMemberUserId}
                        className="px-3 py-2 bg-brand-500 text-white rounded-lg text-sm font-bold hover:bg-brand-600 disabled:opacity-50"
                      >
                        Ajouter
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddMemberTeamId(null);
                          setAddMemberUserId('');
                        }}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddMemberTeamId(t.id)}
                      className="text-sm text-brand-600 font-medium hover:underline flex items-center gap-1"
                    >
                      <Plus size={14} /> Ajouter un membre
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
