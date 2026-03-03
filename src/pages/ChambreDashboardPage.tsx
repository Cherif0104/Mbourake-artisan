import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  MapPin,
  AlertTriangle,
  LayoutDashboard,
  Link2,
  FileText,
  User,
  Menu,
  X,
  Copy,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../hooks/useProfile';
import { useToastContext } from '../contexts/ToastContext';
import { LoadingOverlay } from '../components/LoadingOverlay';

type SectionId = 'overview' | 'affilies' | 'clients' | 'invites' | 'contrats' | 'organisation';

interface ChambreMetier {
  id: string;
  name: string;
  region: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

interface AffiliationWithArtisan {
  id: string;
  status: string;
  affiliation_type: string;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    region: string | null;
    department: string | null;
    commune: string | null;
    formalisation_status: string | null;
    professionalisation_status: string | null;
    labellisation_status: string | null;
  } | null;
}

const SECTION_LABELS: Record<SectionId, string> = {
  overview: "Vue d'ensemble",
  affilies: 'Artisans affiliés',
  clients: 'Clients attribués',
  invites: "Liens d'invitation",
  contrats: 'Contrats',
  organisation: 'Mon organisation',
};

export function ChambreDashboardPage() {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const { success: showSuccess, error: showError } = useToastContext();

  const [loading, setLoading] = useState(true);
  const [chambres, setChambres] = useState<ChambreMetier[]>([]);
  const [affiliations, setAffiliations] = useState<AffiliationWithArtisan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<SectionId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [attributions, setAttributions] = useState<{ id: string; client_id: string; profile?: { full_name: string | null; email: string | null } }[]>([]);
  const [attributionsLoading, setAttributionsLoading] = useState(false);
  const [invitationLinks, setInvitationLinks] = useState<{ id: string; token: string; invitation_type: string; expires_at: string | null; used_at: string | null; created_at: string }[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [contracts, setContracts] = useState<{ id: string; name: string; contract_type: string; status: string; starts_at: string | null; ends_at: string | null; document_url: string | null }[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);

  const [inviteType, setInviteType] = useState<'artisan' | 'client'>('artisan');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [orgForm, setOrgForm] = useState<{ name: string; region: string; address: string; phone: string; email: string }>({ name: '', region: '', address: '', phone: '', email: '' });
  const [orgSaving, setOrgSaving] = useState(false);
  const [editingChambreId, setEditingChambreId] = useState<string | null>(null);

  useEffect(() => {
    if (profileLoading) return;
    if (!profile || profile.role !== 'chambre_metier') {
      setLoading(false);
      return;
    }

    const fetchBase = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: chambresData, error: chambresError } = await supabase
          .from('chambres_metier' as any)
          .select('*')
          .eq('admin_id', profile.id);

        if (chambresError) throw chambresError;
        const chambresList = (chambresData as ChambreMetier[]) || [];
        setChambres(chambresList);

        if (chambresList.length === 0) {
          setAffiliations([]);
          setLoading(false);
          return;
        }

        const chambreIds = chambresList.map((c) => c.id);

        const { data: affiliationsData, error: affError } = await supabase
          .from('artisan_affiliations' as any)
          .select(
            `id, status, affiliation_type, artisan_id, profiles!artisan_affiliations_artisan_id_fkey (id, full_name, avatar_url, region, department, commune, formalisation_status, professionalisation_status, labellisation_status)`,
          )
          .in('chambre_id', chambreIds)
          .order('created_at', { ascending: false });

        if (affError) throw affError;
        setAffiliations((affiliationsData as AffiliationWithArtisan[]) || []);

        if (chambresList.length > 0) {
          setEditingChambreId((prev) => prev || chambresList[0].id);
          setOrgForm((prev) => (prev.name ? prev : {
            name: chambresList[0].name,
            region: chambresList[0].region,
            address: chambresList[0].address || '',
            phone: chambresList[0].phone || '',
            email: chambresList[0].email || '',
          }));
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erreur chargement');
      } finally {
        setLoading(false);
      }
    };

    fetchBase();
  }, [profile, profileLoading]);

  useEffect(() => {
    if (chambres.length === 0) return;
    const ids = chambres.map((c) => c.id);

    if (section === 'clients') {
      setAttributionsLoading(true);
      supabase
        .from('client_attributions')
        .select('id, client_id, profile:profiles!client_attributions_client_id_fkey(full_name, email)')
        .in('organisation_id', ids)
        .is('ended_at', null)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) showError(error.message);
          else setAttributions((data as any) || []);
          setAttributionsLoading(false);
        });
    }

    if (section === 'invites' || section === 'overview') {
      setLinksLoading(true);
      supabase
        .from('invitation_links')
        .select('id, token, invitation_type, expires_at, used_at, created_at')
        .in('organisation_id', ids)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) setInvitationLinks([]);
          else setInvitationLinks((data as any) || []);
          setLinksLoading(false);
        });
    }

    if (section === 'contrats') {
      setContractsLoading(true);
      supabase
        .from('organisation_contracts')
        .select('id, name, contract_type, status, starts_at, ends_at, document_url')
        .in('organisation_id', ids)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) showError(error.message);
          else setContracts((data as any) || []);
          setContractsLoading(false);
        });
    }
  }, [chambres, section, showError]);

  useEffect(() => {
    if (!editingChambreId || chambres.length === 0) return;
    const c = chambres.find((x) => x.id === editingChambreId);
    if (c) setOrgForm({ name: c.name, region: c.region, address: c.address || '', phone: c.phone || '', email: c.email || '' });
  }, [editingChambreId, chambres]);

  const copyToClipboard = (url: string) => {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      showSuccess('Lien copié.');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleGenerateInviteLink = async () => {
    if (chambres.length === 0) return;
    const orgId = chambres[0].id;
    setGeneratingLink(true);
    setGeneratedUrl(null);
    try {
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('invitation_links').insert({
        token,
        organisation_id: orgId,
        created_by: user?.id ?? null,
        invitation_type: inviteType,
        expires_at: expiresAt.toISOString(),
      });
      if (error) throw error;
      const url = `${window.location.origin}/invite/${token}`;
      setGeneratedUrl(url);
      setInvitationLinks((prev) => [{ id: '', token, invitation_type: inviteType, expires_at: expiresAt.toISOString(), used_at: null, created_at: new Date().toISOString() }, ...prev]);
      showSuccess('Lien généré. Copiez-le et partagez-le.');
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleSaveOrg = async () => {
    if (!editingChambreId) return;
    setOrgSaving(true);
    const { error } = await supabase
      .from('chambres_metier')
      .update({
        name: orgForm.name.trim(),
        region: orgForm.region.trim(),
        address: orgForm.address.trim() || null,
        phone: orgForm.phone.trim() || null,
        email: orgForm.email.trim() || null,
      })
      .eq('id', editingChambreId);
    if (error) {
      showError(error.message);
      setOrgSaving(false);
      return;
    }
    showSuccess('Informations enregistrées.');
    setChambres((prev) => prev.map((c) => (c.id === editingChambreId ? { ...c, ...orgForm, address: orgForm.address || null, phone: orgForm.phone || null, email: orgForm.email || null } : c)));
    setOrgSaving(false);
  };

  if (profileLoading || loading) return <LoadingOverlay />;

  if (!profile || profile.role !== 'chambre_metier') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertTriangle size={40} className="text-amber-500 mx-auto mb-4" />
          <h1 className="text-lg font-black text-gray-900 mb-2">Accès réservé</h1>
          <p className="text-sm text-gray-600 mb-4">Ce tableau de bord est réservé aux comptes organisation partenaire.</p>
          <button type="button" onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold">
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  const totalAffiliations = affiliations.length;
  const verifiedCount = affiliations.filter((a) => a.status === 'verified').length;
  const pendingCount = affiliations.filter((a) => a.status === 'pending').length;
  const navSections: SectionId[] = ['overview', 'affilies', 'clients', 'invites', 'contrats', 'organisation'];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {sidebarOpen && (
        <button type="button" onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden" aria-label="Fermer le menu" />
      )}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col shrink-0 transition-transform duration-200 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black tracking-tight">Mboura<span className="text-brand-500">ké</span></h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-0.5">Espace partenaire</p>
          </div>
          <button type="button" onClick={() => setSidebarOpen(false)} className="md:hidden p-2 -m-2 text-gray-400 hover:text-white rounded-lg" aria-label="Fermer"><X size={18} /></button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navSections.map((sid) => (
            <button
              key={sid}
              type="button"
              onClick={() => { setSection(sid); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${section === sid ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              {sid === 'overview' && <LayoutDashboard size={18} />}
              {sid === 'affilies' && <Users size={18} />}
              {sid === 'clients' && <User size={18} />}
              {sid === 'invites' && <Link2 size={18} />}
              {sid === 'contrats' && <FileText size={18} />}
              {sid === 'organisation' && <Building2 size={18} />}
              {SECTION_LABELS[sid]}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button type="button" onClick={() => navigate('/dashboard')} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 text-sm font-bold">
            <ArrowLeft size={16} /> Retour
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-0 min-w-0">
        <header className="sticky top-0 z-10 bg-white border-b px-4 md:px-6 py-3 flex items-center gap-3">
          <button type="button" onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -m-2 text-gray-500 hover:bg-gray-100 rounded-lg" aria-label="Menu"><Menu size={22} /></button>
          <h2 className="text-lg font-black text-gray-900 truncate">{SECTION_LABELS[section]}</h2>
        </header>

        <div className="flex-1 p-4 md:p-6 overflow-auto">
          {section === 'overview' && (
            <div className="max-w-4xl space-y-6">
              {chambres.length > 0 && (
                <section className="grid gap-4 md:grid-cols-2">
                  {chambres.map((chambre) => (
                    <div key={chambre.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3 shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0"><Building2 size={20} className="text-brand-600" /></div>
                      <div className="min-w-0">
                        <h2 className="font-bold text-gray-900 text-sm mb-1">{chambre.name}</h2>
                        <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={12} />{chambre.region}</p>
                        {chambre.phone && <p className="text-xs text-gray-500 mt-1">{chambre.phone}</p>}
                        {chambre.email && <p className="text-xs text-gray-500">{chambre.email}</p>}
                      </div>
                    </div>
                  ))}
                </section>
              )}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Users size={20} className="text-blue-600" /></div>
                  <div><p className="text-xs text-gray-500 font-medium">Artisans affiliés</p><p className="text-xl font-black text-gray-900">{totalAffiliations}</p></div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><Users size={20} className="text-green-600" /></div>
                  <div><p className="text-xs text-gray-500 font-medium">Vérifiés</p><p className="text-xl font-black text-gray-900">{verifiedCount}</p></div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><AlertTriangle size={20} className="text-amber-600" /></div>
                  <div><p className="text-xs text-gray-500 font-medium">En attente</p><p className="text-xl font-black text-gray-900">{pendingCount}</p></div>
                </div>
              </section>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {linksLoading ? <p className="text-sm text-gray-500">Chargement des liens…</p> : invitationLinks.length > 0 && (
                <div className="bg-white rounded-2xl border p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Derniers liens d&apos;invitation</p>
                  <ul className="space-y-1.5 max-h-24 overflow-y-auto">
                    {invitationLinks.slice(0, 5).map((link) => (
                      <li key={link.id || link.token} className="text-xs py-1.5 px-2 rounded-lg bg-gray-50 flex items-center justify-between gap-2">
                        <span className="truncate">{link.token.slice(0, 8)}… · {link.invitation_type}{link.used_at ? ' · Utilisé' : ''}</span>
                        <span className="text-gray-400 shrink-0">{link.created_at ? new Date(link.created_at).toLocaleDateString('fr-FR') : ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {section === 'affilies' && (
            <div className="max-w-4xl">
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <h2 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2"><Users size={18} /> Artisans affiliés</h2>
                {affiliations.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucun artisan affilié pour le moment.</p>
                ) : (
                  <div className="space-y-3">
                    {affiliations.map((aff) => {
                      const artisan = aff.profiles;
                      if (!artisan) return null;
                      const location = artisan.commune || artisan.department || artisan.region || 'Sénégal';
                      return (
                        <div key={aff.id} className="flex items-start gap-3 border border-gray-100 rounded-xl px-3 py-2.5">
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {artisan.avatar_url ? <img src={artisan.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-gray-500">{artisan.full_name?.charAt(0) ?? 'A'}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-gray-900 truncate">{artisan.full_name ?? 'Artisan'}</p>
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${aff.status === 'verified' ? 'bg-green-50 text-green-700 border border-green-100' : aff.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                {aff.status === 'verified' ? 'Vérifié' : aff.status === 'pending' ? 'En attente' : 'Rejeté'}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={10} />{location}</p>
                            <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                              <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-100">F: {artisan.formalisation_status || 'à démarrer'}</span>
                              <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-100">P: {artisan.professionalisation_status || 'à démarrer'}</span>
                              <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-100">L: {artisan.labellisation_status || 'à démarrer'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {section === 'clients' && (
            <div className="max-w-4xl">
              <div className="bg-white rounded-2xl border p-4">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Clients attribués à votre organisation</p>
                {attributionsLoading ? <p className="text-sm text-gray-500">Chargement…</p> : (
                  <ul className="space-y-2">
                    {attributions.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0"><User size={14} className="text-brand-600" /></div>
                        <div className="min-w-0"><p className="font-bold text-gray-900 truncate">{a.profile?.full_name || a.client_id}</p><p className="text-xs text-gray-500 truncate">{a.profile?.email || ''}</p></div>
                      </li>
                    ))}
                    {attributions.length === 0 && !attributionsLoading && <li className="text-sm text-gray-500 py-4">Aucun client attribué.</li>}
                  </ul>
                )}
              </div>
            </div>
          )}

          {section === 'invites' && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-white rounded-2xl border p-4">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Générer un lien d&apos;invitation</p>
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <select value={inviteType} onChange={(e) => setInviteType(e.target.value as 'artisan' | 'client')} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none">
                    <option value="artisan">Artisan</option>
                    <option value="client">Client</option>
                  </select>
                  <button type="button" onClick={handleGenerateInviteLink} disabled={generatingLink} className="px-4 py-2.5 bg-gray-800 text-white rounded-xl font-bold text-sm hover:bg-gray-900 flex items-center justify-center gap-2 disabled:opacity-50">
                    <Link2 size={16} /> {generatingLink ? 'Génération…' : 'Générer un lien'}
                  </button>
                </div>
                {generatedUrl && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-brand-50 border border-brand-100">
                    <input type="text" readOnly value={generatedUrl} className="flex-1 min-w-0 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2" />
                    <button type="button" onClick={() => copyToClipboard(generatedUrl)} className="p-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600" title="Copier">{copied ? <Check size={16} /> : <Copy size={16} />}</button>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-2xl border p-4">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Liens récents</p>
                {linksLoading ? <p className="text-sm text-gray-500">Chargement…</p> : (
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                    {invitationLinks.map((link) => (
                      <li key={link.id || link.token} className="flex items-center justify-between gap-2 text-xs py-1.5 px-2 rounded-lg bg-gray-50">
                        <span className="truncate">{link.token.slice(0, 8)}… · {link.invitation_type}{link.used_at ? ' · Utilisé' : link.expires_at && new Date(link.expires_at) < new Date() ? ' · Expiré' : ''}</span>
                        <span className="text-gray-400 shrink-0">{link.created_at ? new Date(link.created_at).toLocaleDateString('fr-FR') : ''}</span>
                      </li>
                    ))}
                    {invitationLinks.length === 0 && !linksLoading && <li className="text-sm text-gray-500 py-2">Aucun lien.</li>}
                  </ul>
                )}
              </div>
            </div>
          )}

          {section === 'contrats' && (
            <div className="max-w-4xl">
              <div className="bg-white rounded-2xl border p-4">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Contrats (lecture seule)</p>
                {contractsLoading ? <p className="text-sm text-gray-500">Chargement…</p> : (
                  <ul className="space-y-2">
                    {contracts.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl bg-gray-50 border border-gray-100">
                        <div><p className="font-bold text-gray-900">{c.name}</p><p className="text-xs text-gray-500">{c.contract_type} · {c.status}{c.starts_at && ` · Du ${new Date(c.starts_at).toLocaleDateString('fr-FR')}`}</p></div>
                        {c.document_url && <a href={c.document_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-600 hover:underline">Document</a>}
                      </li>
                    ))}
                    {contracts.length === 0 && !contractsLoading && <li className="text-sm text-gray-500 py-4">Aucun contrat.</li>}
                  </ul>
                )}
              </div>
            </div>
          )}

          {section === 'organisation' && chambres.length > 0 && (
            <div className="max-w-2xl space-y-4">
              {chambres.length > 1 && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Organisation à modifier</label>
                  <select value={editingChambreId || ''} onChange={(e) => setEditingChambreId(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none">
                    {chambres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="bg-white rounded-2xl border p-4 space-y-4">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Informations (formulaire extensible)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Nom</label><input type="text" value={orgForm.name} onChange={(e) => setOrgForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Région</label><input type="text" value={orgForm.region} onChange={(e) => setOrgForm((f) => ({ ...f, region: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none" /></div>
                  <div className="sm:col-span-2"><label className="block text-xs text-gray-500 mb-1">Adresse</label><input type="text" value={orgForm.address} onChange={(e) => setOrgForm((f) => ({ ...f, address: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none" placeholder="Optionnel" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Téléphone</label><input type="text" value={orgForm.phone} onChange={(e) => setOrgForm((f) => ({ ...f, phone: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none" placeholder="Optionnel" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Email</label><input type="email" value={orgForm.email} onChange={(e) => setOrgForm((f) => ({ ...f, email: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none" placeholder="Optionnel" /></div>
                </div>
                <button type="button" onClick={handleSaveOrg} disabled={orgSaving} className="px-4 py-2.5 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600 disabled:opacity-50">{orgSaving ? 'Enregistrement…' : 'Enregistrer'}</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
