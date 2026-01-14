import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Plus, MapPin, Clock, ChevronRight, Shield, 
  Briefcase, Home, Settings, LogOut, CheckCircle, FileText,
  Send, RotateCcw, Star, Search, Menu, X, Image, Video,
  MessageSquare, CreditCard, AlertCircle, Check, Eye,
  ArrowRight, Sparkles, Calendar, TrendingUp, ToggleLeft, ToggleRight, Loader2, Heart
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { NotificationBell } from '../components/NotificationBell';
import { supabase } from '../lib/supabase';

type TabId = 'home' | 'activity' | 'profile';

// Statuts simplifiés pour l'affichage
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: 'En attente', color: 'bg-blue-100 text-blue-700', icon: <Clock size={14} /> },
  quote_received: { label: 'Devis reçu', color: 'bg-purple-100 text-purple-700', icon: <FileText size={14} /> },
  quote_accepted: { label: 'Accepté', color: 'bg-green-100 text-green-700', icon: <Check size={14} /> },
  in_progress: { label: 'En cours', color: 'bg-brand-100 text-brand-700', icon: <TrendingUp size={14} /> },
  completed: { label: 'Terminé', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={14} /> },
  revision_requested: { label: 'Révision', color: 'bg-yellow-100 text-yellow-700', icon: <RotateCcw size={14} /> },
  pending: { label: 'En attente', color: 'bg-blue-100 text-blue-700', icon: <Clock size={14} /> },
  accepted: { label: 'Accepté', color: 'bg-green-100 text-green-700', icon: <Check size={14} /> },
};

// Salutations selon l'heure
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
};

