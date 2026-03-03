import React, { useEffect, useState } from 'react';
import { Target, TrendingUp, Users, Briefcase, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingOverlay } from '../../components/LoadingOverlay';

interface OkrPeriod {
  id: string;
  name: string;
  period_type: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

interface OkrObjective {
  id: string;
  period_id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface OkrKeyResult {
  id: string;
  objective_id: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string;
  sort_order: number;
}

interface ExecutiveStats {
  totalUsers: number;
  totalProjects: number;
  completedProjects: number;
  totalEscrow: number;
}

export function AdminExecutive() {
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<(OkrPeriod & { objectives: (OkrObjective & { key_results: OkrKeyResult[] })[] })[]>([]);
  const [stats, setStats] = useState<ExecutiveStats>({ totalUsers: 0, totalProjects: 0, completedProjects: 0, totalEscrow: 0 });

  useEffect(() => {
    (async () => {
      const [periodsRes, countUsers, countProjects, countCompleted, escrowRes] = await Promise.all([
        supabase.from('okr_periods').select('id, name, period_type, starts_at, ends_at, is_active').eq('is_active', true).order('starts_at', { ascending: false }).limit(4),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('escrows').select('total_amount').eq('status', 'held'),
      ]);

      const periodList = (periodsRes.data as OkrPeriod[]) || [];
      const objectivesRes = periodList.length
        ? await supabase.from('okr_objectives').select('id, period_id, title, description, sort_order').in('period_id', periodList.map((p) => p.id)).order('sort_order')
        : { data: [] };
      const objectives = (objectivesRes.data as OkrObjective[]) || [];
      const keyResultsRes = objectives.length
        ? await supabase.from('okr_key_results').select('id, objective_id, title, target_value, current_value, unit, sort_order').in('objective_id', objectives.map((o) => o.id)).order('sort_order')
        : { data: [] };
      const keyResults = (keyResultsRes.data as OkrKeyResult[]) || [];

      const objectivesWithKr = objectives.map((o) => ({
        ...o,
        key_results: keyResults.filter((kr) => kr.objective_id === o.id),
      }));
      const periodsWithObjectives = periodList.map((p) => ({
        ...p,
        objectives: objectivesWithKr.filter((o) => o.period_id === p.id),
      }));

      setPeriods(periodsWithObjectives);
      setStats({
        totalUsers: countUsers.count ?? 0,
        totalProjects: countProjects.count ?? 0,
        completedProjects: countCompleted.count ?? 0,
        totalEscrow: (escrowRes.data ?? []).reduce((s, e) => s + Number(e.total_amount || 0), 0),
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingOverlay />;

  const progressPct = (current: number, target: number) => (target > 0 ? Math.min(100, Math.round((Number(current) / Number(target)) * 100)) : 0);

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
          <TrendingUp size={24} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Dashboard exécutif</h1>
          <p className="text-sm text-gray-500">Vue synthétique et OKR (Sprint 4)</p>
        </div>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Users size={20} className="text-blue-600" /></div>
          <div><p className="text-xs text-gray-500 font-medium">Utilisateurs</p><p className="text-xl font-black text-gray-900">{stats.totalUsers}</p></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center"><Briefcase size={20} className="text-brand-600" /></div>
          <div><p className="text-xs text-gray-500 font-medium">Projets (total)</p><p className="text-xl font-black text-gray-900">{stats.totalProjects}</p></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><Briefcase size={20} className="text-green-600" /></div>
          <div><p className="text-xs text-gray-500 font-medium">Projets complétés</p><p className="text-xl font-black text-gray-900">{stats.completedProjects}</p></div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><DollarSign size={20} className="text-amber-600" /></div>
          <div><p className="text-xs text-gray-500 font-medium">Escrow (FCFA)</p><p className="text-xl font-black text-gray-900">{(stats.totalEscrow / 1000).toFixed(0)}k</p></div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
          <Target size={20} className="text-brand-500" />
          OKR
        </h2>
        {periods.length === 0 ? (
          <div className="bg-white rounded-2xl border p-8 text-center text-gray-500">Aucune période OKR. Ajoutez-en une dans la base.</div>
        ) : (
          <div className="space-y-6">
            {periods.map((period) => (
              <div key={period.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="font-bold text-gray-900">{period.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(period.starts_at).toLocaleDateString('fr-FR')} → {new Date(period.ends_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="p-4 space-y-4">
                  {period.objectives.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucun objectif.</p>
                  ) : (
                    period.objectives.map((obj) => (
                      <div key={obj.id} className="border border-gray-100 rounded-xl p-4">
                        <p className="font-bold text-gray-900 mb-1">{obj.title}</p>
                        {obj.description && <p className="text-sm text-gray-500 mb-3">{obj.description}</p>}
                        <ul className="space-y-2">
                          {obj.key_results.map((kr) => {
                            const pct = progressPct(kr.current_value, kr.target_value);
                            return (
                              <li key={kr.id} className="flex flex-col gap-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-700">{kr.title}</span>
                                  <span className="font-medium text-gray-900">
                                    {Number(kr.current_value).toLocaleString('fr-FR')} / {Number(kr.target_value).toLocaleString('fr-FR')}
                                    {kr.unit === 'percent' ? ' %' : kr.unit === 'currency' ? ' FCFA' : ''}
                                  </span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
