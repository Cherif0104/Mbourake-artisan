import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Briefcase, Shield, DollarSign, 
  AlertCircle, CheckCircle, LogOut, Settings, Bell, AlertTriangle, Building2, Landmark,
  Package, ShoppingBag, FileDown
} from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { supabase } from '../../lib/supabase';

interface Stats {
  totalUsers: number;
  totalArtisans: number;
  totalClients: number;
  totalProjects: number;
  openProjects: number;
  completedProjects: number;
  totalEscrowHeld: number;
  pendingVerifications: number;
  disputedProjects: number;
  formalisationLeads: number;
  formalisationCompleted: number;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const { profile } = useProfile();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalArtisans: 0,
    totalClients: 0,
    totalProjects: 0,
    openProjects: 0,
    completedProjects: 0,
    totalEscrowHeld: 0,
    pendingVerifications: 0,
    disputedProjects: 0,
    formalisationLeads: 0,
    formalisationCompleted: 0,
  });
  const [loading, setLoading] = useState(true);
  const [projectTrends, setProjectTrends] = useState<ProjectTrend[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<ProjectStatusDistribution[]>([]);
  const [regionStats, setRegionStats] = useState<{ region: string; count: number }[]>([]);
  const [categoryStats, setCategoryStats] = useState<{ category_id: number; name: string; count: number }[]>([]);
  const [fplStats, setFplStats] = useState<{ label: string; count: number }[]>([]);
  const [orgStats, setOrgStats] = useState<{ id: string; name: string; artisanCount: number; clientCount: number }[]>([]);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showBellMenu, setShowBellMenu] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  // Fermer les menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettingsMenu(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowBellMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Check admin access
    if (profile && profile.role !== 'admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      
      // Fetch user counts
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      const { count: totalArtisans } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'artisan');
      
      const { count: totalClients } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'client');
      
      // Fetch project counts
      const { count: totalProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });
      
      const { count: openProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');
      
      const { count: completedProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');
      
      // Fetch escrow total
      const { data: escrows } = await supabase
        .from('escrows')
        .select('total_amount')
        .eq('status', 'held');
      
      const totalEscrowHeld = escrows?.reduce((sum, e) => sum + (e.total_amount || 0), 0) || 0;
      
      // Fetch pending verifications
      const { count: pendingVerifications } = await supabase
        .from('artisans')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'pending');
      
      // Fetch disputed projects
      const { count: disputedProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'disputed');

      // F‑P‑L : éviter les 400 si colonnes FPL non déployées (calcul côté front)
      const { data: artisanProfilesForFpl } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'artisan');
      const formalisationLeads = (artisanProfilesForFpl || []).filter((p: any) => !p.formalisation_status).length;
      const formalisationCompleted = (artisanProfilesForFpl || []).filter((p: any) => p.formalisation_status === 'valide').length;
      
      // Fetch project trends (derniers 30 jours)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: recentProjects } = await supabase
        .from('projects')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });
      
      // Grouper par jour
      const trendsMap = new Map<string, number>();
      recentProjects?.forEach((project) => {
        const date = new Date(project.created_at).toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: '2-digit' 
        });
        trendsMap.set(date, (trendsMap.get(date) || 0) + 1);
      });
      
      const trends = Array.from(trendsMap.entries())
        .map(([date, count]) => ({ date, count }))
        .slice(-14); // Derniers 14 jours
      
      setProjectTrends(trends);
      
      // Fetch status distribution
      const { data: allProjects } = await supabase
        .from('projects')
        .select('status');
      
      const statusMap = new Map<string, number>();
      allProjects?.forEach((project) => {
        const status = project.status || 'unknown';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });
      
      const distribution = Array.from(statusMap.entries()).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count
      }));
      
      setStatusDistribution(distribution);

      // Par région (artisans)
      const { data: artisansByRegion } = await supabase
        .from('profiles')
        .select('region')
        .eq('role', 'artisan')
        .not('region', 'is', null);
      const regionMap = new Map<string, number>();
      artisansByRegion?.forEach((p: { region: string | null }) => {
        const r = (p.region || '').trim();
        if (r) regionMap.set(r, (regionMap.get(r) || 0) + 1);
      });
      setRegionStats(Array.from(regionMap.entries()).map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count));

      // Par catégorie (artisans)
      const { data: categories } = await supabase.from('categories').select('id, name');
      const { data: artisansCat } = await supabase.from('artisans').select('category_id');
      const catMap = new Map<number, number>();
      artisansCat?.forEach((a: { category_id: number | null }) => {
        const c = a.category_id ?? 0;
        if (c) catMap.set(c, (catMap.get(c) || 0) + 1);
      });
      const catNames = new Map((categories || []).map((c: { id: number; name: string }) => [c.id, c.name || '']));
      setCategoryStats(
        Array.from(catMap.entries())
          .map(([category_id, count]) => ({ category_id, name: catNames.get(category_id) || `Catégorie ${category_id}`, count }))
          .sort((a, b) => b.count - a.count)
      );

      // F-P-L (formalisation / professionnalisation / labellisation)
      const fplProfiles = (artisanProfilesForFpl || []) as Array<{
        formalisation_status?: string | null;
        professionalisation_status?: string | null;
        labellisation_status?: string | null;
      }>;
      const fplForm = new Map<string, number>();
      const fplPro = new Map<string, number>();
      const fplLab = new Map<string, number>();
      fplProfiles?.forEach((p: { formalisation_status?: string | null; professionalisation_status?: string | null; labellisation_status?: string | null }) => {
        const fs = p.formalisation_status || 'non_renseigne';
        const ps = p.professionalisation_status || 'non_renseigne';
        const ls = p.labellisation_status || 'non_renseigne';
        fplForm.set(fs, (fplForm.get(fs) || 0) + 1);
        fplPro.set(ps, (fplPro.get(ps) || 0) + 1);
        fplLab.set(ls, (fplLab.get(ls) || 0) + 1);
      });
      const fplRows: { label: string; count: number }[] = [];
      fplForm.forEach((count, label) => fplRows.push({ label: `Formalisation: ${label}`, count }));
      fplPro.forEach((count, label) => fplRows.push({ label: `Professionnalisation: ${label}`, count }));
      fplLab.forEach((count, label) => fplRows.push({ label: `Labellisation: ${label}`, count }));
      setFplStats(fplRows.sort((a, b) => b.count - a.count));

      // Par organisation (chambres + affiliations / attributions)
      try {
        const { data: chambres, error: chambresErr } = await supabase.from('chambres_metier').select('id, name');
        if (chambresErr) throw chambresErr;

        const orgArtisanCount: Record<string, number> = {};
        const orgClientCount: Record<string, number> = {};
        (chambres || []).forEach((c: { id: string }) => {
          orgArtisanCount[c.id] = 0;
          orgClientCount[c.id] = 0;
        });
        const { data: affils } = await supabase.from('artisan_affiliations').select('chambre_id');
        affils?.forEach((a: { chambre_id: string | null }) => {
          if (a.chambre_id) orgArtisanCount[a.chambre_id] = (orgArtisanCount[a.chambre_id] || 0) + 1;
        });
        try {
          const { data: attr } = await supabase.from('client_attributions').select('organisation_id');
          attr?.forEach((a: { organisation_id: string }) => {
            orgClientCount[a.organisation_id] = (orgClientCount[a.organisation_id] || 0) + 1;
          });
        } catch (_) { /* table peut ne pas exister */ }
        setOrgStats(
          (chambres || []).map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name,
            artisanCount: orgArtisanCount[c.id] || 0,
            clientCount: orgClientCount[c.id] || 0,
          }))
        );
      } catch (_) {
        setOrgStats([]);
      }
      
      setStats({
        totalUsers: totalUsers || 0,
        totalArtisans: totalArtisans || 0,
        totalClients: totalClients || 0,
        totalProjects: totalProjects || 0,
        openProjects: openProjects || 0,
        completedProjects: completedProjects || 0,
        totalEscrowHeld,
        pendingVerifications: pendingVerifications || 0,
        disputedProjects: disputedProjects || 0,
        formalisationLeads: formalisationLeads || 0,
        formalisationCompleted: formalisationCompleted || 0,
      });
      
      setLoading(false);
    };

    fetchStats();
  }, []);

  const navItems = [
    { id: 'overview', path: '/admin', icon: <LayoutDashboard size={20} />, label: 'Vue d\'ensemble' },
    { id: 'users', path: '/admin/users', icon: <Users size={20} />, label: 'Utilisateurs' },
    { id: 'projects', path: '/admin/projects', icon: <Briefcase size={20} />, label: 'Projets' },
    { id: 'boutique', path: '/admin/boutique', icon: <Package size={20} />, label: 'Boutique' },
    { id: 'commandes', path: '/admin/commandes', icon: <ShoppingBag size={20} />, label: 'Commandes' },
    { id: 'escrows', path: '/admin/escrows', icon: <DollarSign size={20} />, label: 'Paiements' },
    { id: 'closures', path: '/admin/closures', icon: <CheckCircle size={20} />, label: 'Clôtures' },
    { id: 'verifications', path: '/admin/verifications', icon: <Shield size={20} />, label: 'Vérifications' },
    { id: 'affiliations', path: '/admin/affiliations', icon: <Building2 size={20} />, label: 'Affiliations' },
    { id: 'organisations', path: '/admin/organisations', icon: <Landmark size={20} />, label: 'Organisations' },
    { id: 'disputes', path: '/admin/disputes', icon: <AlertTriangle size={20} />, label: 'Litiges' },
    { id: 'exports', path: '/admin/exports', icon: <FileDown size={20} />, label: 'Exports' },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-gray-900 text-white flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-black tracking-tight">
            Mboura<span className="text-brand-500">ké</span>
          </h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Panel Admin</p>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                isActive(item.path)
                  ? 'bg-brand-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.icon}
              {item.label}
              {item.id === 'verifications' && stats.pendingVerifications > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {stats.pendingVerifications}
                </span>
              )}
              {item.id === 'disputes' && stats.disputedProjects > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                  {stats.disputedProjects}
                </span>
              )}
            </Link>
          ))}
        </nav>
        
        {/* User & Logout */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center font-black">
              {profile?.full_name?.[0] || 'A'}
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm truncate">{profile?.full_name}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Administrateur</p>
            </div>
          </div>
          <button
            onClick={async () => {
              await auth.signOut();
              navigate('/');
            }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white font-bold text-sm transition-all"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white border-b px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900">
              {navItems.find(n => isActive(n.path))?.label || 'Dashboard'}
            </h2>
            <p className="text-sm text-gray-400">Gérez votre plateforme Mbourake</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={bellRef}>
              <button
                type="button"
                onClick={() => { setShowBellMenu(!showBellMenu); setShowSettingsMenu(false); }}
                className="p-2 text-gray-400 hover:text-gray-600 relative rounded-lg hover:bg-gray-100"
                aria-label="Notifications"
              >
                <Bell size={22} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              {showBellMenu && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-2 z-50">
                  <p className="px-4 py-3 text-sm text-gray-500">Aucune nouvelle notification</p>
                </div>
              )}
            </div>
            <div className="relative" ref={settingsRef}>
              <button
                type="button"
                onClick={() => { setShowSettingsMenu(!showSettingsMenu); setShowBellMenu(false); }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                aria-label="Paramètres"
              >
                <Settings size={22} />
              </button>
              {showSettingsMenu && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-gray-200 shadow-lg py-2 z-50">
                  <button
                    type="button"
                    onClick={() => { navigate('/'); setShowSettingsMenu(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <LayoutDashboard size={18} className="text-gray-400" />
                    Retour à l&apos;accueil
                  </button>
                  <button
                    type="button"
                    onClick={() => { navigate('/profile'); setShowSettingsMenu(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Users size={18} className="text-gray-400" />
                    Mon profil
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        
        {/* Content Area */}
        <div className="flex-1 p-8 overflow-auto">
          {location.pathname === '/admin' ? (
            /* Vue d'ensemble minimaliste */
            <div className="space-y-6 max-w-5xl">
              {/* KPI compactes (style minimal) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={<Users className="text-blue-600" size={20} />}
                  label="Utilisateurs"
                  value={stats.totalUsers}
                  subtext={stats.totalUsers > 0 ? `${Math.round((stats.totalArtisans / stats.totalUsers) * 100)}% artisans` : '—'}
                  color="blue"
                  alert={false}
                />
                <StatCard
                  icon={<Briefcase className="text-brand-500" size={20} />}
                  label="Projets"
                  value={stats.totalProjects}
                  subtext={stats.openProjects > 0 ? `${stats.openProjects} ouverts` : '—'}
                  color="orange"
                />
                <StatCard
                  icon={<DollarSign className="text-green-600" size={20} />}
                  label="Escrow"
                  value={stats.totalEscrowHeld > 0 ? `${(stats.totalEscrowHeld / 1000).toFixed(0)}k` : '0'}
                  subtext="FCFA en garantie"
                  color="green"
                />
                <StatCard
                  icon={<Shield className="text-purple-600" size={20} />}
                  label="Vérifications"
                  value={stats.pendingVerifications}
                  subtext="En attente"
                  color="purple"
                  alert={stats.pendingVerifications > 0}
                />
              </div>

              {/* Donuts compacts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Utilisateurs</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={(() => {
                          const d = [
                            { name: 'Artisans', value: stats.totalArtisans, color: '#f97316' },
                            { name: 'Clients', value: stats.totalClients, color: '#3b82f6' },
                          ].filter((x) => x.value > 0);
                          return d.length ? d : [{ name: 'Aucun', value: 1, color: '#e5e7eb' }];
                        })()}
                        cx="50%"
                        cy="50%"
                        innerRadius={44}
                        outerRadius={64}
                        paddingAngle={1}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {(() => {
                          const d = [
                            { name: 'Artisans', value: stats.totalArtisans, color: '#f97316' },
                            { name: 'Clients', value: stats.totalClients, color: '#3b82f6' },
                          ].filter((x) => x.value > 0);
                          const data = d.length ? d : [{ name: 'Aucun', value: 1, color: '#e5e7eb' }];
                          return data.map((entry) => <Cell key={entry.name} fill={entry.color} />);
                        })()}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string, props: { payload: { value: number } }) => {
                        const total = stats.totalArtisans + stats.totalClients;
                        const pct = total > 0 ? ((props.payload.value / total) * 100).toFixed(1) : '0';
                        return [`${value} (${pct}%)`, name];
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Projets par statut</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={statusDistribution.length > 0 ? statusDistribution : [{ status: 'Aucun', count: 1 }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={44}
                        outerRadius={64}
                        paddingAngle={1}
                        dataKey="count"
                        nameKey="status"
                        label={({ status, count }) => {
                          const total = (statusDistribution.length ? statusDistribution : [{ status: 'Aucun', count: 1 }]).reduce((s, x) => s + x.count, 0);
                          const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
                          return `${status} ${pct}%`;
                        }}
                      >
                        {(statusDistribution.length > 0 ? statusDistribution : [{ status: 'Aucun', count: 1 }]).map((entry, index) => (
                          <Cell key={entry.status} fill={['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#ef4444', '#64748b', '#e5e7eb'][index % 7]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string, props: { payload: { count: number } }) => {
                        const total = statusDistribution.reduce((s, x) => s + x.count, 0);
                        const pct = total > 0 ? ((props.payload.count / total) * 100).toFixed(1) : '0';
                        return [`${value} (${pct}%)`, name];
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Par région */}
              {regionStats.length > 0 && (
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Artisans par région</p>
                  <div className="flex flex-wrap gap-2">
                    {regionStats.slice(0, 12).map((r) => (
                      <span key={r.region} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                        {r.region} <span className="font-bold text-brand-600">{r.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Par catégorie */}
              {categoryStats.length > 0 && (
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Artisans par catégorie</p>
                  <div className="flex flex-wrap gap-2">
                    {categoryStats.slice(0, 10).map((c) => (
                      <span key={c.category_id} className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-gray-700">
                        {c.name} <span className="font-bold text-brand-600">{c.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* F-P-L */}
              {fplStats.length > 0 && (
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Statuts F-P-L (artisans)</p>
                  <div className="flex flex-wrap gap-2">
                    {fplStats.slice(0, 9).map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-gray-700">
                        {f.label} <span className="font-bold">{f.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Par organisation */}
              {orgStats.length > 0 && (
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Organisations (affiliations / attributions)</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {orgStats.map((o) => (
                      <div key={o.id} className="flex items-center justify-between text-sm py-1">
                        <span className="font-medium text-gray-800 truncate">{o.name}</span>
                        <span className="text-gray-500 shrink-0 ml-2">Artisans: {o.artisanCount} · Clients: {o.clientCount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Accès rapides (liens discrets) */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-500 mr-2">Accès rapide :</span>
                <button type="button" onClick={() => navigate('/admin/verifications')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Shield size={14} /> Vérifications {stats.pendingVerifications > 0 && <span className="bg-red-100 text-red-700 text-xs px-1.5 rounded">{stats.pendingVerifications}</span>}
                </button>
                <button type="button" onClick={() => navigate('/admin/projects')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Briefcase size={14} /> Projets
                </button>
                <button type="button" onClick={() => navigate('/admin/boutique')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Package size={14} /> Boutique
                </button>
                <button type="button" onClick={() => navigate('/admin/commandes')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <ShoppingBag size={14} /> Commandes
                </button>
                <button type="button" onClick={() => navigate('/admin/escrows')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <DollarSign size={14} /> Escrow
                </button>
                {stats.disputedProjects > 0 && (
                  <button type="button" onClick={() => navigate('/admin/disputes')} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100">
                    <AlertTriangle size={14} /> Litiges {stats.disputedProjects}
                  </button>
                )}
              </div>

              {/* Courbe tendance (optionnelle, compacte) */}
              {projectTrends.length > 0 && (
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Projets créés (14 j)</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={projectTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="Projets" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
}

// Carte KPI minimaliste (style épuré)
function StatCard({ icon, label, value, subtext, color, alert }: { icon: React.ReactNode; label: string; value: string | number; subtext: string; color: string; alert?: boolean }) {
  const iconBg: Record<string, string> = {
    blue: 'bg-blue-50',
    orange: 'bg-orange-50',
    green: 'bg-green-50',
    purple: 'bg-purple-50',
  };
  return (
    <div className="relative bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
        {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
      </div>
      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${iconBg[color] || 'bg-gray-100'}`}>
        {icon}
      </div>
      {alert && (
        <span className="absolute top-2 right-2 flex items-center gap-0.5 text-red-500 text-[10px] font-semibold">
          <AlertCircle size={10} />
        </span>
      )}
    </div>
  );
}
