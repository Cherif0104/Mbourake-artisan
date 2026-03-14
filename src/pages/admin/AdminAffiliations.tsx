import { useState, useEffect } from 'react';
import { Check, X, Clock, Building2, FileText, Search, User, Plus, Trash2, ArrowRightLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToastContext } from '../../contexts/ToastContext';
import { LoadingOverlay } from '../../components/LoadingOverlay';

interface Affiliation {
  id: string;
  artisan_id: string;
  chambre_id: string | null;
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
  const { success: showSuccess, error: showError } = useToastContext();
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addChambreId, setAddChambreId] = useState('');
  const [addStatus, setAddStatus] = useState<'pending' | 'verified'>('verified');
  const [chambres, setChambres] = useState<{ id: string; name: string }[]>([]);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [changeRequests, setChangeRequests] = useState<{
    id: string;
    artisan_id: string;
    from_chambre_id: string | null;
    to_chambre_id: string;
    reason: string;
    status: string;
    created_at: string;
    artisan?: { full_name: string | null };
    from_chambre?: { name: string };
    to_chambre?: { name: string };
  }[]>([]);
  const [changeRequestsLoading, setChangeRequestsLoading] = useState(false);
  const [processingChangeId, setProcessingChangeId] = useState<string | null>(null);
  const [rejectChangeId, setRejectChangeId] = useState<string | null>(null);
  const [rejectChangeReason, setRejectChangeReason] = useState('');

  useEffect(() => {
    loadAffiliations();
  }, [filter]);

  useEffect(() => {
    setChangeRequestsLoading(true);
    supabase
      .from('affiliation_change_requests')
      .select('id, artisan_id, from_chambre_id, to_chambre_id, reason, status, created_at')
      .order('created_at', { ascending: false })
      .then(async ({ data: reqs, error }) => {
        if (error) {
          setChangeRequests([]);
          setChangeRequestsLoading(false);
          return;
        }
        const list = (reqs || []) as any[];
        const artisanIds = [...new Set(list.map((r) => r.artisan_id))];
        const chambreIds = [...new Set(list.flatMap((r) => [r.from_chambre_id, r.to_chambre_id]).filter(Boolean))];
        const [profRes, chambreRes] = await Promise.all([
          artisanIds.length ? supabase.from('profiles').select('id, full_name').in('id', artisanIds) : { data: [] },
          chambreIds.length ? supabase.from('chambres_metier').select('id, name').in('id', chambreIds) : { data: [] },
        ]);
        const profs = (profRes.data || []) as { id: string; full_name: string | null }[];
        const chambres = (chambreRes.data || []) as { id: string; name: string }[];
        const profMap = Object.fromEntries(profs.map((p) => [p.id, p]));
        const chambreMap = Object.fromEntries(chambres.map((c) => [c.id, c]));
        setChangeRequests(
          list.map((r) => ({
            ...r,
            artisan: profMap[r.artisan_id],
            from_chambre: r.from_chambre_id ? chambreMap[r.from_chambre_id] : null,
            to_chambre: r.to_chambre_id ? chambreMap[r.to_chambre_id] : null,
          }))
        );
        setChangeRequestsLoading(false);
      });
  }, []);

  useEffect(() => {
    supabase.from('chambres_metier').select('id, name').order('name').then(({ data, error }) => {
      if (error) {
        const msg = `${error.code || ''} ${error.message || ''}`.toLowerCase();
        if (msg.includes('pgrst205') || msg.includes('could not find the table') || msg.includes('404')) {
          setChambres([]);
          return;
        }
        showError(error.message);
        return;
      }
      setChambres((data as { id: string; name: string }[]) || []);
    });
  }, [showError]);

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

      if (error) {
        const msg = `${error.code || ''} ${error.message || ''}`.toLowerCase();
        if (msg.includes('pgrst205') || msg.includes('could not find the table') || msg.includes('404')) {
          setAffiliations([]);
          return;
        }
        throw error;
      }
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

  const handleAddAffiliation = async () => {
    const email = addEmail.trim().toLowerCase();
    if (!email || !addChambreId) {
      showError('Saisissez un email d\'artisan et sélectionnez une organisation.');
      return;
    }
    const { data: profile } = await supabase.from('profiles').select('id, role').eq('email', email).maybeSingle();
    if (!profile?.id) {
      showError('Aucun utilisateur trouvé avec cet email.');
      return;
    }
    if (profile.role !== 'artisan') {
      showError('Cet utilisateur n\'est pas un artisan.');
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from('artisan_affiliations').insert({
        artisan_id: profile.id,
        chambre_id: addChambreId,
        affiliation_type: 'chambre',
        status: addStatus,
        ...(addStatus === 'verified' ? { verified_at: new Date().toISOString() } : {}),
      });
      if (error) throw error;
      showSuccess('Affiliation créée.');
      setAddEmail('');
      setAddChambreId('');
      setShowAddForm(false);
      loadAffiliations();
    } catch (err: any) {
      showError(err.message || 'Erreur lors de la création');
    } finally {
      setAdding(false);
    }
  };

  const handleApproveChangeRequest = async (req: typeof changeRequests[0]) => {
    setProcessingChangeId(req.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const lockedUntil = new Date();
      lockedUntil.setMonth(lockedUntil.getMonth() + 6);

      const { data: oldAff } = await supabase
        .from('artisan_affiliations')
        .select('id')
        .eq('artisan_id', req.artisan_id)
        .eq('status', 'verified')
        .maybeSingle();

      if (oldAff?.id) {
        await supabase.from('artisan_affiliations').update({ status: 'rejected' }).eq('id', oldAff.id);
      }
      await supabase.from('artisan_affiliations').insert({
        artisan_id: req.artisan_id,
        chambre_id: req.to_chambre_id,
        affiliation_type: 'chambre',
        status: 'verified',
        verified_at: new Date().toISOString(),
        verified_by: user?.id ?? null,
        affiliation_locked_until: lockedUntil.toISOString(),
      });
      await supabase
        .from('affiliation_change_requests')
        .update({ status: 'approved', decided_by: user?.id ?? null, decided_at: new Date().toISOString() })
        .eq('id', req.id);
      showSuccess('Changement d\'affiliation approuvé.');
      setChangeRequests((prev) => prev.filter((r) => r.id !== req.id));
      loadAffiliations();
    } catch (err: any) {
      showError(err.message || 'Erreur');
    } finally {
      setProcessingChangeId(null);
    }
  };

  const handleRejectChangeRequest = async (req: (typeof changeRequests)[0], rejectionReason: string) => {
    setProcessingChangeId(req.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('affiliation_change_requests')
        .update({
          status: 'rejected',
          decided_by: user?.id ?? null,
          decided_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', req.id);
      showSuccess('Demande de changement rejetée.');
      setChangeRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (err: any) {
      showError(err.message || 'Erreur');
    } finally {
      setProcessingChangeId(null);
    }
  };

  const handleDeleteAffiliation = async (id: string) => {
    if (!window.confirm('Détacher cette affiliation ? L\'artisan ne sera plus rattaché à cette organisation.')) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('artisan_affiliations').delete().eq('id', id);
      if (error) throw error;
      showSuccess('Affiliation supprimée.');
      loadAffiliations();
    } catch (err: any) {
      showError(err.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
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

        {/* Demandes de changement d'affiliation */}
        {changeRequests.filter((r) => r.status === 'pending').length > 0 && (
          <div className="bg-amber-50 rounded-2xl p-6 mb-6 border border-amber-200">
            <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
              <ArrowRightLeft size={20} /> Demandes de changement ({changeRequests.filter((r) => r.status === 'pending').length})
            </h2>
            <div className="space-y-3">
              {changeRequests
                .filter((r) => r.status === 'pending')
                .map((req) => (
                  <div key={req.id} className="bg-white rounded-xl p-4 border border-amber-100">
                    <p className="font-bold text-gray-900">{req.artisan?.full_name || req.artisan_id}</p>
                    <p className="text-sm text-gray-600">
                      {(req.from_chambre as { name?: string })?.name || req.from_chambre_id || '—'} → {(req.to_chambre as { name?: string })?.name || req.to_chambre_id}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{req.reason}</p>
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => handleApproveChangeRequest(req)}
                        disabled={processingChangeId === req.id}
                        className="px-4 py-2 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 disabled:opacity-50"
                      >
                        Approuver
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectChangeId(req.id)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-xl font-bold text-sm hover:bg-red-200"
                      >
                        Rejeter
                      </button>
                    </div>
                    {rejectChangeId === req.id && (
                      <div className="mt-3 pt-3 border-t">
                        <input
                          type="text"
                          value={rejectChangeReason}
                          onChange={(e) => setRejectChangeReason(e.target.value)}
                          placeholder="Motif du rejet"
                          className="w-full px-3 py-2 rounded-lg border text-sm mb-2"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRejectChangeId(null);
                              setRejectChangeReason('');
                            }}
                            className="px-3 py-1.5 border rounded-lg text-sm"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleRejectChangeRequest(req, rejectChangeReason);
                              setRejectChangeId(null);
                              setRejectChangeReason('');
                            }}
                            disabled={!rejectChangeReason.trim()}
                            className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                          >
                            Confirmer rejet
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Créer une affiliation (rattachement manuel) */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-200">
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 text-brand-600 font-bold hover:text-brand-700"
          >
            <Plus size={20} />
            {showAddForm ? 'Masquer le formulaire' : 'Créer une affiliation (rattachement manuel)'}
          </button>
          {showAddForm && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email de l&apos;artisan</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="artisan@exemple.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Organisation (chambre)</label>
                <select
                  value={addChambreId}
                  onChange={(e) => setAddChambreId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Sélectionner…</option>
                  {chambres.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Statut</label>
                <select
                  value={addStatus}
                  onChange={(e) => setAddStatus(e.target.value as 'pending' | 'verified')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="verified">Vérifiée</option>
                  <option value="pending">En attente</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleAddAffiliation}
                disabled={adding || !addEmail.trim() || !addChambreId}
                className="px-4 py-2.5 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600 disabled:opacity-50"
              >
                {adding ? 'Création…' : 'Créer'}
              </button>
            </div>
          )}
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

                    {/* Détacher (supprimer l'affiliation) */}
                    <button
                      type="button"
                      onClick={() => handleDeleteAffiliation(aff.id)}
                      disabled={deletingId === aff.id}
                      className="flex items-center justify-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-xl font-bold text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Détacher cette affiliation"
                    >
                      <Trash2 size={16} />
                      Détacher
                    </button>
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
