import React, { useEffect, useState } from 'react';
import { Building2, Users, Plus, Trash2, Search, User, Link2, Copy, Check } from 'lucide-react';
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

const ORG_MEMBER_ROLES = [
  'admin_org',
  'manager',
  'formateur',
  'facilitateur',
  'conseil_client',
  'gestionnaire_dossiers',
] as const;
type OrgMemberRole = (typeof ORG_MEMBER_ROLES)[number];
const ROLE_LABELS: Record<OrgMemberRole, string> = {
  admin_org: 'Admin org',
  manager: 'Manager',
  formateur: 'Formateur',
  facilitateur: 'Facilitateur',
  conseil_client: 'Conseil client',
  gestionnaire_dossiers: 'Gestionnaire dossiers',
};

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

export function AdminOrganisations() {
  const { success: showSuccess, error: showError } = useToastContext();
  const [organisations, setOrganisations] = useState<ChambreMetier[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<ChambreMetier | null>(null);
  const [members, setMembers] = useState<OrganisationMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<OrgMemberRole>('manager');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [adminNames, setAdminNames] = useState<Record<string, string>>({});
  const [inviteType, setInviteType] = useState<'artisan' | 'client'>('artisan');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  type InvitationLinkRow = {
    id: string;
    token: string;
    invitation_type: string;
    expires_at: string | null;
    used_at: string | null;
    created_at: string;
  };
  const [invitationLinks, setInvitationLinks] = useState<InvitationLinkRow[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);

  const loadOrganisations = async () => {
    setLoading(true);
    const { data: orgs, error: orgError } = await supabase
      .from('chambres_metier')
      .select('id, name, region, organisation_type, is_active, admin_id, created_at')
      .order('name');
    if (orgError) {
      showError(orgError.message);
      setLoading(false);
      return;
    }
    setOrganisations((orgs as ChambreMetier[]) || []);

    const ids = (orgs || []).map((o: { id: string }) => o.id);
    if (ids.length > 0) {
      const { data: mems } = await supabase
        .from('organisation_members')
        .select('organisation_id')
        .in('organisation_id', ids);
      const count: Record<string, number> = {};
      ids.forEach((id: string) => (count[id] = 0));
      (mems || []).forEach((m: { organisation_id: string }) => {
        count[m.organisation_id] = (count[m.organisation_id] || 0) + 1;
      });
      setMemberCounts(count);
    } else {
      setMemberCounts({});
    }

    const adminIds = [...new Set((orgs || []).map((o: ChambreMetier) => o.admin_id).filter(Boolean))] as string[];
    if (adminIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', adminIds);
      const names: Record<string, string> = {};
      (profiles || []).forEach((p: { id: string; full_name: string | null }) => {
        names[p.id] = p.full_name || p.id;
      });
      setAdminNames(names);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrganisations();
  }, []);

  useEffect(() => {
    if (!selectedOrg) {
      setMembers([]);
      setInvitationLinks([]);
      return;
    }
    setMembersLoading(true);
    supabase
      .from('organisation_members')
      .select(
        `
        id,
        user_id,
        organisation_id,
        role,
        created_at,
        profile:profiles!organisation_members_user_id_fkey(full_name, email)
      `
      )
      .eq('organisation_id', selectedOrg.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) showError(error.message);
        else setMembers((data as OrganisationMember[]) || []);
        setMembersLoading(false);
      });

    setLinksLoading(true);
    setGeneratedUrl(null);
    supabase
      .from('invitation_links')
      .select('id, token, invitation_type, expires_at, used_at, created_at')
      .eq('organisation_id', selectedOrg.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          try { showError(error.message); } catch (_) { /* table peut ne pas exister */ }
          setInvitationLinks([]);
        } else {
          setInvitationLinks((data as InvitationLinkRow[]) || []);
        }
        setLinksLoading(false);
      });
  }, [selectedOrg?.id, showError]);

  const handleAddMember = async () => {
    if (!selectedOrg || !addEmail.trim()) {
      showError('Saisissez un email.');
      return;
    }
    const email = addEmail.trim().toLowerCase();
    const { data: profiles } = await supabase.from('profiles').select('id').eq('email', email).limit(1).maybeSingle();
    if (!profiles?.id) {
      showError('Aucun utilisateur trouvé avec cet email.');
      return;
    }
    setAdding(true);
    const { error } = await supabase.from('organisation_members').insert({
      user_id: profiles.id,
      organisation_id: selectedOrg.id,
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
    setMembersLoading(true);
    const { data } = await supabase
      .from('organisation_members')
      .select(
        `
        id,
        user_id,
        organisation_id,
        role,
        created_at,
        profile:profiles!organisation_members_user_id_fkey(full_name, email)
      `
      )
      .eq('organisation_id', selectedOrg.id)
      .order('created_at', { ascending: false });
    setMembers((data as OrganisationMember[]) || []);
    setMemberCounts((prev) => ({ ...prev, [selectedOrg.id]: (prev[selectedOrg.id] || 0) + 1 }));
    setMembersLoading(false);
    setAdding(false);
  };

  const handleGenerateInviteLink = async () => {
    if (!selectedOrg) return;
    setGeneratingLink(true);
    setGeneratedUrl(null);
    try {
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('invitation_links').insert({
        token,
        organisation_id: selectedOrg.id,
        created_by: user?.id ?? null,
        invitation_type: inviteType,
        expires_at: expiresAt.toISOString(),
      });
      if (error) throw error;
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const url = `${base}/invite/${token}`;
      setGeneratedUrl(url);
      setInvitationLinks((prev) => [{
        id: '',
        token,
        invitation_type: inviteType,
        expires_at: expiresAt.toISOString(),
        used_at: null,
        created_at: new Date().toISOString(),
      }, ...prev]);
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

  const handleRemoveMember = async (memberId: string, organisationId: string) => {
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
    setMemberCounts((prev) => ({ ...prev, [organisationId]: Math.max(0, (prev[organisationId] || 1) - 1) }));
    setRemovingId(null);
  };

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
            {organisations.length === 0 && !loading ? (
              <div className="px-6 py-12 text-center text-gray-500">Aucune organisation.</div>
            ) : (
              organisations.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => setSelectedOrg(org)}
                  className={`w-full text-left px-6 py-4 flex items-center justify-between gap-4 transition-colors ${
                    selectedOrg?.id === org.id ? 'bg-brand-50 border-l-4 border-brand-500' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{org.name}</p>
                    <p className="text-sm text-gray-500">
                      {org.region}
                      {org.organisation_type ? ` · ${ORG_TYPE_LABELS[org.organisation_type as OrgType] || org.organisation_type}` : ''}
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
                </button>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="font-bold text-gray-900">
              {selectedOrg ? selectedOrg.name : 'Sélectionnez une organisation'}
            </h2>
            {selectedOrg && (
              <p className="text-xs text-gray-500 mt-1">
                Admin actuel : {selectedOrg.admin_id ? adminNames[selectedOrg.admin_id] || selectedOrg.admin_id : '—'}
              </p>
            )}
          </div>
          {!selectedOrg ? (
            <div className="px-6 py-12 text-center text-gray-500">
              Cliquez sur une organisation pour voir et gérer ses membres.
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Membres</p>
                {membersLoading ? (
                  <div className="text-sm text-gray-500">Chargement…</div>
                ) : (
                  <ul className="space-y-2">
                    {members.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-4 py-2 px-3 rounded-xl bg-gray-50 border border-gray-100"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                            <User size={14} className="text-brand-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 truncate">
                              {m.profile?.full_name || m.user_id}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{m.profile?.email || ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-1 rounded-lg bg-gray-200 text-gray-700 text-xs font-bold">
                            {ROLE_LABELS[m.role as OrgMemberRole] || m.role}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.id, selectedOrg.id)}
                            disabled={removingId === m.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Retirer le membre"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </li>
                    ))}
                    {members.length === 0 && !membersLoading && (
                      <li className="text-sm text-gray-500 py-4">Aucun membre pour l’instant.</li>
                    )}
                  </ul>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Liens d&apos;invitation</p>
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <select
                    value={inviteType}
                    onChange={(e) => setInviteType(e.target.value as 'artisan' | 'client')}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none"
                  >
                    <option value="artisan">Artisan</option>
                    <option value="client">Client</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleGenerateInviteLink}
                    disabled={generatingLink}
                    className="px-4 py-2.5 bg-gray-800 text-white rounded-xl font-bold text-sm hover:bg-gray-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Link2 size={16} />
                    {generatingLink ? 'Génération…' : 'Générer un lien'}
                  </button>
                </div>
                {generatedUrl && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-brand-50 border border-brand-100 mb-3">
                    <input
                      type="text"
                      readOnly
                      value={generatedUrl}
                      className="flex-1 min-w-0 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(generatedUrl)}
                      className="p-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600"
                      title="Copier"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                )}
                {linksLoading ? (
                  <p className="text-sm text-gray-500">Chargement des liens…</p>
                ) : invitationLinks.length > 0 ? (
                  <ul className="space-y-1.5 max-h-32 overflow-y-auto">
                    {invitationLinks.map((link) => (
                      <li key={link.id || link.token} className="flex items-center justify-between gap-2 text-xs py-1.5 px-2 rounded-lg bg-gray-50">
                        <span className="truncate">
                          {link.token.slice(0, 8)}… · {link.invitation_type}
                          {link.used_at ? ' · Utilisé' : link.expires_at && new Date(link.expires_at) < new Date() ? ' · Expiré' : ''}
                        </span>
                        <span className="text-gray-400 shrink-0">
                          {link.created_at ? new Date(link.created_at).toLocaleDateString('fr-FR') : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Ajouter un membre</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="email"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      placeholder="Email de l'utilisateur"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as OrgMemberRole)}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-brand-500 focus:outline-none"
                  >
                    {ORG_MEMBER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddMember}
                    disabled={adding || !addEmail.trim()}
                    className="px-4 py-2.5 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {adding ? '…' : <Plus size={16} />}
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
