import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  User, Briefcase, Shield, CheckCircle, Ban, Trash2, ArrowLeft,
  Building2, FileText, Package, ShoppingBag, Star, AlertTriangle, GraduationCap, History
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAudit } from '../../lib/adminAudit';
import { useToastContext } from '../../contexts/ToastContext';
import { LoadingOverlay } from '../../components/LoadingOverlay';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  location: string | null;
  avatar_url: string | null;
  created_at: string;
  is_suspended?: boolean | null;
  suspended_at?: string | null;
  suspended_reason?: string | null;
  is_banned?: boolean | null;
  banned_at?: string | null;
  banned_reason?: string | null;
  formalisation_status?: string | null;
  professionalisation_status?: string | null;
  labellisation_status?: string | null;
}

type TabId = 'identite' | 'projets' | 'affiliation' | 'documents' | 'boutique' | 'avis' | 'historique';

export function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToastContext();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [banningId, setBanningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('identite');
  const [artisanData, setArtisanData] = useState<{
    verification_status: string;
    is_verified: boolean;
    category?: { name: string };
  } | null>(null);
  const [affiliations, setAffiliations] = useState<{ id: string; chambre_id: string; status: string; chambre?: { name: string } }[]>([]);
  const [projects, setProjects] = useState<{ id: string; title: string; status: string; client_id: string; project_number?: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; title: string; status: string; price: number }[]>([]);
  const [orders, setOrders] = useState<{ id: string; buyer_id: string; total_amount: number; status: string }[]>([]);
  const [reviews, setReviews] = useState<{ id: string; rating: number; comment: string | null; created_at: string }[]>([]);
  const [auditLogs, setAuditLogs] = useState<{ id: string; action: string; created_at: string; actor_user_id: string }[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
      if (error) {
        showError(error.message);
        setLoading(false);
        return;
      }
      setUser(data as UserProfile | null);
      setLoading(false);
    })();
  }, [id, showError]);

  useEffect(() => {
    if (!id || !user) return;
    if (user.role === 'artisan') {
      supabase.from('artisans').select('verification_status, is_verified, category:categories(name)').eq('id', id).maybeSingle().then(({ data }) => setArtisanData(data as any));
      supabase.from('artisan_affiliations').select('id, chambre_id, status, chambre:chambres_metier(name)').eq('artisan_id', id).then(({ data }) => setAffiliations((data || []) as any));
      supabase.from('products').select('id, title, status, price').eq('artisan_id', id).limit(20).then(({ data }) => setProducts((data || []) as any));
      supabase.from('orders').select('id, buyer_id, total_amount, status').eq('seller_id', id).limit(20).then(({ data }) => setOrders((data || []) as any));
      supabase.from('reviews').select('id, rating, comment, created_at').eq('artisan_id', id).limit(20).then(({ data }) => setReviews((data || []) as any));
    }
    (async () => {
      if (user.role === 'client') {
        const { data } = await supabase.from('projects').select('id, title, status, client_id, project_number').eq('client_id', id).limit(50);
        setProjects((data || []) as any);
      } else if (user.role === 'artisan') {
        const { data: quoteData } = await supabase.from('quotes').select('project_id').eq('artisan_id', id);
        const projectIds = [...new Set((quoteData || []).map((q: { project_id: string }) => q.project_id))];
        if (projectIds.length > 0) {
          const { data } = await supabase.from('projects').select('id, title, status, client_id, project_number').in('id', projectIds).limit(50);
          setProjects((data || []) as any);
        } else {
          setProjects([]);
        }
      } else {
        setProjects([]);
      }
    })();
    supabase.from('admin_audit_logs').select('id, action, created_at, actor_user_id').eq('entity_type', 'profile').eq('entity_id', id).order('created_at', { ascending: false }).limit(30).then(({ data }) => setAuditLogs((data || []) as any));
  }, [id, user]);

  const handleChangeRole = async (userId: string, newRole: string) => {
    const previousRole = user?.id === userId ? user.role : undefined;
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) showError(error.message);
    else {
      await logAdminAudit({
        action: 'profile.role_change',
        entity_type: 'profile',
        entity_id: userId,
        old_data: previousRole != null ? { role: previousRole } : undefined,
        new_data: { role: newRole },
      });
      showSuccess('Rôle mis à jour.');
      setUser((u) => (u?.id === userId ? { ...u, role: newRole } : u));
    }
  };

  const handleBan = async (userId: string, ban: boolean, reason?: string) => {
    setBanningId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_banned: ban,
          banned_at: ban ? new Date().toISOString() : null,
          banned_reason: ban ? (reason || 'Banni par un administrateur') : null,
          banned_by: ban ? (await supabase.auth.getUser()).data.user?.id ?? null : null,
        })
        .eq('id', userId);
      if (error) throw error;
      await logAdminAudit({
        action: ban ? 'profile.ban' : 'profile.unban',
        entity_type: 'profile',
        entity_id: userId,
        new_data: { is_banned: ban, reason: reason || null },
      });
      showSuccess(ban ? 'Compte banni.' : 'Compte débanni.');
      setUser((u) => (u?.id === userId ? { ...u, is_banned: ban } : u));
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBanningId(null);
    }
  };

  const handleSuspend = async (userId: string, suspend: boolean) => {
    setSuspendingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_suspended: suspend,
          suspended_at: suspend ? new Date().toISOString() : null,
          suspended_reason: suspend ? 'Suspendu par un administrateur' : null,
        })
        .eq('id', userId);
      if (error) throw error;
      await logAdminAudit({
        action: suspend ? 'profile.suspend' : 'profile.reactivate',
        entity_type: 'profile',
        entity_id: userId,
        new_data: { is_suspended: suspend },
      });
      showSuccess(suspend ? 'Compte suspendu.' : 'Compte réactivé.');
      setUser((u) => (u?.id === userId ? { ...u, is_suspended: suspend } : u));
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSuspendingId(null);
    }
  };

  const handleDeleteAccount = async (userId: string) => {
    if (!window.confirm('Supprimer définitivement ce compte et toutes ses données ? Cette action est irréversible.')) return;
    setDeletingId(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        showError('Session expirée. Reconnectez-vous.');
        setDeletingId(null);
        return;
      }
      const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const fnUrl = isLocalhost
        ? '/api/supabase-functions/v1/admin-delete-account'
        : (baseUrl ? `${baseUrl.replace(/\/$/, '')}/functions/v1/admin-delete-account` : `${window.location.origin}/functions/v1/admin-delete-account`);
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: userId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Erreur ${res.status}`);
      showSuccess('Compte supprimé.');
      navigate('/admin/users');
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <LoadingOverlay />;
  if (!user) {
    return (
      <div className="space-y-4">
        <Link to="/admin/users" className="inline-flex items-center gap-2 text-brand-600 font-bold hover:underline">
          <ArrowLeft size={18} /> Retour aux utilisateurs
        </Link>
        <p className="text-gray-500">Utilisateur introuvable.</p>
      </div>
    );
  }

  const isArtisan = user.role === 'artisan';
  const isClient = user.role === 'client';

  const tabs: { id: TabId; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: 'identite', label: 'Identité', icon: <User size={16} />, show: true },
    { id: 'projets', label: 'Projets', icon: <Briefcase size={16} />, show: true },
    { id: 'affiliation', label: 'Affiliation', icon: <Building2 size={16} />, show: isArtisan },
    { id: 'documents', label: 'Documents', icon: <FileText size={16} />, show: isArtisan },
    { id: 'boutique', label: 'Boutique', icon: <Package size={16} />, show: isArtisan },
    { id: 'avis', label: 'Avis', icon: <Star size={16} />, show: isArtisan },
    { id: 'historique', label: 'Historique admin', icon: <History size={16} />, show: true },
  ].filter((t) => t.show);

  return (
    <div className="space-y-6 max-w-6xl">
      <Link to="/admin/users" className="inline-flex items-center gap-2 text-brand-600 font-bold hover:underline">
        <ArrowLeft size={18} /> Retour aux utilisateurs
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden shrink-0">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={28} className="text-brand-600" />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-black text-gray-900 truncate">{user.full_name || 'Sans nom'}</h1>
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold capitalize">{user.role}</span>
            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${user.is_banned ? 'bg-red-100 text-red-700' : user.is_suspended ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
              {user.is_banned ? 'Banni' : user.is_suspended ? 'Suspendu' : 'Actif'}
            </span>
            {isArtisan && artisanData && (
              <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                artisanData.verification_status === 'verified' ? 'bg-green-100 text-green-700' :
                artisanData.verification_status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {artisanData.verification_status === 'verified' ? 'Vérifié' : artisanData.verification_status === 'pending' ? 'En attente' : 'Non vérifié'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="border-b border-gray-200">
            <nav className="flex gap-4 overflow-x-auto pb-px">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 pb-3 px-1 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${
                    tab === t.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-6">
            {tab === 'identite' && (
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Téléphone</span>
                  <span className="font-bold text-gray-900">{user.phone || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Région</span>
                  <span className="font-bold text-gray-900">{user.location || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Inscription</span>
                  <span className="font-bold text-gray-900">{new Date(user.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
                {isArtisan && (
                  <div className="flex flex-col gap-2 py-2 border-b">
                    <span className="text-gray-500 text-sm">Parcours F‑P‑L</span>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full bg-gray-50 text-[11px] text-gray-700 border border-gray-200">
                        F : {user.formalisation_status || 'à démarrer'}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-gray-50 text-[11px] text-gray-700 border border-gray-200">
                        P : {user.professionalisation_status || 'à démarrer'}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-gray-50 text-[11px] text-gray-700 border border-gray-200">
                        L : {user.labellisation_status || 'à démarrer'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'projets' && (
              <div className="space-y-2">
                {projects.length === 0 ? (
                  <p className="text-gray-500">Aucun projet.</p>
                ) : (
                  projects.map((p) => (
                    <Link
                      key={p.id}
                      to={`/projects/${p.id}`}
                      className="block py-3 px-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100"
                    >
                      <p className="font-bold text-gray-900">{p.title || p.project_number || p.id}</p>
                      <p className="text-xs text-gray-500">{p.status} · {p.project_number || p.id}</p>
                    </Link>
                  ))
                )}
              </div>
            )}

            {tab === 'affiliation' && (
              <div className="space-y-2">
                {affiliations.length === 0 ? (
                  <p className="text-gray-500">Aucune affiliation.</p>
                ) : (
                  affiliations.map((a) => (
                    <div key={a.id} className="py-3 px-4 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="font-bold text-gray-900">{(a.chambre as { name?: string })?.name || 'Organisation'}</p>
                      <p className="text-xs text-gray-500">Statut : {a.status}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'documents' && (
              <p className="text-gray-500">Documents de vérification — voir <Link to="/admin/verifications" className="text-brand-600 font-bold hover:underline">Vérifications</Link>.</p>
            )}

            {tab === 'boutique' && (
              <div className="space-y-2">
                {products.length === 0 ? (
                  <p className="text-gray-500">Aucun produit.</p>
                ) : (
                  products.map((p) => (
                    <div key={p.id} className="py-3 px-4 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="font-bold text-gray-900">{p.title}</p>
                      <p className="text-xs text-gray-500">{p.status} · {p.price} FCFA</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'avis' && (
              <div className="space-y-2">
                {reviews.length === 0 ? (
                  <p className="text-gray-500">Aucun avis.</p>
                ) : (
                  reviews.map((r) => (
                    <div key={r.id} className="py-3 px-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-2">
                        <Star size={14} className="text-amber-500 fill-amber-500" />
                        <span className="font-bold">{r.rating}/5</span>
                      </div>
                      {r.comment && <p className="text-sm text-gray-700 mt-1">{r.comment}</p>}
                      <p className="text-xs text-gray-500 mt-1">{new Date(r.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'historique' && (
              <div className="space-y-2">
                {auditLogs.length === 0 ? (
                  <p className="text-gray-500">Aucune action admin.</p>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="py-2 px-3 rounded-lg bg-gray-50 text-sm">
                      <span className="font-medium">{log.action}</span>
                      <span className="text-gray-500"> · {new Date(log.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col gap-6">
          <div className="space-y-3">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Changer le rôle</p>
            <div className="grid grid-cols-3 gap-2">
              {['client', 'artisan', 'admin'].map((role) => (
                <button
                  key={role}
                  onClick={() => handleChangeRole(user.id, role)}
                  disabled={user.role === role}
                  className={`py-2 rounded-xl font-bold text-sm capitalize transition-all ${
                    user.role === role ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Suspension</p>
            <div className="flex gap-2">
              {user.is_suspended ? (
                <button
                  type="button"
                  onClick={() => handleSuspend(user.id, false)}
                  disabled={suspendingId === user.id}
                  className="flex-1 py-2 rounded-xl font-bold text-sm bg-green-100 text-green-700 hover:bg-green-200 transition-colors flex items-center justify-center gap-2"
                >
                  {suspendingId === user.id ? '…' : null}
                  <CheckCircle size={16} /> Réactiver
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSuspend(user.id, true)}
                  disabled={suspendingId === user.id}
                  className="flex-1 py-2 rounded-xl font-bold text-sm bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors flex items-center justify-center gap-2"
                >
                  {suspendingId === user.id ? '…' : null}
                  <Ban size={16} /> Suspendre
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Bannissement</p>
            <div className="flex gap-2">
              {user.is_banned ? (
                <button
                  type="button"
                  onClick={() => handleBan(user.id, false)}
                  disabled={banningId === user.id}
                  className="flex-1 py-2 rounded-xl font-bold text-sm bg-green-100 text-green-700 hover:bg-green-200 transition-colors flex items-center justify-center gap-2"
                >
                  {banningId === user.id ? '…' : null}
                  <CheckCircle size={16} /> Débannir
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const reason = window.prompt('Motif du bannissement (optionnel)');
                    handleBan(user.id, true, reason || undefined);
                  }}
                  disabled={banningId === user.id}
                  className="flex-1 py-2 rounded-xl font-bold text-sm bg-red-100 text-red-700 hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                >
                  {banningId === user.id ? '…' : null}
                  <Ban size={16} /> Bannir
                </button>
              )}
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => handleDeleteAccount(user.id)}
              disabled={deletingId === user.id}
              className="w-full py-2.5 rounded-xl font-bold text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
            >
              {deletingId === user.id ? 'Suppression…' : <Trash2 size={16} />}
              Supprimer le compte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
