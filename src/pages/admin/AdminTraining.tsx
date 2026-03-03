import React, { useEffect, useState } from 'react';
import { GraduationCap, Users, TrendingUp, Plus, ChevronDown, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { Link } from 'react-router-dom';

interface TrainingCohort {
  id: string;
  name: string;
  description: string | null;
  organisation_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CohortMember {
  id: string;
  cohort_id: string;
  user_id: string;
  status: string;
  result_score: number | null;
  result_notes: string | null;
  enrolled_at: string;
  completed_at: string | null;
  profile?: { full_name: string | null; email: string | null };
  /** Corrélation performance : projets réalisés et montant encaissé (après formation) */
  performance?: { projectsCount: number; escrowTotal: number };
}

interface CohortWithMeta extends TrainingCohort {
  org_name?: string | null;
  members: CohortMember[];
  completedCount: number;
  projectsCount: number;
  escrowTotal: number;
}

export function AdminTraining() {
  const [loading, setLoading] = useState(true);
  const [cohorts, setCohorts] = useState<CohortWithMeta[]>([]);
  const [organisations, setOrganisations] = useState<{ id: string; name: string }[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCohort, setEditingCohort] = useState<TrainingCohort | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    organisation_id: '',
    starts_at: '',
    ends_at: '',
    status: 'draft',
  });
  const [saving, setSaving] = useState(false);
  const [addMemberCohortId, setAddMemberCohortId] = useState<string | null>(null);
  const [artisanSearch, setArtisanSearch] = useState('');
  const [artisanSearchResults, setArtisanSearchResults] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);

  const loadCohorts = async () => {
    const { data: cohortsData, error: cohortsErr } = await supabase
      .from('training_cohorts')
      .select('*')
      .order('created_at', { ascending: false });
    if (cohortsErr) {
      setCohorts([]);
      return;
    }
    const list = (cohortsData as TrainingCohort[]) || [];
    const { data: chambres } = await supabase.from('chambres_metier').select('id, name');
    const orgMap = new Map((chambres || []).map((c: { id: string; name: string }) => [c.id, c.name]));

    const withMeta: CohortWithMeta[] = await Promise.all(
      list.map(async (c) => {
        const { data: membersData } = await supabase
          .from('training_cohort_members')
          .select('id, cohort_id, user_id, status, result_score, result_notes, enrolled_at, completed_at')
          .eq('cohort_id', c.id);
        const members = (membersData as CohortMember[]) || [];
        const userIds = members.map((m) => m.user_id);
        let profiles: { id: string; full_name: string | null; email: string | null }[] = [];
        if (userIds.length) {
          const { data: prof } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
          profiles = (prof || []) as { id: string; full_name: string | null; email: string | null }[];
        }
        const profileMap = new Map(profiles.map((p) => [p.id, p]));
        const membersWithProfile = members.map((m) => ({ ...m, profile: profileMap.get(m.user_id) }));

        const completedUserIds = membersWithProfile.filter((m) => m.status === 'completed').map((m) => m.user_id);
        let projectsCount = 0;
        let escrowTotal = 0;
        const memberPerformance = new Map<string, { projectsCount: number; escrowTotal: number }>();
        if (completedUserIds.length) {
          const { data: completedProjects, count } = await supabase
            .from('projects')
            .select('id, target_artisan_id', { count: 'exact' })
            .in('target_artisan_id', completedUserIds)
            .eq('status', 'completed');
          projectsCount = count ?? 0;
          const projects = (completedProjects || []) as { id: string; target_artisan_id: string }[];
          const projectIds = projects.map((p) => p.id);
          let escrows: { project_id: string; total_amount: number }[] = [];
          if (projectIds.length) {
            const { data: escrowsData } = await supabase
              .from('escrows')
              .select('project_id, total_amount')
              .in('project_id', projectIds);
            escrows = (escrowsData || []).map((e: { project_id: string; total_amount: number }) => ({
              project_id: e.project_id,
              total_amount: Number(e.total_amount || 0),
            }));
            escrowTotal = escrows.reduce((s, e) => s + e.total_amount, 0);
          }
          const projectIdToArtisan = new Map(projects.map((p) => [p.id, p.target_artisan_id]));
          completedUserIds.forEach((uid) => memberPerformance.set(uid, { projectsCount: 0, escrowTotal: 0 }));
          projects.forEach((p) => {
            const cur = memberPerformance.get(p.target_artisan_id)!;
            cur.projectsCount += 1;
          });
          escrows.forEach((e) => {
            const uid = projectIdToArtisan.get(e.project_id);
            if (uid) {
              const cur = memberPerformance.get(uid)!;
              cur.escrowTotal += e.total_amount;
            }
          });
        }
        const membersWithPerf = membersWithProfile.map((m) => ({
          ...m,
          performance: memberPerformance.get(m.user_id) ?? { projectsCount: 0, escrowTotal: 0 },
        }));

        return {
          ...c,
          org_name: c.organisation_id ? orgMap.get(c.organisation_id) ?? null : null,
          members: membersWithPerf,
          completedCount: membersWithProfile.filter((m) => m.status === 'completed').length,
          projectsCount,
          escrowTotal,
        };
      })
    );
    setCohorts(withMeta);
  };

  useEffect(() => {
    (async () => {
      const { data: orgs } = await supabase.from('chambres_metier').select('id, name');
      setOrganisations((orgs as { id: string; name: string }[]) || []);
      await loadCohorts();
      setLoading(false);
    })();
  }, []);

  const saveCohort = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      organisation_id: form.organisation_id || null,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      status: form.status,
    };
    if (editingCohort) {
      await supabase.from('training_cohorts').update(payload).eq('id', editingCohort.id);
    } else {
      await supabase.from('training_cohorts').insert(payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditingCohort(null);
    setForm({ name: '', description: '', organisation_id: '', starts_at: '', ends_at: '', status: 'draft' });
    await loadCohorts();
  };

  const deleteCohort = async (id: string) => {
    if (!window.confirm('Supprimer cette cohorte et tous ses inscrits ?')) return;
    await supabase.from('training_cohorts').delete().eq('id', id);
    await loadCohorts();
    if (expandedId === id) setExpandedId(null);
  };

  const openEdit = (c: TrainingCohort) => {
    setEditingCohort(c);
    setForm({
      name: c.name,
      description: c.description || '',
      organisation_id: c.organisation_id || '',
      starts_at: c.starts_at || '',
      ends_at: c.ends_at || '',
      status: c.status,
    });
    setShowForm(true);
  };

  const searchArtisans = async () => {
    if (!artisanSearch.trim() || !addMemberCohortId) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'artisan')
      .or(`full_name.ilike.%${artisanSearch.trim()}%,email.ilike.%${artisanSearch.trim()}%`)
      .limit(20);
    setArtisanSearchResults((data as { id: string; full_name: string | null; email: string | null }[]) || []);
  };

  const addMember = async (cohortId: string, userId: string) => {
    await supabase.from('training_cohort_members').insert({ cohort_id: cohortId, user_id: userId });
    setAddMemberCohortId(null);
    setArtisanSearch('');
    setArtisanSearchResults([]);
    await loadCohorts();
  };

  const updateMemberStatus = async (
    memberId: string,
    status: string,
    result_score?: number | null,
    completed_at?: string | null,
    result_notes?: string | null
  ) => {
    const payload: { status: string; result_score: number | null; completed_at: string | null; result_notes?: string | null } = {
      status,
      result_score: result_score ?? null,
      completed_at: completed_at ?? null,
    };
    if (result_notes !== undefined) payload.result_notes = result_notes;
    await supabase.from('training_cohort_members').update(payload).eq('id', memberId);
    await loadCohorts();
  };

  const saveMemberNotes = async (memberId: string, result_notes: string | null) => {
    await supabase.from('training_cohort_members').update({ result_notes }).eq('id', memberId);
    await loadCohorts();
  };

  const removeMember = async (memberId: string) => {
    if (!window.confirm('Retirer ce participant de la cohorte ?')) return;
    await supabase.from('training_cohort_members').delete().eq('id', memberId);
    await loadCohorts();
  };

  if (loading) return <LoadingOverlay />;

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
            <GraduationCap size={24} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Formation & cohortes</h1>
            <p className="text-sm text-gray-500">Cohortes, résultats et corrélation performance (Sprint 4)</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingCohort(null);
            setForm({ name: '', description: '', organisation_id: '', starts_at: '', ends_at: '', status: 'draft' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-colors"
        >
          <Plus size={18} />
          Nouvelle cohorte
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{editingCohort ? 'Modifier la cohorte' : 'Créer une cohorte'}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5"
                placeholder="Ex: Cohorte Q1 2025 - Gestion"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organisation</label>
              <select
                value={form.organisation_id}
                onChange={(e) => setForm((f) => ({ ...f, organisation_id: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5"
              >
                <option value="">— Aucune —</option>
                {organisations.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5"
                rows={2}
                placeholder="Objectifs, thème..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Début</label>
              <input
                type="date"
                value={form.starts_at}
                onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
              <input
                type="date"
                value={form.ends_at}
                onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5"
              >
                <option value="draft">Brouillon</option>
                <option value="open">Ouverte</option>
                <option value="closed">Clôturée</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={saveCohort}
              disabled={saving || !form.name.trim()}
              className="px-4 py-2.5 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : editingCohort ? 'Enregistrer' : 'Créer'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingCohort(null); }}
              className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {cohorts.length === 0 && !showForm && (
          <p className="text-gray-500 text-center py-8">Aucune cohorte. Créez-en une pour commencer.</p>
        )}
        {cohorts.map((cohort) => (
          <div key={cohort.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === cohort.id ? null : cohort.id)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50"
            >
              {expandedId === cohort.id ? <ChevronDown size={20} className="text-gray-500" /> : <ChevronRight size={20} className="text-gray-500" />}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{cohort.name}</p>
                <p className="text-sm text-gray-500">
                  {cohort.org_name && <span>{cohort.org_name} · </span>}
                  <span>{cohort.members.length} participant(s)</span>
                  {cohort.starts_at && <span> · {new Date(cohort.starts_at).toLocaleDateString('fr-FR')}</span>}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${cohort.status === 'closed' ? 'bg-gray-200 text-gray-700' : cohort.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                {cohort.status === 'draft' ? 'Brouillon' : cohort.status === 'open' ? 'Ouverte' : 'Clôturée'}
              </span>
              <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(cohort); }} className="p-2 text-gray-400 hover:text-brand-600 rounded-lg" aria-label="Modifier"><Edit2 size={18} /></button>
              <button type="button" onClick={(e) => { e.stopPropagation(); deleteCohort(cohort.id); }} className="p-2 text-gray-400 hover:text-red-600 rounded-lg" aria-label="Supprimer"><Trash2 size={18} /></button>
            </button>

            {expandedId === cohort.id && (
              <div className="border-t border-gray-200 p-4 space-y-6 bg-gray-50/50">
                {/* Résultats & performance */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-2"><Users size={16} /> Taux de complétion</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">
                      {cohort.members.length ? Math.round((cohort.completedCount / cohort.members.length) * 100) : 0} %
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{cohort.completedCount} / {cohort.members.length} complétés</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-2"><TrendingUp size={16} /> Projets réalisés (complétés)</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{cohort.projectsCount}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Par les artisans ayant terminé la formation</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-2">Montant encaissé</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{cohort.escrowTotal.toLocaleString('fr-FR')} F</p>
                    <p className="text-xs text-gray-500 mt-0.5">Corrélation performance cohorte</p>
                  </div>
                </div>

                {/* Participants */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="font-bold text-gray-900">Participants</h3>
                    {addMemberCohortId !== cohort.id ? (
                      <button
                        type="button"
                        onClick={() => setAddMemberCohortId(cohort.id)}
                        className="text-sm font-bold text-brand-600 hover:underline"
                      >
                        + Ajouter un artisan
                      </button>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        <input
                          type="text"
                          value={artisanSearch}
                          onChange={(e) => setArtisanSearch(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && searchArtisans()}
                          placeholder="Nom ou email artisan"
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm w-48"
                        />
                        <button type="button" onClick={searchArtisans} className="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-sm font-bold">Rechercher</button>
                        <button type="button" onClick={() => { setAddMemberCohortId(null); setArtisanSearch(''); setArtisanSearchResults([]); }} className="text-sm text-gray-500 hover:underline">Annuler</button>
                      </div>
                    )}
                  </div>
                  {addMemberCohortId === cohort.id && artisanSearchResults.length > 0 && (
                    <ul className="mb-4 space-y-1">
                      {artisanSearchResults.map((a) => (
                        <li key={a.id} className="flex items-center justify-between bg-white rounded-lg border px-3 py-2">
                          <span>{a.full_name || a.email || a.id}</span>
                          <button type="button" onClick={() => addMember(cohort.id, a.id)} className="text-brand-600 font-bold text-sm">Ajouter</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <ul className="space-y-2">
                    {cohort.members.length === 0 && <p className="text-gray-500 text-sm py-2">Aucun participant.</p>}
                    {cohort.members.map((m) => (
                      <li key={m.id} className="flex flex-wrap items-start gap-2 bg-white rounded-xl border border-gray-200 p-3">
                        <div className="min-w-0 flex-1">
                          <Link to={`/admin/users/${m.user_id}`} className="font-medium text-gray-900 hover:text-brand-600 truncate block">{m.profile?.full_name || m.profile?.email || m.user_id}</Link>
                          <p className="text-xs text-gray-500">{m.status} · inscrit le {new Date(m.enrolled_at).toLocaleDateString('fr-FR')}</p>
                          {m.status === 'completed' && m.performance && (m.performance.projectsCount > 0 || m.performance.escrowTotal > 0) && (
                            <p className="text-xs text-green-700 mt-1">
                              Performance : {m.performance.projectsCount} projet(s) · {m.performance.escrowTotal.toLocaleString('fr-FR')} F encaissés
                            </p>
                          )}
                        </div>
                        <select
                          value={m.status}
                          onChange={(e) => updateMemberStatus(m.id, e.target.value, m.result_score, m.status === 'completed' ? m.completed_at : e.target.value === 'completed' ? new Date().toISOString() : null, m.result_notes)}
                          className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                        >
                          <option value="enrolled">Inscrit</option>
                          <option value="completed">Complété</option>
                          <option value="abandoned">Abandonné</option>
                        </select>
                        {m.status === 'completed' && (
                          <>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              value={m.result_score ?? ''}
                              onChange={(e) => updateMemberStatus(m.id, m.status, e.target.value ? Number(e.target.value) : null, m.completed_at, m.result_notes)}
                              placeholder="Note"
                              className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                            />
                            <div className="w-full sm:w-48">
                              <textarea
                                defaultValue={m.result_notes ?? ''}
                                onBlur={(e) => {
                                  const v = e.target.value.trim() || null;
                                  if (v !== (m.result_notes ?? '')) saveMemberNotes(m.id, v);
                                }}
                                placeholder="Notes résultat"
                                className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm resize-none"
                                rows={1}
                              />
                            </div>
                          </>
                        )}
                        <button type="button" onClick={() => removeMember(m.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" aria-label="Retirer"><Trash2 size={14} /></button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
