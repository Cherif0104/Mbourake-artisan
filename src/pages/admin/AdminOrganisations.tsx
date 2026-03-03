import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToastContext } from '../../contexts/ToastContext';
import { LoadingOverlay } from '../../components/LoadingOverlay';

type OrgType = 'chambre' | 'incubateur' | 'sae' | 'centre_formation' | 'autre';
const ORG_TYPE_LABELS: Record<OrgType, string> = {
  chambre: 'Chambre',
  incubateur: 'Incubateur',
  sae: 'SAE',
  centre_formation: 'Centre de formation',
  autre: 'Autre',
};

interface ChambreMetier {
  id: string;
  name: string;
  region: string;
  organisation_type?: OrgType | null;
  is_active: boolean | null;
  admin_id: string | null;
  created_at?: string;
}

export function AdminOrganisations() {
  const { error: showError } = useToastContext();
  const [organisations, setOrganisations] = useState<ChambreMetier[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadOrganisations = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data: orgs, error: orgError } = await supabase
        .from('chambres_metier')
        .select('id, name, region, organisation_type, is_active, admin_id, created_at')
        .order('name');
      if (orgError) {
        const msg = orgError.message || 'Impossible de charger les organisations';
        setLoadError(msg);
        showError?.(msg);
        setOrganisations([]);
        setMemberCounts({});
        return;
      }
      const list = (orgs || []) as ChambreMetier[];
      setOrganisations(list);

      const ids = list.map((o) => o.id);
      if (ids.length > 0) {
        try {
          const { data: mems } = await supabase
            .from('organisation_members')
            .select('organisation_id')
            .in('organisation_id', ids);
          const count: Record<string, number> = {};
          ids.forEach((id) => (count[id] = 0));
          (mems || []).forEach((m: { organisation_id: string }) => {
            count[m.organisation_id] = (count[m.organisation_id] || 0) + 1;
          });
          setMemberCounts(count);
        } catch {
          setMemberCounts({});
        }
      } else {
        setMemberCounts({});
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur chargement organisations';
      setLoadError(msg);
      showError?.(msg);
      setOrganisations([]);
      setMemberCounts({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganisations();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-brand-100 flex items-center justify-center">
          <Building2 className="text-brand-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Organisations</h1>
          <p className="text-sm text-gray-500">
            Chambres, incubateurs, SAE — gestion des structures et de leurs membres.
          </p>
        </div>
      </div>

      <LoadingOverlay visible={loading} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="font-bold text-gray-900">Liste des organisations</h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
            {loadError ? (
              <div className="px-6 py-12 text-center">
                <p className="text-red-600 text-sm font-medium mb-3">{loadError}</p>
                <button type="button" onClick={() => loadOrganisations()} className="px-4 py-2 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600">
                  Réessayer
                </button>
              </div>
            ) : organisations.length === 0 && !loading ? (
              <div className="px-6 py-12 text-center text-gray-500">Aucune organisation.</div>
            ) : (
              organisations.map((org) => (
                <Link
                  key={org.id}
                  to={`/admin/organisations/${org.id}`}
                  className="block w-full text-left px-6 py-4 flex items-center justify-between gap-4 transition-colors hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{org.name}</p>
                    <p className="text-sm text-gray-500">
                      {org.region}
                      {org.organisation_type ? ` · ${ORG_TYPE_LABELS[org.organisation_type as OrgType] ?? org.organisation_type}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Users size={14} />
                      {memberCounts[org.id] ?? 0}
                    </span>
                    {org.is_active === false && (
                      <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-600 text-[10px] font-bold">
                        Inactif
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden flex items-center justify-center min-h-[200px]">
          <p className="text-gray-500 text-center px-6">
            Cliquez sur une organisation pour ouvrir sa fiche détail (Infos, Membres, Affiliés, Contrats, KPI).
          </p>
        </div>
      </div>
    </div>
  );
}
