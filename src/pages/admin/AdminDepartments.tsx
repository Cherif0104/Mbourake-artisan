import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToastContext } from '../../contexts/ToastContext';
import { LoadingOverlay } from '../../components/LoadingOverlay';

interface Department {
  id: string;
  code: string | null;
  name: string;
  parent_department_id: string | null;
  manager_user_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

const DEFAULT_DEPARTMENTS = [
  { code: 'REL_CLIENT', name: 'Relation Client & Artisans' },
  { code: 'FINANCE', name: 'Finance & Paiements' },
  { code: 'OPS', name: 'Opérations & Conformité' },
  { code: 'COMMERCIAL', name: 'Commercial & Partenariats' },
  { code: 'BI', name: 'BI & Données' },
];

export function AdminDepartments() {
  const { success: showSuccess, error: showError } = useToastContext();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; code: string; manager_user_id: string }>({ name: '', code: '', manager_user_id: '' });
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const { data: depts, error: deptErr } = await supabase
      .from('departments')
      .select('id, code, name, parent_department_id, manager_user_id, is_active, created_at')
      .order('name');
    if (deptErr) {
      showError(deptErr.message);
      setDepartments([]);
    } else {
      setDepartments((depts || []) as Department[]);
    }

    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'admin')
      .order('full_name');
    setProfiles((profs || []) as Profile[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSeedDepartments = async () => {
    if (!window.confirm('Créer les 5 départements par défaut (REL_CLIENT, FINANCE, OPS, COMMERCIAL, BI) ?')) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('departments').upsert(
        DEFAULT_DEPARTMENTS.map((d) => ({ code: d.code, name: d.name, is_active: true })),
        { onConflict: 'code' }
      );
      if (error) throw error;
      showSuccess('Départements créés.');
      loadData();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showError('Nom requis.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('departments')
          .update({
            name: form.name.trim(),
            code: form.code.trim() || null,
            manager_user_id: form.manager_user_id || null,
          })
          .eq('id', editingId);
        if (error) throw error;
        showSuccess('Département mis à jour.');
      } else {
        const { error } = await supabase.from('departments').insert({
          name: form.name.trim(),
          code: form.code.trim() || null,
          manager_user_id: form.manager_user_id || null,
          is_active: true,
        });
        if (error) throw error;
        showSuccess('Département créé.');
      }
      setEditingId(null);
      setShowAddForm(false);
      setForm({ name: '', code: '', manager_user_id: '' });
      loadData();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (d: Department) => {
    setEditingId(d.id);
    setForm({
      name: d.name,
      code: d.code || '',
      manager_user_id: d.manager_user_id || '',
    });
    setShowAddForm(false);
  };

  const handleToggleActive = async (d: Department) => {
    const { error } = await supabase
      .from('departments')
      .update({ is_active: !d.is_active })
      .eq('id', d.id);
    if (error) showError(error.message);
    else {
      showSuccess(d.is_active ? 'Département désactivé.' : 'Département activé.');
      loadData();
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center">
            <Building2 className="text-brand-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Départements</h1>
            <p className="text-sm text-gray-500">
              Structure hiérarchique — Relation client, Finance, Ops, Commercial, BI.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {departments.length === 0 && (
            <button
              type="button"
              onClick={handleSeedDepartments}
              disabled={saving}
              className="px-4 py-2.5 bg-gray-800 text-white rounded-xl font-bold text-sm hover:bg-gray-900 disabled:opacity-50 flex items-center gap-2"
            >
              Créer les départements par défaut
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setShowAddForm(true);
              setEditingId(null);
              setForm({ name: '', code: '', manager_user_id: '' });
            }}
            className="px-4 py-2.5 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600 flex items-center gap-2"
          >
            <Plus size={18} /> Nouveau
          </button>
        </div>
      </div>

      <LoadingOverlay visible={loading} />

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-bold text-gray-900">Liste des départements</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {(showAddForm || editingId) && (
            <div className="px-6 py-4 bg-brand-50/50 border-b border-brand-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                {editingId ? 'Modifier' : 'Nouveau département'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="Code (ex: REL_CLIENT)"
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nom du département"
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
                  disabled={saving || !form.name.trim()}
                  className="px-4 py-2 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600 disabled:opacity-50"
                >
                  {saving ? '…' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                    setForm({ name: '', code: '', manager_user_id: '' });
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
          {departments.length === 0 && !loading ? (
            <div className="px-6 py-12 text-center text-gray-500">
              Aucun département. Cliquez sur « Créer les départements par défaut » ou « Nouveau ».
            </div>
          ) : (
            departments.map((d) => (
              <div
                key={d.id}
                className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50/50"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{d.name}</p>
                    <p className="text-sm text-gray-500">{d.code || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/admin/teams?department=${d.id}`}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 flex items-center gap-1.5"
                  >
                    <Users size={14} /> Équipes
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleEdit(d)}
                    className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"
                    title="Modifier"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(d)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
                  >
                    {d.is_active ? 'Actif' : 'Inactif'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
