import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Building2, Users, Plus, Trash2, Search, User, Link2, Copy, Check, FileText, ArrowRightLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAudit } from '../../lib/adminAudit';
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

const ORG_MEMBER_ROLES = ['admin_org', 'manager', 'formateur', 'facilitateur', 'conseil_client', 'gestionnaire_dossiers'] as const;
type OrgMemberRole = (typeof ORG_MEMBER_ROLES)[number];
const ROLE_LABELS: Record<OrgMemberRole, string> = {
  admin_org: 'Admin org',
  manager: 'Manager',
  formateur: 'Formateur',
  facilitateur: 'Facilitateur',
  conseil_client: 'Conseil client',
  gestionnaire_dossiers: 'Gestionnaire dossiers',
};

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  partenariat: 'Partenariat',
  convention: 'Convention',
  accord_cadre: 'Accord-cadre',
  autre: 'Autre',
};
const CONTRACT_STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  actif: 'Actif',
  expire: 'Expiré',
  resilie: 'Résilié',
};

interface OrganisationContract {
  id: string;
  organisation_id: string;
  name: string;
  contract_type: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  signed_at: string | null;
  document_url: string | null;
  created_at: string;
}

interface ChambreMetier {
  id: string;
  name: string;
  region: string;
  organisation_type: OrgType | null;
  is_active: boolean | null;
  admin_id: string | null;
  created_at?: string;
}

interface OrganisationMember {
  id: string;
  user_id: string;
  organisation_id: string;
  role: OrgMemberRole;
  created_at: string;
  profile?: { full_name: string | null; email: string | null };
}

type TabId = 'infos' | 'membres' | 'affilies' | 'attribues' | 'contrats' | 'kpi';

