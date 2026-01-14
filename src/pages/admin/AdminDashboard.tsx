import React, { useEffect, useState } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Briefcase, Shield, DollarSign, 
  TrendingUp, AlertCircle, CheckCircle, Clock, LogOut,
  ChevronRight, Settings, Bell, AlertTriangle
} from 'lucide-react';
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
  });
  const [loading, setLoading] = useState(true);

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
      });
      
      setLoading(false);
    };

    fetchStats();
  }, []);

  const navItems = [
    { id: 'overview', path: '/admin', icon: <LayoutDashboard size={20} />, label: 'Vue d\'ensemble' },
    { id: 'users', path: '/admin/users', icon: <Users size={20} />, label: 'Utilisateurs' },
    { id: 'projects', path: '/admin/projects', icon: <Briefcase size={20} />, label: 'Projets' },
    { id: 'escrows', path: '/admin/escrows', icon: <DollarSign size={20} />, label: 'Paiements' },
    { id: 'verifications', path: '/admin/verifications', icon: <Shield size={20} />, label: 'Vérifications' },
    { id: 'disputes', path: '/admin/disputes', icon: <AlertTriangle size={20} />, label: 'Litiges' },
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
              navigate('/landing');
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
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 relative">
              <Bell size={22} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <Settings size={22} />
            </button>
          </div>
        </header>
        
        {/* Content Area */}
        <div className="flex-1 p-8 overflow-auto">
          {location.pathname === '/admin' ? (
            /* Overview Dashboard */
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  icon={<Users className="text-blue-500" />}
                  label="Utilisateurs"
                  value={stats.totalUsers}
                  subtext={`${stats.totalArtisans} artisans · ${stats.totalClients} clients`}
                  color="blue"
                />
                <StatCard
                  icon={<Briefcase className="text-brand-500" />}
                  label="Projets"
                  value={stats.totalProjects}
                  subtext={`${stats.openProjects} ouverts · ${stats.completedProjects} terminés`}
                  color="orange"
                />
                <StatCard
                  icon={<DollarSign className="text-green-500" />}
                  label="Escrow Actif"
                  value={`${stats.totalEscrowHeld.toLocaleString()} FCFA`}
                  subtext="Fonds en garantie"
                  color="green"
                />
                <StatCard
                  icon={<Shield className="text-purple-500" />}
                  label="Vérifications"
                  value={stats.pendingVerifications}
                  subtext="En attente"
                  color="purple"
                  alert={stats.pendingVerifications > 0}
                />
              </div>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <QuickAction
                  icon={<Shield />}
                  title="Vérifier les artisans"
                  description="Examinez les demandes de certification"
                  count={stats.pendingVerifications}
                  onClick={() => navigate('/admin/verifications')}
                />
                <QuickAction
                  icon={<Briefcase />}
                  title="Projets en cours"
                  description="Suivez l'avancement des projets"
                  count={stats.openProjects}
                  onClick={() => navigate('/admin/projects')}
                />
                <QuickAction
                  icon={<DollarSign />}
                  title="Paiements Escrow"
                  description="Gérez les garanties et libérations"
                  onClick={() => navigate('/admin/escrows')}
                />
                {stats.disputedProjects > 0 && (
                  <QuickAction
                    icon={<AlertTriangle />}
                    title="Litiges à résoudre"
                    description="Des projets nécessitent votre attention"
                    count={stats.disputedProjects}
                    onClick={() => navigate('/admin/disputes')}
                  />
                )}
              </div>
              
              {/* Recent Activity */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h3 className="font-black text-gray-900 mb-4">Activité Récente</h3>
                <div className="space-y-4">
                  <ActivityItem
                    icon={<CheckCircle className="text-green-500" />}
                    text="Nouveau projet créé: Réparation plomberie"
                    time="Il y a 5 min"
                  />
                  <ActivityItem
                    icon={<Users className="text-blue-500" />}
                    text="Nouvel artisan inscrit: Moussa Diop"
                    time="Il y a 15 min"
                  />
                  <ActivityItem
                    icon={<DollarSign className="text-green-500" />}
                    text="Paiement escrow reçu: 25,000 FCFA"
                    time="Il y a 1h"
                  />
                  <ActivityItem
                    icon={<Shield className="text-purple-500" />}
                    text="Demande de vérification: Fatou Cissé"
                    time="Il y a 2h"
                  />
                </div>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
}

// Sub-components
function StatCard({ icon, label, value, subtext, color, alert }: any) {
  const bgColors: Record<string, string> = {
    blue: 'bg-blue-50',
    orange: 'bg-orange-50',
    green: 'bg-green-50',
    purple: 'bg-purple-50',
  };
  
  return (
    <div className={`${bgColors[color]} rounded-2xl p-6 relative overflow-hidden`}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
          {icon}
        </div>
        {alert && (
          <span className="flex items-center gap-1 text-red-500 text-xs font-bold">
            <AlertCircle size={14} />
            Action requise
          </span>
        )}
      </div>
      <p className="text-3xl font-black text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-xs text-gray-400 mt-1">{subtext}</p>
    </div>
  );
}

function QuickAction({ icon, title, description, count, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-6 shadow-sm border text-left hover:shadow-md hover:border-brand-200 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-all">
          {icon}
        </div>
        {count !== undefined && count > 0 && (
          <span className="bg-brand-500 text-white text-xs font-black px-2 py-1 rounded-full">
            {count}
          </span>
        )}
      </div>
      <h4 className="font-black text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-500">{description}</p>
      <div className="flex items-center gap-1 text-brand-500 text-sm font-bold mt-4 group-hover:gap-2 transition-all">
        Accéder <ChevronRight size={16} />
      </div>
    </button>
  );
}

function ActivityItem({ icon, text, time }: any) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{text}</p>
        <p className="text-xs text-gray-400">{time}</p>
      </div>
    </div>
  );
}
