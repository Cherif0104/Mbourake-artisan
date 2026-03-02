import React, { useEffect, useState } from 'react';
import { FileDown, Loader2, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToastContext } from '../../contexts/ToastContext';

export function AdminExports() {
  const { success: showSuccess, error: showError } = useToastContext();
  const [regions, setRegions] = useState<string[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [organisations, setOrganisations] = useState<{ id: string; name: string }[]>([]);
  const [filterRegion, setFilterRegion] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<number | ''>('');
  const [filterFpl, setFilterFpl] = useState<string>('');
  const [filterOrg, setFilterOrg] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadFilters = async () => {
      const [regRes, catRes, orgRes] = await Promise.all([
        supabase.from('profiles').select('region').eq('role', 'artisan').not('region', 'is', null),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('chambres_metier').select('id, name').order('name'),
      ]);
      const regionSet = new Set<string>();
      regRes.data?.forEach((r: { region: string | null }) => {
        if (r.region?.trim()) regionSet.add(r.region.trim());
      });
      setRegions(Array.from(regionSet).sort());
      setCategories((catRes.data as { id: number; name: string }[]) || []);
      setOrganisations((orgRes.data as { id: string; name: string }[]) || []);
      setLoading(false);
    };
    loadFilters();
  }, []);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, role, region, department, commune, formalisation_status, professionalisation_status, labellisation_status, created_at')
        .order('created_at', { ascending: false });

      if (filterRegion) query = query.eq('region', filterRegion);
      if (filterFpl) {
        if (filterFpl.startsWith('formalisation:')) {
          const v = filterFpl.replace('formalisation:', '');
          query = v === 'null' ? query.is('formalisation_status', null) : query.eq('formalisation_status', v);
        } else if (filterFpl.startsWith('professionalisation:')) {
          const v = filterFpl.replace('professionalisation:', '');
          query = v === 'null' ? query.is('professionalisation_status', null) : query.eq('professionalisation_status', v);
        } else if (filterFpl.startsWith('labellisation:')) {
          const v = filterFpl.replace('labellisation:', '');
          query = v === 'null' ? query.is('labellisation_status', null) : query.eq('labellisation_status', v);
        }
      }

      const { data: profiles, error } = await query;
      if (error) throw error;

      let list = (profiles || []) as Array<{
        id: string;
        full_name: string | null;
        email: string | null;
        role: string | null;
        region: string | null;
        department: string | null;
        commune: string | null;
        formalisation_status: string | null;
        professionalisation_status: string | null;
        labellisation_status: string | null;
        created_at: string | null;
      }>;

      if (filterCategory) {
        const { data: artisans } = await supabase.from('artisans').select('id, category_id').in('id', list.map((p) => p.id));
        const idsWithCat = new Set((artisans || []).filter((a: { category_id: number | null }) => a.category_id === filterCategory).map((a: { id: string }) => a.id));
        list = list.filter((p) => idsWithCat.has(p.id));
      }
      if (filterOrg) {
        const { data: affils } = await supabase
          .from('artisan_affiliations')
          .select('artisan_id')
          .eq('chambre_id', filterOrg);
        const artisanIds = new Set((affils || []).map((a: { artisan_id: string }) => a.artisan_id));
        list = list.filter((p) => artisanIds.has(p.id));
      }

      const { data: artisansData } = await supabase.from('artisans').select('id, category_id').in('id', list.map((p) => p.id));
      const categoryByProfile = new Map((artisansData || []).map((a: { id: string; category_id: number | null }) => [a.id, a.category_id]));
      const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
      const headers = [
        'id',
        'full_name',
        'email',
        'role',
        'region',
        'department',
        'commune',
        'category_name',
        'formalisation_status',
        'professionalisation_status',
        'labellisation_status',
        'created_at',
      ];
      const rows = list.map((p) => {
        const catId = categoryByProfile.get(p.id) ?? null;
        const categoryName = catId ? categoryNames.get(catId) || '' : '';
        return [
          p.id,
          p.full_name ?? '',
          p.email ?? '',
          p.role ?? '',
          p.region ?? '',
          p.department ?? '',
          p.commune ?? '',
          categoryName,
          p.formalisation_status ?? '',
          p.professionalisation_status ?? '',
          p.labellisation_status ?? '',
          p.created_at ?? '',
        ]
          .map((v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`)
          .join(';');
      });
      const csvContent = [headers.join(';'), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mbourake-export-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showSuccess(`Export de ${list.length} ligne(s) téléchargé.`);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center">
          <FileDown className="text-brand-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Exports / Cohortes</h1>
          <p className="text-sm text-gray-500">
            Exportez les utilisateurs (artisans) selon la région, catégorie, statut F-P-L ou organisation.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-2xl">
        <p className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Filter size={18} />
          Filtres (optionnels)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Région</label>
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">Toutes</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Catégorie</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">Toutes</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Statut F-P-L</label>
            <select
              value={filterFpl}
              onChange={(e) => setFilterFpl(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">Tous</option>
              <option value="formalisation:null">Formalisation non renseigné</option>
              <option value="formalisation:valide">Formalisation validé</option>
              <option value="professionalisation:null">Professionnalisation non renseigné</option>
              <option value="labellisation:null">Labellisation non renseigné</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Organisation</label>
            <select
              value={filterOrg}
              onChange={(e) => setFilterOrg(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">Toutes</option>
              {organisations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={exporting}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600 transition-colors disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown size={18} />}
          {exporting ? 'Export en cours…' : 'Exporter CSV'}
        </button>
      </div>
    </div>
  );
}