export function Dashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [projects, setProjects] = useState<any[]>([]);
  const [myQuotes, setMyQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [artisanData, setArtisanData] = useState<any>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  // Fetch data
  useEffect(() => {
    if (!profile) return;
    
    const fetchData = async () => {
      setLoading(true);
      
      if (profile.role === 'artisan') {
        const { data: openProjects } = await supabase
          .from('projects')
          .select('*, categories(*), profiles(*)')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(10);
        
        setProjects(openProjects || []);
        
        const { data: quotes } = await supabase
          .from('quotes')
          .select('*, projects(*, categories(*))')
          .eq('artisan_id', profile.id)
          .order('created_at', { ascending: false });
        
        setMyQuotes(quotes || []);
        
        const { data: artisan } = await supabase
          .from('artisans')
          .select('*, categories(*)')
          .eq('id', profile.id)
          .single();
        
        if (artisan) {
          setArtisanData(artisan);
          setVerificationStatus(artisan.verification_status || 'unverified');
          setCategoryName(artisan.categories?.name || null);
          setIsAvailable(artisan.is_available !== false);
        }
      } else {
        const { data: clientProjects } = await supabase
          .from('projects')
          .select('*, categories(*), quotes(*)')
          .eq('client_id', profile.id)
          .order('created_at', { ascending: false });
        
        setProjects(clientProjects || []);
      }
      
      setLoading(false);
    };
    
    fetchData();
  }, [profile]);

  const handleLogout = async () => {
    await signOut();
    navigate('/landing');
  };

  const toggleAvailability = async () => {
    if (!profile || togglingAvailability) return;
    
    setTogglingAvailability(true);
    const newStatus = !isAvailable;
    
    const { error } = await supabase
      .from('artisans')
      .update({ is_available: newStatus, updated_at: new Date().toISOString() })
      .eq('id', profile.id);
    
    if (!error) {
      setIsAvailable(newStatus);
    }
    setTogglingAvailability(false);
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isArtisan = profile.role === 'artisan';
  const isVerified = verificationStatus === 'verified';
  const firstName = profile.full_name?.split(' ')[0] || 'Utilisateur';

  // Counts
  const urgentCount = isArtisan 
    ? myQuotes.filter(q => q.status === 'revision_requested').length
    : projects.filter(p => p.quotes?.length > 0 && p.status === 'open').length;
  
  const activeCount = isArtisan
    ? myQuotes.filter(q => ['pending', 'accepted'].includes(q.status)).length
    : projects.filter(p => ['open', 'in_progress'].includes(p.status)).length;
    
  const completedCount = isArtisan
    ? myQuotes.filter(q => q.status === 'accepted').length
    : projects.filter(p => p.status === 'completed').length;

  // Recent activity (combined and sorted)
  const recentActivity = isArtisan
    ? myQuotes.slice(0, 5)
    : projects.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ============== HEADER SIMPLIFIÉ ============== */}
      <header className="bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          {/* Avatar + Salutation */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab('profile')}
              className="relative"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 p-0.5 shadow-lg shadow-brand-200/50">
                <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={22} className="text-brand-500" />
                  )}
                </div>
              </div>
              {isArtisan && isVerified && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-lg flex items-center justify-center border-2 border-white">
                  <Check size={10} className="text-white" strokeWidth={3} />
                </div>
              )}
            </button>
            
            <div>
              <p className="text-lg font-bold text-gray-900">
                {getGreeting()}, {firstName} 👋
              </p>
              <p className="text-sm text-gray-500 font-medium flex items-center gap-1">
                {isArtisan ? (
                  <>
                    <Briefcase size={12} />
                    {categoryName || 'Artisan'}
                  </>
                ) : (
                  <>
                    <MapPin size={12} />
                    {profile.location || 'Sénégal'}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              aria-label="Menu"
            >
              {showMenu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Menu déroulant */}
        {showMenu && (
          <div className="absolute right-4 top-16 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <button 
              onClick={() => { navigate('/edit-profile'); setShowMenu(false); }}
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
            >
              <User size={18} className="text-gray-400" />
              <span className="font-medium text-gray-700">Modifier profil</span>
            </button>
            {isArtisan && (
              <button 
                onClick={() => { navigate('/edit-profile?tab=portfolio'); setShowMenu(false); }}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
              >
                <Image size={18} className="text-gray-400" />
                <span className="font-medium text-gray-700">Mon portfolio</span>
              </button>
            )}
            <button 
              onClick={() => { navigate('/landing'); setShowMenu(false); }}
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
            >
              <Search size={18} className="text-gray-400" />
              <span className="font-medium text-gray-700">Explorer</span>
            </button>
            <div className="h-px bg-gray-100 my-2" />
            <button 
              onClick={() => { handleLogout(); setShowMenu(false); }}
              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} className="text-red-500" />
              <span className="font-medium text-red-500">Déconnexion</span>
            </button>
          </div>
        )}
      </header>

      {/* Overlay pour fermer le menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-20" 
          onClick={() => setShowMenu(false)} 
        />
      )}

      {/* ============== MAIN CONTENT ============== */}
      <main className="max-w-lg mx-auto px-5 py-6 pb-32">
        
        {/* ============== HOME TAB ============== */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Alerte urgente (si applicable) */}
            {urgentCount > 0 && (
              <button 
                onClick={() => setActiveTab('activity')}
                className="w-full bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={24} className="text-yellow-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-gray-900">
                    {urgentCount} action{urgentCount > 1 ? 's' : ''} en attente
                  </p>
                  <p className="text-sm text-gray-500">
                    {isArtisan ? 'Révisions demandées' : 'Devis à consulter'}
                  </p>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>
            )}

            {/* Alerte vérification (artisans non vérifiés) */}
            {isArtisan && verificationStatus === 'unverified' && (
              <button 
                onClick={() => navigate('/verification')}
                className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield size={24} className="text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-gray-900">Faites-vous certifier</p>
                  <p className="text-sm text-gray-500">Gagnez en confiance et avantages</p>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>
            )}

            {/* Stats essentielles (2 maximum) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                    {isArtisan ? <Send size={18} className="text-brand-600" /> : <Briefcase size={18} className="text-brand-600" />}
                  </div>
                </div>
                <p className="text-3xl font-black text-gray-900">{activeCount}</p>
                <p className="text-sm font-medium text-gray-500">
                  {isArtisan ? 'Devis actifs' : 'Projets en cours'}
                </p>
              </div>
              
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle size={18} className="text-green-600" />
                  </div>
                </div>
                <p className="text-3xl font-black text-gray-900">{completedCount}</p>
                <p className="text-sm font-medium text-gray-500">
                  {isArtisan ? 'Acceptés' : 'Terminés'}
                </p>
              </div>
            </div>

            {/* Section principale selon le rôle */}
            {isArtisan ? (
              /* ===== ARTISAN: Projets disponibles ===== */
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Projets disponibles</h2>
                  <button 
                    onClick={() => navigate('/landing')}
                    className="text-sm text-brand-500 font-bold flex items-center gap-1"
                  >
                    Voir plus
                    <ArrowRight size={14} />
                  </button>
                </div>
                
                {loading ? (
                  <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                    <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Briefcase size={28} className="text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">Aucun projet pour l'instant</p>
                    <p className="text-sm text-gray-400 mt-1">Revenez bientôt !</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projects.slice(0, 3).map((project) => (
                      <button
                        key={project.id}
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="w-full bg-white rounded-2xl p-4 border border-gray-100 text-left hover:border-brand-200 hover:shadow-md transition-all active:scale-[0.99]"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className="px-3 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg">
                            {project.categories?.name}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">
                            {new Date(project.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">{project.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {project.location || 'Sénégal'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ) : (
              /* ===== CLIENT: Mes projets ===== */
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Mes projets</h2>
                  {projects.length > 0 && (
                    <button 
                      onClick={() => setActiveTab('activity')}
                      className="text-sm text-brand-500 font-bold flex items-center gap-1"
                    >
                      Tout voir
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
                
                {loading ? (
                  <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                    <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                    <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Sparkles size={28} className="text-brand-500" />
                    </div>
                    <p className="text-gray-900 font-bold mb-1">Créez votre premier projet</p>
                    <p className="text-sm text-gray-500">Trouvez l'artisan parfait</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projects.slice(0, 3).map((project) => {
                      const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.open;
                      const hasQuotes = project.quotes?.length > 0;
                      
                      return (
                        <button
                          key={project.id}
                          onClick={() => navigate(`/projects/${project.id}`)}
                          className="w-full bg-white rounded-2xl p-4 border border-gray-100 text-left hover:border-brand-200 hover:shadow-md transition-all active:scale-[0.99]"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <span className="px-3 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg">
                              {project.categories?.name}
                            </span>
                            <span className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${status.color}`}>
                              {status.icon}
                              {status.label}
                            </span>
                          </div>
                          <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">{project.title}</h3>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 flex items-center gap-1">
                              <Calendar size={14} />
                              {new Date(project.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                            {hasQuotes && (
                              <span className="text-purple-600 font-bold flex items-center gap-1">
                                <FileText size={14} />
                                {project.quotes.length} devis
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Lien vers exploration */}
            <button
              onClick={() => navigate('/landing')}
              className="w-full bg-gray-100 hover:bg-gray-200 rounded-2xl p-4 flex items-center gap-4 transition-colors active:scale-[0.99]"
            >
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <Search size={22} className="text-gray-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-gray-900">Explorer les artisans</p>
                <p className="text-sm text-gray-500">Parcourir tous les profils</p>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>
        )}

        {/* ============== ACTIVITY TAB ============== */}
        {activeTab === 'activity' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h1 className="text-xl font-bold text-gray-900">
              {isArtisan ? 'Mes devis' : 'Mes projets'}
            </h1>

            {isArtisan ? (
              /* Artisan: Liste des devis */
              myQuotes.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Send size={28} className="text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">Aucun devis envoyé</p>
                  <p className="text-sm text-gray-400 mt-1">Consultez les projets disponibles</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myQuotes.map((quote) => {
                    const status = STATUS_CONFIG[quote.status] || STATUS_CONFIG.pending;
                    return (
                      <button
                        key={quote.id}
                        onClick={() => navigate(`/projects/${quote.project_id}`)}
                        className="w-full bg-white rounded-2xl p-4 border border-gray-100 text-left hover:border-brand-200 hover:shadow-md transition-all active:scale-[0.99]"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded">
                            {quote.quote_number}
                          </span>
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2">{quote.projects?.title}</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-black text-brand-600">
                            {quote.amount?.toLocaleString('fr-FR')} FCFA
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(quote.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              /* Client: Liste des projets */
              projects.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Briefcase size={28} className="text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">Aucun projet</p>
                  <p className="text-sm text-gray-400 mt-1">Créez votre premier projet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => {
                    const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.open;
                    return (
                      <button
                        key={project.id}
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="w-full bg-white rounded-2xl p-4 border border-gray-100 text-left hover:border-brand-200 hover:shadow-md transition-all active:scale-[0.99]"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded">
                            {project.project_number}
                          </span>
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2">{project.title}</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin size={14} />
                            {project.location || 'Sénégal'}
                          </span>
                          {project.quotes?.length > 0 && (
                            <span className="text-sm text-purple-600 font-bold">
                              {project.quotes.length} devis
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}

        {/* ============== PROFILE TAB ============== */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Profile Card */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center">
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 p-1 shadow-lg shadow-brand-200/50">
                  <div className="w-full h-full rounded-3xl bg-white flex items-center justify-center overflow-hidden">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} className="text-brand-500" />
                    )}
                  </div>
                </div>
                {isArtisan && isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center border-3 border-white shadow-lg">
                    <Check size={16} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
              
              <h2 className="text-xl font-black text-gray-900 mb-1">{profile.full_name}</h2>
              <p className="text-brand-600 font-bold mb-1">
                {isArtisan ? categoryName || 'Artisan' : 'Client'}
              </p>
              <p className="text-sm text-gray-400 flex items-center justify-center gap-1">
                <MapPin size={14} />
                {profile.location || 'Sénégal'}
              </p>
              
              {profile.member_id && (
                <div className="mt-4 inline-block px-4 py-2 bg-gray-100 rounded-xl">
                  <span className="text-xs font-mono text-gray-500">{profile.member_id}</span>
                </div>
              )}
              
              {isArtisan && (
                <div className="mt-4 space-y-3">
                  {/* Toggle disponibilité */}
                  <button 
                    onClick={toggleAvailability}
                    disabled={togglingAvailability}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                      isAvailable 
                        ? 'bg-green-50 border-2 border-green-200' 
                        : 'bg-gray-100 border-2 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {togglingAvailability ? (
                        <Loader2 size={20} className="animate-spin text-gray-500" />
                      ) : isAvailable ? (
                        <ToggleRight size={28} className="text-green-500" />
                      ) : (
                        <ToggleLeft size={28} className="text-gray-400" />
                      )}
                      <div className="text-left">
                        <p className={`font-bold ${isAvailable ? 'text-green-700' : 'text-gray-600'}`}>
                          {isAvailable ? 'Disponible' : 'Indisponible'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {isAvailable ? 'Vous recevez les demandes' : 'Vous ne recevez pas de demandes'}
                        </p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                  </button>

                  {/* Badge certifié */}
                  <div className="flex justify-center gap-2">
                    {isVerified ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-bold">
                        <Shield size={16} />
                        Certifié
                      </span>
                    ) : (
                      <button 
                        onClick={() => navigate('/verification')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-xl text-sm font-bold hover:bg-yellow-100 transition-colors"
                      >
                        <Shield size={16} />
                        Se faire certifier
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Portfolio Preview (Artisans only) */}
            {isArtisan && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <button 
                  onClick={() => navigate('/edit-profile?tab=portfolio')}
                  className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
                    <Image size={22} className="text-brand-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">Mon portfolio</p>
                    <p className="text-sm text-gray-500">
                      {artisanData?.portfolio_urls?.length || 0} photos · {artisanData?.video_urls?.length || 0} vidéos
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </button>
              </div>
            )}

            {/* Actions rapides */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
              <button 
                onClick={() => navigate('/edit-profile')}
                className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <User size={22} className="text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">Modifier mon profil</p>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>
              
              {!isArtisan && (
                <button 
                  onClick={() => navigate('/favorites')}
                  className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <Heart size={22} className="text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">Mes favoris</p>
                    <p className="text-xs text-gray-400">Artisans sauvegardés</p>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </button>
              )}
              
              <button 
                onClick={() => navigate('/landing')}
                className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Search size={22} className="text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">Explorer les artisans</p>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>
              
              <button 
                onClick={handleLogout}
                className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-red-50 transition-colors"
              >
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <LogOut size={22} className="text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-red-500">Déconnexion</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ============== FAB (Floating Action Button) ============== */}
      {!isArtisan && activeTab !== 'profile' && (
        <button
          onClick={() => navigate('/create-project')}
          className="fixed bottom-24 right-5 w-16 h-16 bg-brand-500 rounded-2xl shadow-2xl shadow-brand-500/40 flex items-center justify-center text-white hover:bg-brand-600 active:scale-95 transition-all z-20"
          aria-label="Nouveau projet"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      )}

      {/* ============== BOTTOM NAVIGATION (3 tabs) ============== */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 safe-area-pb">
        <div className="max-w-lg mx-auto px-8 py-3 flex items-center justify-around">
          {[
            { id: 'home' as TabId, icon: Home, label: 'Accueil' },
            { id: 'activity' as TabId, icon: isArtisan ? Send : Briefcase, label: isArtisan ? 'Devis' : 'Projets', badge: urgentCount },
            { id: 'profile' as TabId, icon: User, label: 'Profil' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center py-2 px-6 rounded-2xl transition-all ${
                  isActive 
                    ? 'text-brand-600 bg-brand-50' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-xs font-bold mt-1 ${isActive ? 'text-brand-600' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1 right-3 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
