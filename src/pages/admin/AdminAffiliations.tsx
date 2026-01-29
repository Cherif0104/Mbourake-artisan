import { useState, useEffect } from 'react';
import { Check, X, Clock, Building2, FileText, Search, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToastContext } from '../../contexts/ToastContext';
import { LoadingOverlay } from '../../components/LoadingOverlay';

interface Affiliation {
  id: string;
  artisan_id: string;
  affiliation_type: 'chambre' | 'incubateur' | 'sae' | 'autre';
  affiliation_name: string | null;
  affiliation_number: string | null;
  certificate_url: string | null;
  status: 'pending' | 'verified' | 'rejected';
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  artisan?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function AdminAffiliations() {
  const { showSuccess, showError } = useToastContext();
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadAffiliations();
  }, [filter]);

  const loadAffiliations = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('artisan_affiliations')
        .select(`
          *,
          artisan:profiles!artisan_affiliations_artisan_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAffiliations(data || []);
    } catch (err: any) {
      console.error('Error loading affiliations:', err);
      showError('Erreur lors du chargement des affiliations');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string) => {
    try {
      setVerifyingId(id);
      const { error } = await supabase
        .from('artisan_affiliations')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: (await supabase.auth.getUser()).data.user?.id || null,
          rejection_reason: null,
        })
        .eq('id', id);

      if (error) throw error;
      showSuccess('Affiliation vérifiée avec succès');
      loadAffiliations();
    } catch (err: any) {
      console.error('Error verifying affiliation:', err);
      showError(err.message || 'Erreur lors de la vérification');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      showError('Veuillez indiquer la raison du rejet');
      return;
    }

    try {
      setRejectingId(id);
      const { error } = await supabase
        .from('artisan_affiliations')
        .update({
          status: 'rejected',
          verified_at: new Date().toISOString(),
          verified_by: (await supabase.auth.getUser()).data.user?.id || null,
          rejection_reason: rejectionReason,
        })
        .eq('id', id);

      if (error) throw error;
      showSuccess('Affiliation rejetée');
      setRejectionReason('');
      loadAffiliations();
    } catch (err: any) {
      console.error('Error rejecting affiliation:', err);
      showError(err.message || 'Erreur lors du rejet');
    } finally {
      setRejectingId(null);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'chambre':
        return 'Chambre de Métier';
      case 'incubateur':
        return 'Incubateur';
      case 'sae':
        return 'SAE';
      case 'autre':
        return 'Autre organisme';
      default:
        return type;
    }
  };

  const filteredAffiliations = affiliations.filter((aff) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      aff.artisan?.full_name?.toLowerCase().includes(search) ||
      aff.affiliation_name?.toLowerCase().includes(search) ||
      aff.affiliation_number?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Vérifications d'affiliations</h1>
          <p className="text-gray-600">
            Vérifiez et validez les affiliations des artisans (chambres de métier, incubateurs, SAE)
          </p>
        </div>

        {/* Filtres et recherche */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom d'artisan, organisme..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Filtres par statut */}
            <div className="flex gap-2 flex-wrap">
              {(['all', 'pending', 'verified', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-xl font-bold transition-colors ${
                    filter === status
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'Toutes' : status === 'pending' ? 'En attente' : status === 'verified' ? 'Vérifiées' : 'Rejetées'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Liste des affiliations */}
        <div className="space-y-4">
          {filteredAffiliations.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center">
              <Building2 size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Aucune affiliation trouvée</p>
            </div>
          ) : (
            filteredAffiliations.map((aff) => (
              <div
                key={aff.id}
                className="bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  {/* Info artisan */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {aff.artisan?.avatar_url ? (
                        <img src={aff.artisan.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={24} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-900 mb-1">
                        {aff.artisan?.full_name || 'Artisan'}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 size={16} className="text-brand-500" />
                        <span className="text-sm font-bold text-gray-700">
                          {getTypeLabel(aff.affiliation_type)}
                        </span>
                      </div>
                      {aff.affiliation_name && (
                        <p className="text-sm text-gray-600 mb-1">{aff.affiliation_name}</p>
                      )}
                      {aff.affiliation_number && (
                        <p className="text-xs text-gray-500">N° {aff.affiliation_number}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Soumis le {new Date(aff.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3 md:w-64">
                    {/* Certificat */}
                    {aff.certificate_url && (
                      <a
                        href={aff.certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                      >
                        <FileText size={18} />
                        Voir certificat
                      </a>
                    )}

                    {/* Statut */}
                    <div className="flex items-center justify-center">
                      {aff.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">
                          <Clock size={14} />
                          En attente
                        </span>
                      )}
                      {aff.status === 'verified' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                          <Check size={14} />
                          Vérifiée
                        </span>
                      )}
                      {aff.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                          <X size={14} />
                          Rejetée
                        </span>
                      )}
                    </div>

                    {/* Actions (si pending) */}
                    {aff.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerify(aff.id)}
                          disabled={verifyingId === aff.id}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          <Check size={18} />
                          Vérifier
                        </button>
                        <button
                          onClick={() => {
                            setRejectingId(aff.id);
                            setRejectionReason('');
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                        >
                          <X size={18} />
                          Rejeter
                        </button>
                      </div>
                    )}

                    {/* Raison du rejet */}
                    {aff.status === 'rejected' && aff.rejection_reason && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                        <p className="text-xs font-bold text-red-700 mb-1">Raison du rejet :</p>
                        <p className="text-xs text-red-600">{aff.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal de rejet */}
                {rejectingId === aff.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-gray-700">
                        Raison du rejet <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-red-500 focus:outline-none"
                        placeholder="Expliquez pourquoi cette affiliation est rejetée..."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setRejectingId(null);
                            setRejectionReason('');
                          }}
                          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={() => handleReject(aff.id)}
                          disabled={!rejectionReason.trim() || rejectingId === aff.id}
                          className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          Confirmer le rejet
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