export function AdminOrganisationDetail() {
  const { id } = useParams<{ id: string }>();
  const { success: showSuccess, error: showError } = useToastContext();
  const [org, setOrg] = useState<ChambreMetier | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('infos');
  const [members, setMembers] = useState<OrganisationMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [affiliates, setAffiliates] = useState<{ id: string; artisan_id: string; profile?: { full_name: string | null; email: string | null } }[]>([]);
  const [affiliatesLoading, setAffiliatesLoading] = useState(false);
  const [adminName, setAdminName] = useState<string>('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<OrgMemberRole>('manager');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [inviteType, setInviteType] = useState<'artisan' | 'client'>('artisan');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [invitationLinks, setInvitationLinks] = useState<{ id: string; token: string; invitation_type: string; expires_at: string | null; used_at: string | null; created_at: string }[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [contracts, setContracts] = useState<OrganisationContract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractForm, setContractForm] = useState<{ name: string; contract_type: string; status: string; starts_at: string; ends_at: string; document_url: string }>({ name: '', contract_type: 'partenariat', status: 'brouillon', starts_at: '', ends_at: '', document_url: '' });
  const [contractSaving, setContractSaving] = useState(false);
  const [attributions, setAttributions] = useState<{ id: string; client_id: string; profile?: { full_name: string | null; email: string | null } }[]>([]);
  const [attributionsLoading, setAttributionsLoading] = useState(false);
  const [allOrgs, setAllOrgs] = useState<{ id: string; name: string }[]>([]);
  const [reassignModal, setReassignModal] = useState<{ attributionId: string; clientId: string; clientName: string } | null>(null);
  const [reassignToOrgId, setReassignToOrgId] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from('chambres_metier')
        .select('id, name, region, organisation_type, is_active, admin_id, created_at')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        showError(error.message);
        setLoading(false);
        return;
      }
      setOrg(data as ChambreMetier | null);
      if (data?.admin_id) {
        const { data: p } = await supabase.from('profiles').select('full_name').eq('id', data.admin_id).maybeSingle();
        setAdminName((p as { full_name?: string })?.full_name || data.admin_id);
      }
      setLoading(false);
    })();
  }, [id, showError]);

  useEffect(() => {
    if (!id || !org) return;
    if (tab === 'membres') {
      setMembersLoading(true);
      supabase
        .from('organisation_members')
        .select('id, user_id, organisation_id, role, created_at, profile:profiles!organisation_members_user_id_fkey(full_name, email)')
        .eq('organisation_id', id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) showError(error.message);
          else setMembers((data as OrganisationMember[]) || []);
          setMembersLoading(false);
        });
    }
    if (tab === 'affilies') {
      setAffiliatesLoading(true);
      supabase
        .from('artisan_affiliations')
        .select('id, artisan_id, profile:profiles!artisan_affiliations_artisan_id_fkey(full_name, email)')
        .eq('chambre_id', id)
        .then(({ data, error }) => {
          if (error) showError(error.message);
          else setAffiliates((data as any) || []);
          setAffiliatesLoading(false);
        });
    }
    if (tab === 'membres' || tab === 'infos') {
      setLinksLoading(true);
      supabase
        .from('invitation_links')
        .select('id, token, invitation_type, expires_at, used_at, created_at')
        .eq('organisation_id', id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) setInvitationLinks([]);
          else setInvitationLinks((data as any) || []);
          setLinksLoading(false);
        });
    }
    if (tab === 'contrats') {
      setContractsLoading(true);
      supabase
        .from('organisation_contracts')
        .select('id, organisation_id, name, contract_type, status, starts_at, ends_at, signed_at, document_url, created_at')
        .eq('organisation_id', id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) showError(error.message);
          else setContracts((data as OrganisationContract[]) || []);
          setContractsLoading(false);
        });
    }
    if (tab === 'attribues') {
      setAttributionsLoading(true);
      supabase
        .from('client_attributions')
        .select('id, client_id, profile:profiles!client_attributions_client_id_fkey(full_name, email)')
        .eq('organisation_id', id)
        .is('ended_at', null)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) showError(error.message);
          else setAttributions((data as any) || []);
          setAttributionsLoading(false);
        });
      if (allOrgs.length === 0) {
        supabase.from('chambres_metier').select('id, name').eq('is_active', true).order('name').then(({ data }) => setAllOrgs((data as { id: string; name: string }[]) || []));
      }
    }
  }, [id, org, tab, showError, allOrgs.length]);

  const handleAddMember = async () => {
    if (!org || !addEmail.trim()) {
      showError('Saisissez un email.');
      return;
    }
    const email = addEmail.trim().toLowerCase();
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).limit(1).maybeSingle();
    if (!(profile as any)?.id) {
      showError('Aucun utilisateur trouvé avec cet email.');
      return;
    }
    setAdding(true);
    const { error } = await supabase.from('organisation_members').insert({
      user_id: (profile as any).id,
      organisation_id: org.id,
      role: addRole,
    });
    if (error) {
      showError(error.message);
      setAdding(false);
      return;
    }
    showSuccess('Membre ajouté.');
    setAddEmail('');
    setAddRole('manager');
    const { data } = await supabase
      .from('organisation_members')
      .select('id, user_id, organisation_id, role, created_at, profile:profiles!organisation_members_user_id_fkey(full_name, email)')
      .eq('organisation_id', org.id)
      .order('created_at', { ascending: false });
    setMembers((data as OrganisationMember[]) || []);
    setAdding(false);
  };

  const handleGenerateInviteLink = async () => {
    if (!org) return;
    setGeneratingLink(true);
    setGeneratedUrl(null);
    try {
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('invitation_links').insert({
        token,
        organisation_id: org.id,
        created_by: user?.id ?? null,
        invitation_type: inviteType,
        expires_at: expiresAt.toISOString(),
      });
      if (error) throw error;
      const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${token}`;
      setGeneratedUrl(url);
      setInvitationLinks((prev) => [{ id: '', token, invitation_type: inviteType, expires_at: expiresAt.toISOString(), used_at: null, created_at: new Date().toISOString() }, ...prev]);
      showSuccess('Lien généré. Copiez-le et partagez-le.');
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Erreur lors de la génération');
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleAddContract = async () => {
    if (!org || !contractForm.name.trim()) {
      showError('Saisissez au moins un nom de contrat.');
      return;
    }
    setContractSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('organisation_contracts').insert({
      organisation_id: org.id,
      name: contractForm.name.trim(),
      contract_type: contractForm.contract_type,
      status: contractForm.status,
      starts_at: contractForm.starts_at || null,
      ends_at: contractForm.ends_at || null,
      document_url: contractForm.document_url.trim() || null,
      created_by: user?.id ?? null,
    });
    if (error) {
      showError(error.message);
      setContractSaving(false);
      return;
    }
    showSuccess('Contrat ajouté.');
    setContractForm({ name: '', contract_type: 'partenariat', status: 'brouillon', starts_at: '', ends_at: '', document_url: '' });
    const { data } = await supabase.from('organisation_contracts').select('id, organisation_id, name, contract_type, status, starts_at, ends_at, signed_at, document_url, created_at').eq('organisation_id', org.id).order('created_at', { ascending: false });
    setContracts((data as OrganisationContract[]) || []);
    setContractSaving(false);
  };

  const handleReassignClient = async () => {
    if (!org || !reassignModal || !reassignToOrgId || reassignToOrgId === org.id) {
      showError('Choisissez une organisation de destination différente.');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError('Session expirée. Reconnectez-vous.');
      return;
    }
    setReassigning(true);
    try {
      const fromOrgId = org.id;
      const toOrgId = reassignToOrgId;
      const clientId = reassignModal.clientId;

      const { error: updateErr } = await supabase
        .from('client_attributions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', reassignModal.attributionId);
      if (updateErr) throw updateErr;

      const { error: insertErr } = await supabase.from('client_attributions').insert({
        client_id: clientId,
        organisation_id: toOrgId,
        source: 'reassignment',
        invited_by_user_id: user?.id ?? null,
      });
      if (insertErr) throw insertErr;

      const { error: transferErr } = await supabase.from('client_attribution_transfers').insert({
        client_id: clientId,
        from_organisation_id: fromOrgId,
        to_organisation_id: toOrgId,
        transferred_by: user.id,
        reason: reassignReason.trim() || null,
      });
      if (transferErr) throw transferErr;

      await logAdminAudit({
        action: 'client_attribution.reassign',
        entity_type: 'client_attribution',
        entity_id: reassignModal.attributionId,
        new_data: { from_organisation_id: fromOrgId, to_organisation_id: toOrgId, reason: reassignReason.trim() || null },
        reason: reassignReason.trim() || undefined,
      });

      showSuccess('Client réaffecté. L’historique est tracé.');
      setReassignModal(null);
      setReassignToOrgId('');
      setReassignReason('');
      const { data } = await supabase
        .from('client_attributions')
        .select('id, client_id, profile:profiles!client_attributions_client_id_fkey(full_name, email)')
        .eq('organisation_id', org.id)
        .is('ended_at', null)
        .order('created_at', { ascending: false });
      setAttributions((data as any) || []);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Erreur lors de la réaffectation');
    } finally {
      setReassigning(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Retirer ce membre de l\'organisation ?')) return;
    setRemovingId(memberId);
    const { error } = await supabase.from('organisation_members').delete().eq('id', memberId);
    if (error) {
      showError(error.message);
      setRemovingId(null);
      return;
    }
    showSuccess('Membre retiré.');
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setRemovingId(null);
  };

  if (loading) return <LoadingOverlay />;
  if (!org) {
    return (
      <div className="space-y-4">
        <Link to="/admin/organisations" className="inline-flex items-center gap-2 text-brand-600 font-bold hover:underline">
          ← Retour aux organisations
        </Link>
        <p className="text-gray-500">Organisation introuvable.</p>
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'infos', label: 'Infos' },
    { id: 'membres', label: 'Membres' },
    { id: 'affilies', label: 'Affiliés' },
    { id: 'attribues', label: 'Clients attribués' },
    { id: 'contrats', label: 'Contrats' },
    { id: 'kpi', label: 'KPI' },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <Link to="/admin/organisations" className="inline-flex items-center gap-2 text-brand-600 font-bold hover:underline">
        ← Retour aux organisations
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center shrink-0">
          <Building2 className="text-brand-600" size={28} />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-gray-900 truncate">{org.name}</h1>
          <p className="text-sm text-gray-500">
            {org.region}
            {org.organisation_type ? ` · ${ORG_TYPE_LABELS[org.organisation_type] || org.organisation_type}` : ''}
            {org.admin_id ? ` · Admin : ${adminName}` : ''}
          </p>
        </div>
      </div>

      {/* Mobile : onglets horizontaux — Desktop : sidebar verticale */}
      <div className="border-b border-gray-200 lg:border-0 lg:hidden">
        <nav className="flex gap-4 overflow-x-auto pb-px">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`pb-3 px-1 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-8">
        <nav className="hidden lg:block shrink-0">
          <div className="sticky top-24 space-y-1 rounded-xl border border-gray-200 bg-white p-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-colors ${
                  tab === t.id ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0">
      {tab === 'infos' && (
        <div className="bg-white rounded-2xl border p-6 space-y-4">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-500">Nom</span>
            <span className="font-bold text-gray-900">{org.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-500">Région</span>
            <span className="font-bold text-gray-900">{org.region}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-500">Type</span>
            <span className="font-bold text-gray-900">{org.organisation_type ? ORG_TYPE_LABELS[org.organisation_type] : '—'}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-500">Statut</span>
            <span className="font-bold text-gray-900">{org.is_active === false ? 'Inactif' : 'Actif'}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-500">Admin</span>
            <span className="font-bold text-gray-900">{adminName || '—'}</span>
          </div>
          <div className="pt-4 border-t">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Liens d&apos;invitation</p>
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
              <div className="flex items-center gap-2 p-3 rounded-xl bg-brand-50 border border-brand-100 mb-3">
                <input type="text" readOnly value={generatedUrl} className="flex-1 min-w-0 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2" />
                <button type="button" onClick={() => copyToClipboard(generatedUrl)} className="p-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600" title="Copier">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            )}
            {linksLoading ? <p className="text-sm text-gray-500">Chargement…</p> : invitationLinks.length > 0 && (
              <ul className="space-y-1.5 max-h-32 overflow-y-auto">
                {invitationLinks.map((link) => (
                  <li key={link.id || link.token} className="flex items-center justify-between gap-2 text-xs py-1.5 px-2 rounded-lg bg-gray-50">
                    <span className="truncate">{link.token.slice(0, 8)}… · {link.invitation_type}{link.used_at ? ' · Utilisé' : link.expires_at && new Date(link.expires_at) < new Date() ? ' · Expiré' : ''}</span>
                    <span className="text-gray-400 shrink-0">{link.created_at ? new Date(link.created_at).toLocaleDateString('fr-FR') : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'membres' && (
        <div className="bg-white rounded-2xl border p-6 space-y-6">
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Membres</p>
            {membersLoading ? <p className="text-sm text-gray-500">Chargement…</p> : (
              <ul className="space-y-2">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-4 py-2 px-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                        <User size={14} className="text-brand-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{m.profile?.full_name || m.user_id}</p>
                        <p className="text-xs text-gray-500 truncate">{m.profile?.email || ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-1 rounded-lg bg-gray-200 text-gray-700 text-xs font-bold">{ROLE_LABELS[m.role as OrgMemberRole] || m.role}</span>
                      <button type="button" onClick={() => handleRemoveMember(m.id)} disabled={removingId === m.id} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Retirer le membre">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
                {members.length === 0 && !membersLoading && <li className="text-sm text-gray-500 py-4">Aucun membre.</li>}
              </ul>
            )}
          </div>
          <div className="pt-4 border-t">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Ajouter un membre</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="Email de l'utilisateur" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none" />
              </div>
              <select value={addRole} onChange={(e) => setAddRole(e.target.value as OrgMemberRole)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none">
                {ORG_MEMBER_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <button type="button" onClick={handleAddMember} disabled={adding || !addEmail.trim()} className="px-4 py-2.5 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600 flex items-center justify-center gap-2 disabled:opacity-50">
                {adding ? '…' : <Plus size={16} />} Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'affilies' && (
        <div className="bg-white rounded-2xl border p-6">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Artisans affiliés</p>
          {affiliatesLoading ? <p className="text-sm text-gray-500">Chargement…</p> : (
            <ul className="space-y-2">
              {affiliates.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0"><User size={14} className="text-brand-600" /></div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{a.profile?.full_name || a.artisan_id}</p>
                    <p className="text-xs text-gray-500 truncate">{a.profile?.email || ''}</p>
                  </div>
                </li>
              ))}
              {affiliates.length === 0 && !affiliatesLoading && <li className="text-sm text-gray-500 py-4">Aucun affilié.</li>}
            </ul>
          )}
        </div>
      )}

      {tab === 'attribues' && (
        <div className="bg-white rounded-2xl border p-6">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Clients attribués à cette organisation</p>
          <p className="text-sm text-gray-500 mb-3">Réaffectation tracée dans le journal d&apos;audit et dans l&apos;historique des transferts.</p>
          {attributionsLoading ? <p className="text-sm text-gray-500">Chargement…</p> : (
            <ul className="space-y-2">
              {attributions.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 py-2 px-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0"><User size={14} className="text-brand-600" /></div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{a.profile?.full_name || a.client_id}</p>
                      <p className="text-xs text-gray-500 truncate">{a.profile?.email || ''}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReassignModal({ attributionId: a.id, clientId: a.client_id, clientName: a.profile?.full_name || a.client_id })}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                  >
                    <ArrowRightLeft size={14} /> Réaffecter
                  </button>
                </li>
              ))}
              {attributions.length === 0 && !attributionsLoading && <li className="text-sm text-gray-500 py-4">Aucun client attribué.</li>}
            </ul>
          )}
        </div>
      )}

      {tab === 'contrats' && (
        <div className="bg-white rounded-2xl border p-6 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Contrats organisation</p>
          </div>
          {contractsLoading ? (
            <p className="text-sm text-gray-500">Chargement…</p>
          ) : (
            <ul className="space-y-2">
              {contracts.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 py-3 px-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-brand-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-500">
                        {CONTRACT_TYPE_LABELS[c.contract_type] || c.contract_type} · {CONTRACT_STATUS_LABELS[c.status] || c.status}
                        {c.starts_at && ` · Du ${new Date(c.starts_at).toLocaleDateString('fr-FR')}`}
                        {c.ends_at && ` au ${new Date(c.ends_at).toLocaleDateString('fr-FR')}`}
                      </p>
                    </div>
                  </div>
                  {c.document_url && (
                    <a href={c.document_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-brand-600 hover:underline shrink-0">Document</a>
                  )}
                </li>
              ))}
              {contracts.length === 0 && !contractsLoading && <li className="text-sm text-gray-500 py-4">Aucun contrat.</li>}
            </ul>
          )}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Ajouter un contrat</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input type="text" value={contractForm.name} onChange={(e) => setContractForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nom du contrat" className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none" />
              <select value={contractForm.contract_type} onChange={(e) => setContractForm((f) => ({ ...f, contract_type: e.target.value }))} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none">
                {Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={contractForm.status} onChange={(e) => setContractForm((f) => ({ ...f, status: e.target.value }))} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none">
                {Object.entries(CONTRACT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input type="date" value={contractForm.starts_at} onChange={(e) => setContractForm((f) => ({ ...f, starts_at: e.target.value }))} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none" />
              <input type="date" value={contractForm.ends_at} onChange={(e) => setContractForm((f) => ({ ...f, ends_at: e.target.value }))} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none" />
              <input type="url" value={contractForm.document_url} onChange={(e) => setContractForm((f) => ({ ...f, document_url: e.target.value }))} placeholder="URL document (optionnel)" className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none" />
            </div>
            <button type="button" onClick={handleAddContract} disabled={contractSaving || !contractForm.name.trim()} className="mt-3 px-4 py-2.5 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2">
              {contractSaving ? '…' : <Plus size={16} />} Ajouter le contrat
            </button>
          </div>
        </div>
      )}

      {tab === 'kpi' && (
        <div className="bg-white rounded-2xl border p-6">
          <p className="text-sm text-gray-500">KPI organisation (Sprint 2+).</p>
        </div>
      )}
        </div>
      </div>

      {/* Modal réaffectation client */}
      {reassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-gray-900">Réaffecter un client</h3>
            <p className="text-sm text-gray-600">Client : <strong>{reassignModal.clientName}</strong>. Choisissez la nouvelle organisation et optionnellement un motif.</p>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Organisation de destination</label>
              <select value={reassignToOrgId} onChange={(e) => setReassignToOrgId(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none">
                <option value="">— Choisir —</option>
                {allOrgs.filter((o) => o.id !== org?.id).map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Motif (optionnel)</label>
              <textarea value={reassignReason} onChange={(e) => setReassignReason(e.target.value)} rows={2} placeholder="Ex. déménagement, changement de périmètre" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none resize-none" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => { setReassignModal(null); setReassignToOrgId(''); setReassignReason(''); }} className="flex-1 py-2.5 rounded-xl font-bold text-sm border border-gray-200 text-gray-700 hover:bg-gray-50">Annuler</button>
              <button type="button" onClick={handleReassignClient} disabled={reassigning || !reassignToOrgId} className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50">{reassigning ? '…' : 'Réaffecter'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
