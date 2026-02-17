import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  User, Plus, PlusCircle, MapPin, Clock, ChevronRight, Shield, 
  Briefcase, Home, Settings, LogOut, CheckCircle, FileText,
  Send, Star, Search, Menu, X, Image, Video,
  MessageSquare, CreditCard, AlertCircle, Check, Eye,
  ArrowRight, Sparkles, Calendar, TrendingUp, ToggleLeft, ToggleRight, Loader2, Receipt, Wallet, Megaphone, Award, Bell
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useNotifications } from '../hooks/useNotifications';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { supabase } from '../lib/supabase';
import { NotificationBell } from '../components/NotificationBell';

type TabId = 'home' | 'activity' | 'profile';

// Statuts projet et devis pour l'affichage (cohérence liste / détail)
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: 'En attente', color: 'bg-blue-100 text-blue-700', icon: <Clock size={14} /> },
  quote_received: { label: 'Devis reçu', color: 'bg-purple-100 text-purple-700', icon: <FileText size={14} /> },
  quote_accepted: { label: 'Accepté', color: 'bg-green-100 text-green-700', icon: <Check size={14} /> },
  payment_pending: { label: 'Paiement en attente', color: 'bg-amber-100 text-amber-700', icon: <CreditCard size={14} /> },
  in_progress: { label: 'En cours', color: 'bg-brand-100 text-brand-700', icon: <TrendingUp size={14} /> },
  completion_requested: { label: 'À finaliser', color: 'bg-orange-100 text-orange-700', icon: <CheckCircle size={14} /> },
  completed: { label: 'Terminé', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={14} /> },
  pending: { label: 'En attente', color: 'bg-blue-100 text-blue-700', icon: <Clock size={14} /> },
  accepted: { label: 'Accepté', color: 'bg-green-100 text-green-700', icon: <Check size={14} /> },
  rejected: { label: 'Refusé', color: 'bg-red-100 text-red-700', icon: <X size={14} /> },
  expired: { label: 'Expiré', color: 'bg-gray-100 text-gray-500', icon: <Clock size={14} /> },
  cancelled: { label: 'Annulé', color: 'bg-gray-100 text-gray-500', icon: <X size={14} /> },
  abandoned: { label: 'Clôturé', color: 'bg-gray-100 text-gray-500', icon: <X size={14} /> },
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
  const { profile, loading: profileLoading, upsertProfile } = useProfile();
  const { unreadMessageCount } = useNotifications();
  
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

  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [projects, setProjects] = useState<any[]>([]);
  const [myQuotes, setMyQuotes] = useState<any[]>([]);
  const [quoteRevisions, setQuoteRevisions] = useState<any[]>([]);
  const [quoteRevisionsResponded, setQuoteRevisionsResponded] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [artisanData, setArtisanData] = useState<any>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [initializingProfile, setInitializingProfile] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [activityFilter, setActivityFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [activitySubTab, setActivitySubTab] = useState<'demandes' | 'devis' | 'revisions_attente' | 'revisions_envoyees'>('demandes');
  
  const { signOut } = auth;

  // Si l'utilisateur est un admin, le Dashboard ne doit pas s'afficher :
  // on le redirige automatiquement vers le panel admin.
  useEffect(() => {
    if (profileLoading) return;
    if (profile?.role === 'admin') {
      // Éviter les boucles : ne rediriger que si on est bien sur /dashboard
      if (location.pathname === '/dashboard') {
        navigate('/admin', { replace: true });
      }
    }
  }, [profileLoading, profile?.role, location.pathname, navigate]);

  // Initialiser ou corriger le rôle du profil si l'utilisateur vient de s'inscrire via Google.
  // IMPORTANT : Pour les artisans en signup, on redirige vers edit-profile au lieu de créer le profil ici
  // pour qu'ils choisissent leur catégorie/métier AVANT de créer le profil
  useEffect(() => {
    if (initializingProfile) return;
    // Vérifier que l'authentification est complète avant de continuer
    // IMPORTANT : Vérifier auth.loading EN PREMIER et aussi s'assurer que auth.user est vraiment disponible
    if (auth.loading || !auth.user || profileLoading) return;
    if (!auth.session) return; // Vérifier aussi que la session existe

    const searchParams = new URLSearchParams(location.search);
    const modeFromUrl = searchParams.get('mode');
    const roleFromUrl = searchParams.get('role');
    
    // Si on est en signup avec role=artisan, rediriger vers edit-profile
    // pour qu'ils choisissent leur catégorie/métier AVANT de créer le profil
    if (modeFromUrl === 'signup' && roleFromUrl === 'artisan') {
      const profileParams = new URLSearchParams();
      profileParams.set('mode', 'onboarding');
      profileParams.set('role', 'artisan');
      console.log('[Dashboard] Redirection artisan signup vers edit-profile');
      navigate(`/edit-profile?${profileParams.toString()}`, { replace: true });
      return;
    }
    
    if (roleFromUrl !== 'client' && roleFromUrl !== 'artisan') {
      return;
    }

    const defaultName =
      profile?.full_name ||
      (auth.user.user_metadata?.full_name as string | undefined) ||
      (auth.user.user_metadata?.name as string | undefined) ||
      auth.user.email ||
      'Utilisateur';

    // Si le profil existe déjà avec le bon rôle, ne rien faire.
    if (profile && profile.role === roleFromUrl) {
      return;
    }

    // Capture de auth.user dans une variable locale pour éviter les problèmes de timing
    const currentUser = auth.user;
    if (!currentUser) {
      console.error('[Dashboard] auth.user est null, impossible de créer/mettre à jour le profil');
      setInitializingProfile(false);
      return;
    }

    setInitializingProfile(true);

    // Construire les valeurs existantes si on bascule de client vers artisan ou inversement.
    const fullNameToUse = profile?.full_name || defaultName;

    // Utiliser une fonction asynchrone pour capturer auth.user de manière stable
    const initializeProfileAsync = async () => {
      // Attendre un peu pour s'assurer que auth.user est bien synchronisé
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Vérifier une dernière fois que l'utilisateur est toujours authentifié
      if (!auth.user) {
        console.error('[Dashboard] auth.user est devenu null pendant l\'initialisation');
        setInitializingProfile(false);
        return;
      }

      try {
        await upsertProfile({
      full_name: fullNameToUse,
      role: roleFromUrl,
      phone: profile?.phone ?? null,
      location: profile?.location ?? null,
      company_name: profile?.company_name ?? null,
      region: profile?.region ?? null,
      department: profile?.department ?? null,
      commune: profile?.commune ?? null,
      category_id: profile?.category_id ?? undefined,
          bio: profile?.bio ?? undefined,
          specialty: profile?.specialty ?? undefined,
        });
      } catch (e) {
        console.error('Erreur lors de l\'initialisation/mise à jour du profil:', e);
      } finally {
        setInitializingProfile(false);
      }
    };

    initializeProfileAsync();
  }, [auth.loading, auth.user?.id, profile?.id, profile?.role, profileLoading, location.search, initializingProfile, upsertProfile, profile, navigate]);

  // Fetch data
  useEffect(() => {
    if (!profile) return;
    
    const fetchData = async () => {
      setLoading(true);
      
      if (profile.role === 'artisan') {
        // Charger le solde de crédits de l'artisan
        try {
          const { data: wallet } = await supabase
            .from('artisan_credit_wallets')
            .select('balance')
            .eq('artisan_id', profile.id)
            .maybeSingle();
          setCreditBalance(wallet?.balance ?? 0);
        } catch (e) {
          console.error('Error fetching artisan credit wallet:', e);
          setCreditBalance(null);
        }
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

        // Récupérer les demandes de révision (en attente + déjà répondues) pour les devis de l'artisan
        if (quotes && quotes.length > 0) {
          const quoteIds = quotes.map(q => q.id);
          const { data: revisions } = await supabase
            .from('quote_revisions')
            .select(`
              *,
              quotes!quote_revisions_quote_id_fkey(*),
              projects!quote_revisions_project_id_fkey(id, title),
              profiles!quote_revisions_requested_by_fkey(id, full_name, avatar_url)
            `)
            .in('quote_id', quoteIds)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
          setQuoteRevisions(revisions || []);

          const { data: respondedRevisions } = await supabase
            .from('quote_revisions')
            .select(`
              *,
              quotes!quote_revisions_quote_id_fkey(*),
              projects!quote_revisions_project_id_fkey(id, title),
              profiles!quote_revisions_requested_by_fkey(id, full_name, avatar_url)
            `)
            .in('quote_id', quoteIds)
            .neq('status', 'pending')
            .order('responded_at', { ascending: false });
          setQuoteRevisionsResponded(respondedRevisions || []);
        }
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

  // Scroll en haut à chaque changement d'onglet
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab]);

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

  const isArtisan = profile?.role === 'artisan';
  const rawName = profile?.full_name || (auth.user?.user_metadata?.full_name as string) || (auth.user?.user_metadata?.name as string) || '';
  const firstName = rawName.trim().split(/\s+/)[0] || auth.user?.email?.split('@')[0] || 'Utilisateur';
  const isVerified = verificationStatus === 'verified';
  const needsProfileCompletion = profile ? !isProfileComplete(profile) : false;

  const filteredProjects = useMemo(() => {
    if (activityFilter === 'active') {
      return projects.filter(p =>
        ['open', 'quote_received', 'quote_accepted', 'payment_pending', 'payment_received', 'in_progress', 'completion_requested'].includes(p.status)
      );
    }
    if (activityFilter === 'completed') return projects.filter(p => p.status === 'completed');
    return projects;
  }, [projects, activityFilter]);

  const filteredMyQuotes = useMemo(() => {
    if (activityFilter === 'active') return myQuotes.filter(q => q.projects?.status !== 'completed' && q.projects?.status !== 'expired' && q.projects?.status !== 'cancelled');
    if (activityFilter === 'completed') return myQuotes.filter(q => q.projects?.status === 'completed');
    return myQuotes;
  }, [myQuotes, activityFilter]);

  // Nouvelles demandes (projets ouverts dans sa catégorie auxquels l'artisan n'a pas encore répondu)
  const newRequestProjects = useMemo(() => {
    if (!isArtisan) return [];
    const quotedProjectIds = new Set(myQuotes.map(q => q.project_id));
    return projects.filter(p => p.status === 'open' && !quotedProjectIds.has(p.id));
  }, [isArtisan, projects, myQuotes]);

  if (!profile) {
    // Si le profil est encore en chargement, afficher l'overlay de chargement validé
    if (profileLoading) {
      return <LoadingOverlay />;
    }

    // Utilisateur connecté mais sans ligne de profil encore créée :
    // on affiche un écran très simple qui pousse vers la création de profil.
    const firstNameFallback =
      auth.user?.user_metadata?.full_name?.split(' ')[0] ||
      auth.user?.user_metadata?.name?.split(' ')[0] ||
      'Utilisateur';

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-gray-100">
          <div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
            <div>
              <p className="text-base font-bold text-gray-900">
                {getGreeting()}, {firstNameFallback}
              </p>
              <p className="text-xs text-gray-500 font-medium">
                Bienvenue sur Mbouraké
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-lg mx-auto px-5 py-10 flex items-center">
          <div className="w-full space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-center">
              <h1 className="text-xl font-black text-gray-900 mb-2">
                Complétez votre profil pour commencer
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                Nous avons bien créé votre compte. Ajoutez maintenant quelques informations
                de base pour accéder à toutes les fonctionnalités.
              </p>
              <button
                onClick={() => navigate('/edit-profile?mode=onboarding')}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 text-white font-black py-3 shadow-cta hover:shadow-cta-hover hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-cta-active transition-all duration-200 text-sm"
              >
                <User size={18} />
                Compléter mon profil
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Counts
  const urgentCount = isArtisan 
    ? myQuotes.filter(q => q.status === 'pending' && !q.is_read).length
    : projects.filter(p => p.quotes?.length > 0 && p.status === 'open').length;
  
  // Comptes basés sur le statut du projet (cohérence avec l'affichage liste)
  const activeCount = isArtisan
    ? myQuotes.filter(q => {
        const ps = q.projects?.status;
        return ps !== 'completed' && ps !== 'expired' && ps !== 'cancelled' && ['pending', 'accepted'].includes(q.status);
      }).length
    : projects.filter(p =>
        ['open', 'quote_received', 'quote_accepted', 'payment_pending', 'payment_received', 'in_progress', 'completion_requested'].includes(p.status)
      ).length;
    
  const completedCount = isArtisan
    ? myQuotes.filter(q => q.projects?.status === 'completed').length
    : projects.filter(p => p.status === 'completed').length;

  // Recent activity (combined and sorted)
  const recentActivity = isArtisan
    ? myQuotes.slice(0, 5)
    : projects.slice(0, 5);

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* ============== HEADER MODERNISÉ SIMPLIFIÉ ============== */}
      <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-30 shadow-sm border-b border-gray-100/50">
        <div className="max-w-lg mx-auto px-5 py-4">
          {/* Ligne unique: Avatar agrandi + Salutation + Actions rapides */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  if (isArtisan && profile?.id) {
                    navigate(`/artisans/${profile.id}?focus=portfolio`);
                  } else {
                    setActiveTab('profile');
                  }
                }}
                className="relative"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 p-0.5 shadow-lg shadow-brand-200/50">
                  <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center overflow-hidden">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={24} className="text-brand-500" />
                    )}
                  </div>
                </div>
                {isArtisan && isVerified && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-green-500 rounded-xl flex items-center justify-center border-2 border-white shadow-md">
                    <Check size={10} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
              
              <div>
                <p className="text-lg font-black text-gray-900">
                  {getGreeting()}, {firstName}
                </p>
                <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5 mt-0.5">
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

            {/* Actions rapides - Toujours visibles - Mobile-first (min 44px) */}
            <div className="flex items-center gap-2">
              {!isArtisan && (
                <button
                  onClick={() => navigate('/create-project')}
                  className="text-sm font-bold text-brand-600 hover:text-brand-700 flex items-center justify-center gap-1.5 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-0 rounded-lg sm:rounded-none active:bg-brand-50/80 sm:active:bg-transparent"
                  aria-label="Nouveau projet"
                >
                  <PlusCircle size={20} className="flex-shrink-0" />
                  <span className="hidden sm:inline">Nouveau projet</span>
                </button>
              )}
              
              {/* Cloche notifications (même emplacement que le repo d'origine) */}
              <NotificationBell />

              {/* Bouton Paramètres/Profil - Agrandi pour mobile-first */}
              <div className="relative">
                <button 
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 active:scale-95 transition-all shadow-sm"
                  aria-label="Options"
                >
                  {showMenu ? <X size={22} /> : <Settings size={22} />}
                </button>
                
                {/* Menu simplifié - Portfolio + Modifier profil (artisan) ou Mon profil (client) */}
                {showMenu && (
                  <div className="absolute right-0 top-14 w-52 bg-white/90 backdrop-blur-xl rounded-2xl shadow-glass-hover border border-white/60 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {isArtisan ? (
                      <>
                        <button 
                          onClick={() => { navigate(`/artisans/${profile.id}?focus=portfolio`); setShowMenu(false); }}
                          className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                          <Image size={18} className="text-gray-400" />
                          <span className="font-medium text-gray-700">Mon portfolio</span>
                        </button>
                    <button 
                      onClick={() => { navigate('/edit-profile'); setShowMenu(false); }}
                      className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      <User size={18} className="text-gray-400" />
                          <span className="font-medium text-gray-700">Modifier mon profil</span>
                    </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => { navigate('/edit-profile'); setShowMenu(false); }}
                        className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors text-sm font-medium"
                      >
                        <User size={18} className="text-gray-400" />
                        <span className="font-medium text-gray-700">Mon profil</span>
                      </button>
                    )}
                    <div className="h-px bg-gray-100 my-1" />
                    <button 
                      onClick={() => { handleLogout(); setShowMenu(false); }}
                      className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-red-50 transition-colors text-sm font-medium"
                    >
                      <LogOut size={18} className="text-red-500" />
                      <span className="font-medium text-red-500">Déconnexion</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Overlay pour fermer les menus */}
        {showMenu && (
          <div 
            className="fixed inset-0 z-20" 
            onClick={() => {
              setShowMenu(false);
            }} 
          />
        )}
      </header>

      {/* ============== MAIN CONTENT ============== */}
      <main className="max-w-lg mx-auto px-5 py-6 pb-32">
        
        {/* ============== HOME TAB ============== */}
        {activeTab === 'home' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            
            {/* Alertes simplifiées - Design minimaliste */}
            {needsProfileCompletion && (
              <button
                onClick={() => navigate('/edit-profile?mode=onboarding')}
                className="w-full bg-white/85 backdrop-blur-xl border border-white/60 rounded-xl p-3 flex items-center gap-3 shadow-glass hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99] border-brand-200/80"
              >
                <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-brand-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-gray-900 text-sm">Complétez votre profil</p>
                </div>
                <ChevronRight size={14} className="text-gray-400" />
              </button>
            )}
            
            {isArtisan && !needsProfileCompletion && (verificationStatus === 'unverified' || (creditBalance !== null && creditBalance < 20)) && (() => {
              const showCertif = verificationStatus === 'unverified';
              const showCredits = creditBalance !== null && creditBalance < 20;
              const both = showCertif && showCredits;
              return (
                <div className="grid grid-cols-2 gap-3">
                  {showCertif && (
              <button 
                      type="button"
                onClick={() => navigate('/verification')}
                      className={`bg-white/85 backdrop-blur-xl border border-white/60 rounded-xl p-3 flex items-center gap-3 shadow-glass hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99] text-left min-h-[72px] border-brand-200/80 ${!both ? 'col-span-2' : ''}`}
              >
                      <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Shield size={16} className="text-brand-600" />
                </div>
                      <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">Faites-vous certifier</p>
                </div>
                      <ChevronRight size={14} className="text-brand-500 flex-shrink-0" />
              </button>
            )}
                  {showCredits && (
              <button
                      type="button"
                onClick={() => navigate('/credits')}
                      className={`bg-white/85 backdrop-blur-xl border border-white/60 rounded-xl p-3 flex items-center gap-3 shadow-glass hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99] text-left min-h-[72px] border-brand-200/80 ${!both ? 'col-span-2' : ''}`}
              >
                      <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CreditCard size={16} className="text-brand-600" />
                </div>
                      <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">
                    {creditBalance} crédit{creditBalance > 1 ? 's' : ''} restant{creditBalance > 1 ? 's' : ''}
                  </p>
                </div>
                      <ChevronRight size={14} className="text-brand-500 flex-shrink-0" />
              </button>
            )}
                </div>
              );
            })()}

            {/* Finances & Dépenses (dashboard) */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate('/invoices')}
                className="bg-white/85 backdrop-blur-xl rounded-2xl p-4 border border-white/60 shadow-glass hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99] text-left min-h-[92px]"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                  <FileText size={18} className="text-brand-600" />
                </div>
                <p className="text-sm font-black text-gray-900">Finances</p>
                <p className="text-xs text-gray-500 mt-0.5">Factures</p>
              </button>
              <button
                type="button"
                onClick={() => navigate('/expenses')}
                className="bg-white/85 backdrop-blur-xl rounded-2xl p-4 border border-white/60 shadow-glass hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99] text-left min-h-[92px]"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
                  <Receipt size={18} className="text-gray-600" />
                </div>
                <p className="text-sm font-black text-gray-900">Dépenses</p>
                <p className="text-xs text-gray-500 mt-0.5">Suivi</p>
              </button>
            </div>

            {/* Stats simplifiées - Design minimaliste */}
            {(activeCount > 0 || completedCount > 0) && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab('activity')}
                  className="bg-white/85 backdrop-blur-xl rounded-xl p-4 border border-white/60 shadow-glass hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99] text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
                      {isArtisan ? <Send size={16} className="text-brand-600" /> : <Briefcase size={16} className="text-brand-600" />}
                    </div>
                  </div>
                  <p className="text-2xl font-black text-gray-900 mb-1">{activeCount}</p>
                  <p className="text-xs font-medium text-gray-600">
                    {isArtisan ? 'Projets en cours' : 'En cours'}
                  </p>
                </button>
                
                <button
                  onClick={() => setActiveTab('activity')}
                  className="bg-white/85 backdrop-blur-xl rounded-xl p-4 border border-white/60 shadow-glass hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99] text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle size={16} className="text-green-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-gray-900 mb-1">{completedCount}</p>
                  <p className="text-xs font-medium text-gray-600">
                    {isArtisan ? 'Projets terminés' : 'Terminés'}
                  </p>
                </button>
              </div>
            )}

            {/* Section principale selon le rôle - Simplifiée */}
            {!isArtisan && (
              /* ===== CLIENT: Mes projets ===== */
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black text-gray-900">Mes projets</h2>
                  {projects.length > 3 && (
                    <button 
                      onClick={() => setActiveTab('activity')}
                      className="text-sm text-brand-500 font-bold flex items-center gap-1.5 min-h-[32px] px-2"
                    >
                      Tout voir
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
                
                {projects.length === 0 ? (
                  <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-10 text-center border border-white/60 shadow-glass">
                    <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Sparkles size={28} className="text-brand-500" />
                    </div>
                    <p className="text-gray-900 font-bold mb-1 text-base">Créez votre premier projet</p>
                    <p className="text-sm text-gray-500">Trouvez l'artisan parfait</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projects.slice(0, 3).map((project, index) => {
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
                          className="w-full bg-white/85 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-glass hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99] text-left min-h-[120px]"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <span className="px-3 py-1.5 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg">
                              {project.categories?.name}
                            </span>
                            <span className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${status.color}`}>
                              {status.icon}
                              {status.label}
                            </span>
                          </div>
                          <h3 className="font-bold text-gray-900 mb-3 line-clamp-2 text-base leading-tight">{project.title}</h3>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 flex items-center gap-1.5">
                              <Calendar size={16} />
                              {new Date(project.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                            {hasQuotes && (
                              <span className="text-purple-600 font-bold flex items-center gap-1.5">
                                <FileText size={16} />
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

        {/* ============== ACTIVITY TAB — Projets (devis = partie du projet) ============== */}
        {activeTab === 'activity' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">
                {isArtisan ? 'Projets' : 'Mes projets'}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {isArtisan ? 'Projets sur lesquels vous avez répondu' : 'Vos projets et les devis reçus'}
              </p>
            </div>

            {/* Artisan: sous-pages Projets (Nouvelles demandes | Mes devis | Révisions) */}
            {isArtisan ? (
              <>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 scrollbar-hide">
                  {([
                    { id: 'demandes' as const, label: 'Nouvelles demandes', badge: newRequestProjects.length },
                    { id: 'devis' as const, label: 'Mes devis', badge: undefined },
                    { id: 'revisions_attente' as const, label: 'Révisions en attente', badge: quoteRevisions.length },
                    { id: 'revisions_envoyees' as const, label: 'Révisions envoyées', badge: quoteRevisionsResponded.length },
                  ]).map((tab) => (
                      <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActivitySubTab(tab.id)}
                      className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                        activitySubTab === tab.id
                          ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-cta'
                          : 'bg-white/90 backdrop-blur-sm text-gray-600 border border-gray-200 hover:border-brand-200'
                      }`}
                    >
                      {tab.label}
                      {tab.badge != null && tab.badge > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">{tab.badge}</span>
                      )}
                      </button>
                  ))}
                    </div>

                {activitySubTab === 'demandes' && (
                    <div className="space-y-3">
                    {newRequestProjects.length === 0 ? (
                      <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-10 text-center border border-white/60 shadow-glass">
                        <Briefcase size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="font-bold text-gray-800">Aucune nouvelle demande</p>
                        <p className="text-sm text-gray-500 mt-1">Les demandes de votre catégorie apparaîtront ici et dans vos notifications</p>
                      </div>
                    ) : (
                      newRequestProjects.map((project, index) => (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); navigate(`/projects/${project.id}`); }}
                          className="w-full bg-white/85 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-glass hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99] text-left"
                          style={{ animationDelay: `${index * 40}ms` }}
                        >
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg uppercase tracking-wide">
                            Nouvelle demande
                          </span>
                          <span className="px-2.5 py-1 bg-brand-50 text-brand-700 text-[10px] font-bold rounded-lg ml-2">
                            {project.categories?.name}
                          </span>
                          <h3 className="font-black text-gray-900 text-base leading-snug line-clamp-2 mt-3 mb-2">{project.title}</h3>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(project.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </p>
                          <span className="inline-flex items-center gap-1 mt-2 text-sm font-bold text-brand-600">Voir la demande <ChevronRight size={14} /></span>
                        </button>
                      ))
                    )}
                            </div>
                )}

                {activitySubTab === 'devis' && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {(['all', 'active', 'completed'] as const).map((key) => (
                            <button
                          key={key}
                              type="button"
                          onClick={() => setActivityFilter(key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                            activityFilter === key ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {key === 'all' && 'Tous'}
                          {key === 'active' && 'En cours'}
                          {key === 'completed' && 'Terminés'}
                            </button>
                      ))}
                    </div>
                    {filteredMyQuotes.length === 0 ? (
                      <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/60 shadow-glass">
                        <Briefcase size={24} className="mx-auto text-gray-400 mb-4" />
                        <p className="font-bold text-gray-900 text-base">Aucun devis</p>
                        <p className="text-sm text-gray-500 mt-1">Répondez à des demandes pour les retrouver ici</p>
                  </div>
                ) : (
                    <div className="space-y-3">
                        {filteredMyQuotes.map((quote, index) => {
                          const projectStatus = quote.projects?.status;
                          const status = STATUS_CONFIG[projectStatus] || STATUS_CONFIG.pending;
                          const quoteStatusLabel = (STATUS_CONFIG[quote.status] || STATUS_CONFIG.pending).label;
                      return (
                        <button
                          key={quote.id}
                              type="button"
                              onClick={() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); navigate(`/projects/${quote.project_id}`); }}
                              className="w-full bg-white/85 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-glass hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99] text-left"
                              style={{ animationDelay: `${index * 40}ms` }}
                            >
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <span className="px-2.5 py-1 bg-brand-50 text-brand-700 text-[10px] font-bold rounded-lg uppercase tracking-wide">{quote.projects?.categories?.name || 'Projet'}</span>
                                <span className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 ${status.color}`}>{status.icon}{status.label}</span>
                          </div>
                              <h3 className="font-black text-gray-900 text-base leading-snug line-clamp-2 mb-3">{quote.projects?.title}</h3>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Mon devis : <span className="font-semibold text-gray-700">{quoteStatusLabel}</span> · {quote.amount?.toLocaleString('fr-FR')} FCFA</span>
                                <span className="text-xs text-gray-400">{new Date(quote.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                            </div>
                              {quote.status === 'rejected' && quote.rejection_reason && (
                                <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 line-clamp-2">{quote.rejection_reason}</p>
                              )}
                        </button>
                      );
                    })}
                        </div>
                      )}
                  </>
                )}

                {activitySubTab === 'revisions_attente' && (
                  <div className="space-y-3">
                    {quoteRevisions.length === 0 ? (
                      <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-10 text-center border border-white/60 shadow-glass">
                        <AlertCircle size={32} className="mx-auto text-gray-300 mb-3" />
                        <p className="font-bold text-gray-800">Aucune révision en attente</p>
                      </div>
                    ) : (
                      <>
                        <button type="button" onClick={() => navigate('/revisions')} className="text-sm font-bold text-brand-600 hover:underline mb-2">Voir tout sur la page Révisions</button>
                        {quoteRevisions.map((revision) => (
                          <div key={revision.id} className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                            <p className="text-sm font-bold text-gray-900 line-clamp-1">{revision.projects?.title || 'Projet'}</p>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{revision.client_comments}</p>
                            <button
                              type="button"
                              onClick={() => { const pid = revision.project_id || revision.projects?.id; if (pid) navigate(`/projects/${pid}?revision=${revision.id}`); else navigate('/revisions'); }}
                              className="mt-3 w-full bg-gradient-to-br from-brand-400 to-brand-600 text-white font-bold py-2 rounded-xl text-sm shadow-cta hover:shadow-cta-hover active:scale-[0.99]"
                            >
                              Répondre
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {activitySubTab === 'revisions_envoyees' && (
                  <div className="space-y-3">
                    {quoteRevisionsResponded.length === 0 ? (
                      <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-10 text-center border border-white/60 shadow-glass">
                        <FileText size={32} className="mx-auto text-gray-300 mb-3" />
                        <p className="font-bold text-gray-800">Aucune révision envoyée</p>
                        <p className="text-sm text-gray-500 mt-1">Vos réponses aux demandes de révision apparaîtront ici</p>
                      </div>
                    ) : (
                      quoteRevisionsResponded.map((revision) => (
                        <button
                          key={revision.id}
                          type="button"
                          onClick={() => { const pid = revision.project_id || revision.projects?.id; if (pid) navigate(`/projects/${pid}?revision=${revision.id}`); }}
                          className="w-full bg-white/85 backdrop-blur-xl rounded-2xl p-4 border border-white/60 shadow-glass hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-200 text-left"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-gray-900 text-sm line-clamp-1">{revision.projects?.title || 'Projet'}</p>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${revision.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {revision.status === 'accepted' ? 'Acceptée' : 'Réponse envoyée'}
                            </span>
                  </div>
                          {revision.responded_at && (
                            <p className="text-xs text-gray-500 mt-1">{new Date(revision.responded_at).toLocaleDateString('fr-FR')}</p>
                          )}
                        </button>
                      ))
                    )}
                </div>
                )}
              </>
              ) : (
                <>
                {/* Filtres rapides — Client */}
                <div className="flex flex-wrap gap-2">
                  {(['all', 'active', 'completed'] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActivityFilter(key)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                        activityFilter === key ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-cta' : 'bg-white/90 backdrop-blur-sm text-gray-600 border border-gray-200 hover:border-brand-200'
                      }`}
                    >
                      {key === 'all' && 'Tous'}
                      {key === 'active' && 'En cours'}
                      {key === 'completed' && 'Terminés'}
                    </button>
                  ))}
                </div>
                {/* Client: Liste des projets — projet + nombre de devis */}
                {projects.length === 0 ? (
                <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/60 shadow-glass">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Briefcase size={24} className="text-gray-400" />
                  </div>
                  <p className="font-bold text-gray-900 text-base">Aucun projet</p>
                  <p className="text-sm text-gray-500 mt-1">Créez votre premier projet</p>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-10 text-center border border-white/60 shadow-glass">
                  <p className="text-gray-500 text-sm">Aucun projet dans cette catégorie</p>
                </div>
              ) : (
                  <div className="space-y-3">
                  {filteredProjects.map((project, index) => {
                    const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.open;
                    const quoteCount = project.quotes?.length ?? 0;
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => {
                          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                          navigate(`/projects/${project.id}`);
                        }}
                        className="w-full bg-white/85 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-glass hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-200 text-left active:scale-[0.99]"
                        style={{ animationDelay: `${index * 40}ms` }}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className="text-[10px] font-mono text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg uppercase tracking-wide">
                            {project.project_number}
                          </span>
                          <span className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </div>
                        <h3 className="font-black text-gray-900 text-base leading-snug line-clamp-2 mb-3">
                          {project.title}
                        </h3>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 flex items-center gap-1.5">
                            <MapPin size={14} className="shrink-0" />
                            {project.location || 'Sénégal'}
                          </span>
                          {quoteCount > 0 && (
                            <span className="text-brand-600 font-bold flex items-center gap-1.5">
                              <FileText size={14} />
                              {quoteCount} devis
                            </span>
                          )}
                        </div>
                      </button>
                      );
                    })}
                        </div>
              )
            }
              </>
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

            {/* Bouton crédits pour les artisans */}
            {isArtisan && (
              <button
                onClick={() => navigate('/credits')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 transition-colors"
              >
                <CreditCard size={14} />
                {creditBalance !== null ? `${creditBalance} crédits` : 'Mes crédits'}
              </button>
            )}
          </div>
        )}
      </main>

      {/* ============== BOTTOM NAVIGATION MODERNISÉE AGRANDIE ============== */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200/50 z-30 safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-lg mx-auto px-2 py-3.5 flex items-center justify-around bg-white border-t border-gray-100 overflow-x-auto">
          {[
            { id: 'home' as TabId, icon: Home, label: 'Accueil' },
            { id: 'activity' as TabId, icon: isArtisan ? Send : Briefcase, label: 'Projets', badge: urgentCount > 0 ? urgentCount : undefined },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center gap-1.5 py-3 px-3 min-w-[70px] rounded-2xl transition-all duration-200 flex-shrink-0 ${
                  isActive 
                    ? 'text-brand-600' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Indicateur de fond pour l'onglet actif - Agrandi */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-b from-brand-50 to-transparent rounded-2xl -z-10 animate-in fade-in duration-200" />
                )}
                
                {/* Icône avec effet de scale pour l'actif - Agrandie */}
                <div className={`relative ${isActive ? 'scale-110' : 'scale-100'} transition-transform duration-200`}>
                  <Icon 
                    size={22} 
                    strokeWidth={isActive ? 2.5 : 2} 
                    className={isActive ? 'text-brand-600' : 'text-gray-400'}
                  />
                  {/* Badge de notification - Agrandi */}
                  {tab.badge && tab.badge > 0 && (
                    <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full text-[10px] font-black text-white ${
                      isActive ? 'bg-brand-500' : 'bg-red-500'
                    } animate-pulse shadow-md`}>
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </div>
                
                {/* Label avec animation - Agrandi */}
                <span className={`text-[10px] font-bold transition-all duration-200 ${
                  isActive 
                    ? 'text-brand-600 scale-105' 
                    : 'text-gray-400 scale-100'
                }`}>
                  {tab.label}
                </span>
                
                {/* Indicateur de position (ligne en bas) - Agrandi */}
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-brand-500 rounded-full shadow-md shadow-brand-500/50" />
                )}
              </button>
            );
          })}

          {/* Recherche : Explorer les artisans (liste des profils publics) */}
          <button
            type="button"
            onClick={() => navigate('/artisans')}
            className="relative flex flex-col items-center justify-center gap-1.5 py-3 px-3 min-w-[70px] rounded-2xl transition-all duration-200 flex-shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="Recherche"
          >
            <div className="relative scale-100 transition-transform duration-200">
              <Search size={22} strokeWidth={2} className="text-gray-400" />
            </div>
            <span className="text-[10px] font-bold transition-all duration-200 text-gray-400 scale-100">
              Recherche
            </span>
          </button>

          {/* Messagerie, Finances */}
          <button
            type="button"
            onClick={() => navigate('/conversations')}
            className="relative flex flex-col items-center justify-center gap-1.5 py-3 px-3 min-w-[70px] rounded-2xl transition-all duration-200 flex-shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="Messagerie"
          >
            <div className="relative scale-100 transition-transform duration-200">
              <MessageSquare size={22} strokeWidth={2} className="text-gray-400" />
              {unreadMessageCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold transition-all duration-200 text-gray-400 scale-100">
              Messages
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/invoices')}
            className="relative flex flex-col items-center justify-center gap-1.5 py-3 px-3 min-w-[70px] rounded-2xl transition-all duration-200 flex-shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="Finances"
          >
            <div className="relative scale-100 transition-transform duration-200">
              <Wallet size={22} strokeWidth={2} className="text-gray-400" />
            </div>
            <span className="text-[10px] font-bold transition-all duration-200 text-gray-400 scale-100">
              Finances
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
