import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  User, Plus, PlusCircle, MapPin, Clock, ChevronRight, Shield, 
  Briefcase, Home, Settings, LogOut, CheckCircle, FileText,
  Send, Star, Search, Menu, X, Image, Video,
  MessageSquare, CreditCard, AlertCircle, Check, Eye,
  ArrowRight, Sparkles, Calendar, TrendingUp, ToggleLeft, ToggleRight, Loader2, Heart, Receipt, MoreVertical
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { NotificationBell } from '../components/NotificationBell';
import { SkeletonScreen } from '../components/SkeletonScreen';
import { supabase } from '../lib/supabase';

type TabId = 'home' | 'activity' | 'profile';

// Statuts simplifiés pour l'affichage
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: 'En attente', color: 'bg-blue-100 text-blue-700', icon: <Clock size={14} /> },
  quote_received: { label: 'Devis reçu', color: 'bg-purple-100 text-purple-700', icon: <FileText size={14} /> },
  quote_accepted: { label: 'Accepté', color: 'bg-green-100 text-green-700', icon: <Check size={14} /> },
  in_progress: { label: 'En cours', color: 'bg-brand-100 text-brand-700', icon: <TrendingUp size={14} /> },
  completed: { label: 'Terminé', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={14} /> },
  pending: { label: 'En attente', color: 'bg-blue-100 text-blue-700', icon: <Clock size={14} /> },
  accepted: { label: 'Accepté', color: 'bg-green-100 text-green-700', icon: <Check size={14} /> },
  expired: { label: 'Expiré', color: 'bg-gray-100 text-gray-500', icon: <Clock size={14} /> },
  cancelled: { label: 'Annulé', color: 'bg-gray-100 text-gray-500', icon: <X size={14} /> },
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
  const location = useLocation();
  const auth = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  
  // Vérifier si le profil est complet
  const isProfileComplete = (profile: any): boolean => {
    if (!profile) return false;
    const requiredFields = ['role', 'full_name', 'location'];
    const hasRequiredFields = requiredFields.every(
      field => profile[field] && profile[field].toString().trim().length > 0
    );
    if (!hasRequiredFields) return false;
    if (profile.role === 'artisan' && !profile.category_id) return false;
    return true;
  };
  
  // States - Déclarer hasRedirectedToOnboard AVANT le useEffect qui l'utilise
  const [hasRedirectedToOnboard, setHasRedirectedToOnboard] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [projects, setProjects] = useState<any[]>([]);
  const [myQuotes, setMyQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [artisanData, setArtisanData] = useState<any>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [quoteFilter, setQuoteFilter] = useState<string>('Tous'); // Pour filtrer les devis
  
  // Rediriger vers /onboard si profil incomplet
  useEffect(() => {
    if (auth.loading || profileLoading) return;
    if (hasRedirectedToOnboard) return; // Guard pour éviter les redirections multiples
    
    if (auth.user && profile && !isProfileComplete(profile)) {
      setHasRedirectedToOnboard(true);
      navigate('/onboard?mode=signup&step=profile', { replace: true });
    }
  }, [auth.user, auth.loading, profile, profileLoading, navigate, hasRedirectedToOnboard]);
  
  const { signOut } = auth;

  // Fetch data
  useEffect(() => {
    if (!profile) return;
    
    const fetchData = async () => {
      setLoading(true);
      
      if (profile.role === 'artisan') {
        // D'abord récupérer les données de l'artisan pour avoir sa catégorie
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

          // Récupérer UNIQUEMENT les projets de sa catégorie
          // Un artisan ne voit QUE les projets liés à sa catégorie
          const { data: openProjects } = await supabase
            .from('projects')
            .select('*, categories(*), profiles!projects_client_id_fkey(*)')
            .eq('category_id', artisan.category_id) // FILTRE CRITIQUE : uniquement sa catégorie
            .in('status', ['open', 'quote_received'])
            .order('created_at', { ascending: false })
            .limit(10);
          
          setProjects(openProjects || []);
        }
        
        // Récupérer TOUS les devis de l'artisan (historique complet)
        const { data: quotes } = await supabase
          .from('quotes')
          .select('*, projects(*, categories(*), profiles!projects_client_id_fkey(*))')
          .eq('artisan_id', profile.id)
          .order('created_at', { ascending: false });
        
        setMyQuotes(quotes || []);
      } else {
        // Récupérer les projets du client, exclure les projets annulés pour l'affichage principal
        const { data: clientProjects } = await supabase
          .from('projects')
          .select('*, categories(*), quotes(*)')
          .eq('client_id', profile.id)
          .neq('status', 'cancelled') // Exclure les projets annulés de la liste principale
          .order('created_at', { ascending: false });
        
        setProjects(clientProjects || []);
      }
      
      setLoading(false);
    };
    
    fetchData();
  }, [profile, location.pathname]); // Rafraîchir aussi quand on arrive sur la page

  const handleLogout = async () => {
    await signOut();
    navigate('/');
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
      <div className="min-h-screen bg-gray-50">
        <SkeletonScreen type="header" className="sticky top-0 z-30" />
        <div className="max-w-lg mx-auto px-5 py-6 space-y-4">
          <SkeletonScreen type="card" />
          <SkeletonScreen type="list" />
        </div>
      </div>
    );
  }

  const isArtisan = profile.role === 'artisan';
  const isVerified = verificationStatus === 'verified';
  const firstName = profile.full_name?.split(' ')[0] || 'Utilisateur';

  // Counts
  const urgentCount = isArtisan 
    ? myQuotes.filter(q => q.status === 'pending' && !q.is_read).length
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SkeletonScreen type="header" className="sticky top-0 z-30" />
        <div className="max-w-lg mx-auto px-5 py-6 space-y-4">
          <SkeletonScreen type="card" />
          <SkeletonScreen type="list" />
          <SkeletonScreen type="card" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ============== HEADER MODERNE AVEC ACTIONS VISIBLES ============== */}
      <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-gray-100">
        <div className="max-w-lg mx-auto px-5 py-3">
          {/* Ligne 1: Avatar + Salutation + Actions rapides */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveTab('profile')}
                className="relative"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 p-0.5 shadow-md">
                  <div className="w-full h-full rounded-xl bg-white flex items-center justify-center overflow-hidden">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={20} className="text-brand-500" />
                    )}
                  </div>
                </div>
                {isArtisan && isVerified && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-lg flex items-center justify-center border-2 border-white">
                    <Check size={8} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
              
              <div>
                <p className="text-base font-bold text-gray-900">
                  {getGreeting()}, {firstName}
                </p>
                <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                  {isArtisan ? (
                    <>
                      <Briefcase size={10} />
                      {categoryName || 'Artisan'}
                    </>
                  ) : (
                    <>
                      <MapPin size={10} />
                      {profile.location || 'Sénégal'}
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Actions rapides - Toujours visibles */}
            <div className="flex items-center gap-2">
              <NotificationBell />
              
              {/* Bouton Explorer */}
              <button 
                onClick={() => navigate('/artisans')}
                className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-brand-100 hover:text-brand-600 transition-all"
                aria-label="Explorer"
                title="Explorer les projets/artisans"
              >
                <Search size={18} />
              </button>

              {/* Bouton Paramètres/Profil - Dropdown simplifié */}
              <div className="relative">
                <button 
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all"
                  aria-label="Options"
                >
                  {showMenu ? <X size={18} /> : <Settings size={18} />}
                </button>
                
                {/* Menu simplifié - Seulement les actions importantes */}
                {showMenu && (
                  <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button 
                      onClick={() => { navigate('/edit-profile'); setShowMenu(false); }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors text-sm"
                    >
                      <User size={16} className="text-gray-400" />
                      <span className="font-medium text-gray-700">Mon profil</span>
                    </button>
                    {isArtisan && (
                      <button 
                        onClick={() => { navigate('/edit-profile?tab=portfolio'); setShowMenu(false); }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors text-sm"
                      >
                        <Image size={16} className="text-gray-400" />
                        <span className="font-medium text-gray-700">Portfolio</span>
                      </button>
                    )}
                    <div className="h-px bg-gray-100 my-1" />
                    <button 
                      onClick={() => { handleLogout(); setShowMenu(false); }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-red-50 transition-colors text-sm"
                    >
                      <LogOut size={16} className="text-red-500" />
                      <span className="font-medium text-red-500">Déconnexion</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ligne 2: Barre d'actions rapides - Actions principales seulement */}
          <div className="flex items-center gap-2">
            {/* Bouton Créer projet (pour clients) */}
            {!isArtisan && (
              <button
                onClick={() => navigate('/create-project')}
                className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl font-bold text-xs hover:bg-brand-600 transition-colors whitespace-nowrap flex-shrink-0 shadow-sm"
              >
                <PlusCircle size={16} />
                Nouveau projet
              </button>
            )}

            {/* Bouton Vérification (pour artisans non vérifiés) */}
            {isArtisan && verificationStatus === 'unverified' && (
              <button
                onClick={() => navigate('/verification')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors whitespace-nowrap flex-shrink-0 border border-blue-200"
              >
                <Shield size={16} />
                Se vérifier
              </button>
            )}

            {/* Bouton Portfolio (pour artisans) */}
            {isArtisan && (
              <button
                onClick={() => navigate('/edit-profile?tab=portfolio')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors whitespace-nowrap flex-shrink-0"
              >
                <Image size={16} />
                Portfolio
              </button>
            )}

            {/* Bouton Explorer (toujours visible) */}
            <button
              onClick={() => navigate('/artisans')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors whitespace-nowrap flex-shrink-0"
            >
              <Search size={16} />
              Explorer
            </button>

            {/* Menu "Plus" pour les actions secondaires */}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors whitespace-nowrap flex-shrink-0"
              >
                <MoreVertical size={16} />
                Plus
              </button>

              {/* Dropdown menu pour actions secondaires */}
              {showMoreMenu && (
                <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button 
                    onClick={() => { navigate('/favorites'); setShowMoreMenu(false); }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors text-sm"
                  >
                    <Heart size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-700">Favoris</span>
                  </button>
                  <button 
                    onClick={() => { navigate('/expenses'); setShowMoreMenu(false); }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors text-sm"
                  >
                    <Receipt size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-700">Dépenses</span>
                  </button>
                  <button 
                    onClick={() => { navigate('/invoices'); setShowMoreMenu(false); }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors text-sm"
                  >
                    <FileText size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-700">Factures</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overlay pour fermer les menus */}
        {(showMenu || showMoreMenu) && (
          <div 
            className="fixed inset-0 z-20" 
            onClick={() => {
              setShowMenu(false);
              setShowMoreMenu(false);
            }} 
          />
        )}
      </header>

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
                    {isArtisan ? 'Devis à consulter' : 'Devis à consulter'}
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
                    onClick={() => navigate('/artisans')}
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
                        onClick={() => {
                          // Forcer le scroll en haut avant la navigation
                          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                          document.documentElement.scrollTop = 0;
                          document.body.scrollTop = 0;
                          navigate(`/projects/${project.id}`);
                        }}
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
                          onClick={() => {
                          // Forcer le scroll en haut avant la navigation
                          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                          document.documentElement.scrollTop = 0;
                          document.body.scrollTop = 0;
                          navigate(`/projects/${project.id}`);
                        }}
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

          </div>
        )}

        {/* ============== ACTIVITY TAB ============== */}
        {activeTab === 'activity' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900">
                {isArtisan ? 'Mes devis' : 'Mes projets'}
              </h1>
              
              {/* Filtres par statut pour les artisans */}
              {isArtisan && myQuotes.length > 0 && (
                <div className="flex gap-2">
                  {['Tous', 'En attente', 'Acceptés', 'Refusés', 'Expirés'].map((filter) => (
                    <button
                      key={filter}
                      className="px-3 py-1 text-xs font-bold rounded-lg bg-gray-100 text-gray-600 hover:bg-brand-100 hover:text-brand-600 transition-colors"
                      onClick={() => {
                        // TODO: Implémenter le filtrage
                      }}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                <>
                  {/* Filtres */}
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                    {[
                      { key: 'Tous', label: 'Tous' },
                      { key: 'pending', label: 'En attente' },
                      { key: 'accepted', label: 'Acceptés' },
                      { key: 'rejected', label: 'Refusés' },
                      { key: 'expired', label: 'Expirés' },
                    ].map((filter) => (
                      <button
                        key={filter.key}
                        onClick={() => setQuoteFilter(filter.key)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                          quoteFilter === filter.key
                            ? 'bg-brand-500 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {filter.label}
                        {filter.key !== 'Tous' && (
                          <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded-full">
                            {myQuotes.filter(q => q.status === filter.key).length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {/* Liste des devis filtrés */}
                  <div className="space-y-3">
                    {myQuotes
                      .filter(quote => quoteFilter === 'Tous' || quote.status === quoteFilter)
                      .map((quote) => {
                    const status = STATUS_CONFIG[quote.status] || STATUS_CONFIG.pending;
                    return (
                      <button
                        key={quote.id}
                          onClick={() => {
                            // Forcer le scroll en haut avant la navigation
                            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                            document.documentElement.scrollTop = 0;
                            document.body.scrollTop = 0;
                            navigate(`/projects/${quote.project_id}`);
                          }}
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
                        {quote.status === 'rejected' && quote.rejection_reason && (
                          <div className="mb-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2">
                            <span className="text-xs font-bold text-red-700">❌ Refusé</span>
                            <span className="text-xs text-red-700 line-clamp-2 flex-1">
                              : {quote.rejection_reason}
                            </span>
                          </div>
                        )}
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
                    {myQuotes.filter(quote => quoteFilter === 'Tous' || quote.status === quoteFilter).length === 0 && (
                      <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                        <p className="text-gray-400 text-sm">Aucun devis pour ce filtre</p>
                      </div>
                    )}
                </div>
                </>
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
                <>
                  {/* Filtres pour client */}
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                    {[
                      { key: 'Tous', label: 'Tous' },
                      { key: 'open', label: 'Ouverts' },
                      { key: 'in_progress', label: 'En cours' },
                      { key: 'completed', label: 'Terminés' },
                      { key: 'expired', label: 'Expirés' },
                      { key: 'cancelled', label: 'Annulés' },
                    ].map((filter) => (
                      <button
                        key={filter.key}
                        onClick={() => setQuoteFilter(filter.key)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                          quoteFilter === filter.key
                            ? 'bg-brand-500 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {filter.label}
                        {filter.key !== 'Tous' && (
                          <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded-full">
                            {projects.filter(p => p.status === filter.key).length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {/* Liste des projets filtrés */}
                  <div className="space-y-3">
                    {projects
                      .filter(project => quoteFilter === 'Tous' || project.status === quoteFilter)
                      .map((project) => {
                    const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.open;
                    return (
                      <button
                        key={project.id}
                        onClick={() => {
                          // Forcer le scroll en haut avant la navigation
                          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                          document.documentElement.scrollTop = 0;
                          document.body.scrollTop = 0;
                          navigate(`/projects/${project.id}`);
                        }}
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
                    {projects.filter(project => quoteFilter === 'Tous' || project.status === quoteFilter).length === 0 && (
                      <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                        <p className="text-gray-400 text-sm">Aucun projet pour ce filtre</p>
                      </div>
                    )}
                </div>
                </>
              )
            )}
          </div>
        )}

        {/* ============== PROFILE TAB (SIMPLIFIÉ - Seulement info essentielles) ============== */}
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
                <div className="mt-6 space-y-4">
                  {/* Toggle disponibilité */}
                  <button 
                    onClick={toggleAvailability}
                    disabled={togglingAvailability}
                    className={`w-full flex items-center justify-between px-5 py-4 rounded-xl transition-all ${
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
                        <p className={`font-bold text-sm ${isAvailable ? 'text-green-700' : 'text-gray-600'}`}>
                          {isAvailable ? 'Disponible' : 'Indisponible'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {isAvailable ? 'Vous recevez les demandes' : 'Vous ne recevez pas de demandes'}
                        </p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                  </button>

                </div>
              )}
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

      {/* ============== BOTTOM NAVIGATION MODERNE ============== */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-30 safe-area-pb shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center justify-around">
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
                className={`relative flex flex-col items-center justify-center gap-1 py-2.5 px-4 min-w-[70px] rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'text-brand-600' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Indicateur de fond pour l'onglet actif */}
                {isActive && (
                  <div className="absolute inset-0 bg-brand-50 rounded-xl -z-10 animate-in fade-in duration-200" />
                )}
                
                {/* Icône avec effet de scale pour l'actif */}
                <div className={`relative ${isActive ? 'scale-110' : 'scale-100'} transition-transform duration-200`}>
                  <Icon 
                    size={22} 
                    strokeWidth={isActive ? 2.5 : 2} 
                    className={isActive ? 'text-brand-600' : 'text-gray-400'}
                  />
                  {/* Badge de notification */}
                  {tab.badge && tab.badge > 0 && (
                    <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full text-[10px] font-black text-white ${
                      isActive ? 'bg-brand-500' : 'bg-red-500'
                    } animate-pulse`}>
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </div>
                
                {/* Label avec animation */}
                <span className={`text-[11px] font-bold transition-all duration-200 ${
                  isActive 
                    ? 'text-brand-600 scale-105' 
                    : 'text-gray-400 scale-100'
                }`}>
                  {tab.label}
                </span>
                
                {/* Indicateur de position (ligne en bas) */}
                {isActive && (
                  <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-brand-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
