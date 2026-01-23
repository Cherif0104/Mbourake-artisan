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
  const { profile, loading: profileLoading, upsertProfile } = useProfile();
  
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
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [artisanData, setArtisanData] = useState<any>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [quoteFilter, setQuoteFilter] = useState<string>('Tous'); // Pour filtrer les devis
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [initializingProfile, setInitializingProfile] = useState(false);
  
  const { signOut } = auth;

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

        // Récupérer les demandes de révision en attente pour les devis de l'artisan
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
    // Si le profil est encore en chargement, afficher un squelette classique
    if (profileLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
          <SkeletonScreen type="header" className="sticky top-0 z-30" />
          <div className="max-w-lg mx-auto px-5 py-6 space-y-4">
            <SkeletonScreen type="card" />
            <SkeletonScreen type="list" />
          </div>
        </div>
      );
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
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-500 text-white font-black py-3 shadow-md hover:bg-brand-600 active:scale-[0.98] transition-all text-sm"
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

  const isArtisan = profile.role === 'artisan';
  const isVerified = verificationStatus === 'verified';
  const firstName = profile.full_name?.split(' ')[0] || 'Utilisateur';
  const needsProfileCompletion = !isProfileComplete(profile);

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* ============== HEADER MODERNISÉ SIMPLIFIÉ ============== */}
      <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-30 shadow-sm border-b border-gray-100/50">
        <div className="max-w-lg mx-auto px-5 py-4">
          {/* Ligne unique: Avatar agrandi + Salutation + Actions rapides */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setActiveTab('profile')}
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
                
                {/* Menu simplifié - Seulement les actions importantes */}
                {showMenu && (
                  <div className="absolute right-0 top-14 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100/50 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button 
                      onClick={() => { navigate('/edit-profile'); setShowMenu(false); }}
                      className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      <User size={18} className="text-gray-400" />
                      <span className="font-medium text-gray-700">Mon profil</span>
                    </button>
                    {isArtisan && (
                      <button 
                        onClick={() => { navigate('/edit-profile?tab=portfolio'); setShowMenu(false); }}
                        className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors text-sm font-medium"
                      >
                        <Image size={18} className="text-gray-400" />
                        <span className="font-medium text-gray-700">Portfolio</span>
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

          {/* Ligne 2: Actions rapides principales - UNIQUEMENT pour les artisans - Mobile-first */}
          {isArtisan && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100/50 overflow-x-auto pb-1">
              {/* Bouton Vérification (pour artisans non vérifiés) - Agrandi */}
              {verificationStatus === 'unverified' && (
                <button
                  onClick={() => navigate('/verification')}
                  className="flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-100 active:scale-95 transition-all whitespace-nowrap flex-shrink-0 border border-blue-200 shadow-sm min-h-[44px]"
                >
                  <Shield size={20} />
                  Se vérifier
                </button>
              )}

              {/* Bouton Portfolio (pour artisans) - Agrandi */}
              <button
                onClick={() => navigate('/edit-profile?tab=portfolio')}
                className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 active:scale-95 transition-all whitespace-nowrap flex-shrink-0 shadow-sm min-h-[44px]"
              >
                <Image size={20} />
                Portfolio
              </button>

              {/* Bouton Explorer (toujours visible) - Agrandi */}
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 active:scale-95 transition-all whitespace-nowrap flex-shrink-0 shadow-sm min-h-[44px]"
              >
                <Search size={20} />
                Explorer
              </button>

              {/* Menu "Plus" pour les actions secondaires - Agrandi */}
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 active:scale-95 transition-all whitespace-nowrap flex-shrink-0 shadow-sm min-h-[44px]"
                >
                  <MoreVertical size={20} />
                  Plus
                </button>

                {/* Dropdown menu pour actions secondaires */}
                {showMoreMenu && (
                  <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100/50 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button 
                      onClick={() => { navigate('/favorites'); setShowMoreMenu(false); }}
                      className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      <Heart size={18} className="text-gray-400" />
                      <span className="font-medium text-gray-700">Favoris</span>
                    </button>
                    <button 
                      onClick={() => { navigate('/expenses'); setShowMoreMenu(false); }}
                      className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      <Receipt size={18} className="text-gray-400" />
                      <span className="font-medium text-gray-700">Dépenses</span>
                    </button>
                    <button 
                      onClick={() => { navigate('/invoices'); setShowMoreMenu(false); }}
                      className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      <FileText size={18} className="text-gray-400" />
                      <span className="font-medium text-gray-700">Factures</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bouton Créer projet pour clients - Intégré dans le header - Mobile-first */}
          {!isArtisan && (
            <div className="mt-3 pt-3 border-t border-gray-100/50">
              <button
                onClick={() => navigate('/create-project')}
                className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-brand-500 text-white rounded-xl font-bold text-base hover:bg-brand-600 active:scale-95 transition-all shadow-md shadow-brand-500/30 min-h-[48px]"
              >
                <PlusCircle size={22} />
                Nouveau projet
              </button>
            </div>
          )}
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
          <div className="space-y-5 animate-in fade-in duration-300">
            
            {/* Alerte profil incomplet - Priorité 1 - Minimaliste */}
            {needsProfileCompletion && (
              <button
                onClick={() => navigate('/edit-profile?mode=onboarding')}
                className="w-full bg-gradient-to-r from-brand-50 via-orange-50 to-brand-50 border border-brand-200 rounded-xl p-3.5 flex items-center gap-3 hover:shadow-md hover:shadow-brand-200/30 transition-all active:scale-[0.98]"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm shadow-brand-200/30">
                  <User size={18} className="text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-black text-gray-900 text-sm">
                    Complétez votre profil
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Ajoutez vos informations essentielles
                  </p>
                </div>
                <ChevronRight size={16} className="text-brand-400 flex-shrink-0" />
              </button>
            )}
            
            {/* Alerte urgente (si applicable) - Priorité 2 - Minimaliste */}
            {urgentCount > 0 && !needsProfileCompletion && (
              <button 
                onClick={() => setActiveTab('activity')}
                className="w-full bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-3.5 flex items-center gap-3 hover:shadow-sm transition-all active:scale-[0.98]"
              >
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={18} className="text-yellow-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-gray-900 text-sm">
                    {urgentCount} action{urgentCount > 1 ? 's' : ''} en attente
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isArtisan ? 'Devis à consulter' : 'Devis à consulter'}
                  </p>
                </div>
                <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
              </button>
            )}

            {/* Alerte vérification (artisans non vérifiés) - Priorité 3 - Minimaliste */}
            {isArtisan && verificationStatus === 'unverified' && !needsProfileCompletion && urgentCount === 0 && (
              <button 
                onClick={() => navigate('/verification')}
                className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3.5 flex items-center gap-3 hover:shadow-sm transition-all active:scale-[0.98]"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-gray-900 text-sm">Faites-vous certifier</p>
                  <p className="text-xs text-gray-500 mt-0.5">Gagnez en confiance</p>
                </div>
                <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
              </button>
            )}

            {/* Carte solde de crédits (pour artisans uniquement) - Minimaliste - Affichée seulement si < 20 crédits */}
            {isArtisan && creditBalance !== null && creditBalance < 20 && (
              <button
                onClick={() => navigate('/credits')}
                className="w-full bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-50 border border-purple-200 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-purple-500/30">
                      <CreditCard size={18} className="text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wide mb-0.5">Crédits</p>
                      <p className="text-lg font-black text-gray-900">
                        {creditBalance} <span className="text-xs font-bold text-gray-600">restants</span>
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 bg-white text-purple-600 rounded-lg font-bold text-xs shadow-sm border border-purple-200">
                    Recharger
                  </div>
                </div>
              </button>
            )}

            {/* Stats essentielles (2 maximum) - Modernisées - Mobile-first avec icônes plus grandes - Simplifiées - Cliquables */}
            {(activeCount > 0 || completedCount > 0) && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('activity')}
                  className="bg-white rounded-3xl p-5 border border-gray-100 shadow-lg shadow-gray-100/50 hover:shadow-xl hover:shadow-gray-200/50 transition-all active:scale-[0.98] text-left min-h-[120px]"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center shadow-md shadow-brand-200/50">
                      {isArtisan ? <Send size={24} className="text-white" /> : <Briefcase size={24} className="text-white" />}
                    </div>
                  </div>
                  <p className="text-3xl font-black text-gray-900 mb-1">{activeCount}</p>
                  <p className="text-sm font-bold text-gray-600">
                    {isArtisan ? 'Devis actifs' : 'En cours'}
                  </p>
                  {/* Barre de progression visuelle */}
                  {activeCount > 0 && (
                    <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((activeCount / (activeCount + completedCount)) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </button>
                
                <button
                  onClick={() => setActiveTab('activity')}
                  className="bg-white rounded-3xl p-5 border border-gray-100 shadow-lg shadow-gray-100/50 hover:shadow-xl hover:shadow-gray-200/50 transition-all active:scale-[0.98] text-left min-h-[120px]"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-md shadow-green-200/50">
                      <CheckCircle size={24} className="text-white" />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-gray-900 mb-1">{completedCount}</p>
                  <p className="text-sm font-bold text-gray-600">
                    {isArtisan ? 'Acceptés' : 'Terminés'}
                  </p>
                  {/* Barre de progression visuelle */}
                  {completedCount > 0 && (
                    <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((completedCount / (activeCount + completedCount)) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </button>
              </div>
            )}

            {/* Section principale selon le rôle - Simplifiée */}
            {isArtisan ? (
              /* ===== ARTISAN: Projets disponibles ===== */
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black text-gray-900">Nouveaux projets</h2>
                  {projects.length > 3 && (
                    <button 
                      onClick={() => navigate('/')}
                      className="text-sm text-brand-500 font-bold flex items-center gap-1.5 min-h-[32px] px-2"
                    >
                      Voir tout
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
                
                {loading ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-lg">
                    <div className="w-12 h-12 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-lg">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-md">
                      <Briefcase size={28} className="text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-bold text-base">Aucun projet</p>
                    <p className="text-sm text-gray-400 mt-1">Revenez bientôt</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projects.slice(0, 3).map((project, index) => (
                      <button
                        key={project.id}
                        onClick={() => {
                          // Forcer le scroll en haut avant la navigation
                          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                          document.documentElement.scrollTop = 0;
                          document.body.scrollTop = 0;
                          navigate(`/projects/${project.id}`);
                        }}
                        className="w-full bg-white rounded-3xl p-5 border border-gray-100 text-left hover:border-brand-200 hover:shadow-lg hover:shadow-gray-200/50 transition-all active:scale-[0.99] min-h-[120px]"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className="px-3 py-1.5 bg-gradient-to-r from-brand-50 to-brand-100 text-brand-700 text-xs font-black rounded-xl border border-brand-200">
                            {project.categories?.name}
                          </span>
                          <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded-lg">
                            {new Date(project.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <h3 className="font-black text-gray-900 mb-3 line-clamp-2 text-base leading-tight">{project.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1.5 font-medium">
                            <MapPin size={18} className="text-brand-500" />
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
                
                {loading ? (
                  <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                    <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
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
                          className="w-full bg-white rounded-2xl p-5 border border-gray-100 text-left hover:border-brand-200 hover:shadow-md transition-all active:scale-[0.99] min-h-[120px]"
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
              <>
                {/* Section Révisions en attente */}
                {quoteRevisions.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <AlertCircle size={20} className="text-yellow-600" />
                        Révisions en attente
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                          {quoteRevisions.length}
                        </span>
                      </h3>
                      <button
                        onClick={() => navigate('/revisions')}
                        className="text-xs font-bold text-brand-600 hover:text-brand-700"
                      >
                        Voir tout
                      </button>
                    </div>
                    <div className="space-y-3">
                      {quoteRevisions.map((revision) => (
                        <div
                          key={revision.id}
                          className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 hover:shadow-lg transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <p className="text-xs font-bold text-yellow-800 mb-1">Demande de révision</p>
                              <p className="text-sm font-black text-gray-900">
                                {revision.projects?.title || 'Projet'}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                Devis: {revision.quotes?.quote_number || revision.quote_id.slice(0, 8).toUpperCase()}
                              </p>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(revision.requested_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          <div className="bg-white rounded-xl p-3 mb-3">
                            <p className="text-xs font-bold text-gray-700 mb-1">Commentaires du client :</p>
                            <p className="text-sm text-gray-600">{revision.client_comments}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate('/revisions');
                              }}
                              className="flex-1 bg-brand-500 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-brand-600 transition-colors flex items-center justify-center gap-2"
                            >
                              <FileText size={14} />
                              Voir toutes les révisions
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Artisan: Liste des devis */}
                {myQuotes.length === 0 ? (
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
                        .map((quote, index) => {
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
                          className="w-full bg-white rounded-3xl p-5 border border-gray-100 text-left hover:border-brand-200 hover:shadow-lg hover:shadow-gray-200/50 transition-all active:scale-[0.99] min-h-[140px]"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <span className="text-xs text-gray-500 font-mono bg-gray-100 px-3 py-1.5 rounded-xl font-bold">
                              {quote.quote_number}
                            </span>
                            <span className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 ${status.color} border`}>
                              {status.icon}
                              {status.label}
                            </span>
                          </div>
                          <h3 className="font-black text-gray-900 mb-3 text-base leading-tight line-clamp-2">{quote.projects?.title}</h3>
                          {quote.status === 'rejected' && quote.rejection_reason && (
                            <div className="mb-3 flex items-start gap-2 bg-red-50 border-2 border-red-200 rounded-xl p-3">
                              <span className="text-xs font-black text-red-700">❌ Refusé</span>
                              <span className="text-xs text-red-700 line-clamp-2 flex-1 font-medium">
                                : {quote.rejection_reason}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-black text-brand-600">
                              {quote.amount?.toLocaleString('fr-FR')} FCFA
                            </span>
                            <span className="text-xs text-gray-500 font-medium bg-gray-50 px-2 py-1 rounded-lg">
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
                )}
              </>
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

      {/* ============== FAB (Floating Action Button) - Modernisé ============== */}
      {!isArtisan && activeTab !== 'profile' && (
        <button
          onClick={() => navigate('/create-project')}
          className="fixed bottom-28 right-5 w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl shadow-2xl shadow-brand-500/40 flex items-center justify-center text-white hover:from-brand-600 hover:to-brand-700 active:scale-95 transition-all z-20"
          aria-label="Nouveau projet"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      )}

      {/* ============== BOTTOM NAVIGATION MODERNISÉE AGRANDIE ============== */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200/50 z-30 safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center justify-around bg-white border-t border-gray-100">
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
                className={`relative flex flex-col items-center justify-center gap-1.5 py-3 px-5 min-w-[80px] rounded-2xl transition-all duration-200 ${
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
                    size={24} 
                    strokeWidth={isActive ? 2.5 : 2} 
                    className={isActive ? 'text-brand-600' : 'text-gray-400'}
                  />
                  {/* Badge de notification - Agrandi */}
                  {tab.badge && tab.badge > 0 && (
                    <span className={`absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] flex items-center justify-center px-1.5 rounded-full text-[11px] font-black text-white ${
                      isActive ? 'bg-brand-500' : 'bg-red-500'
                    } animate-pulse shadow-md`}>
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </div>
                
                {/* Label avec animation - Agrandi */}
                <span className={`text-xs font-bold transition-all duration-200 ${
                  isActive 
                    ? 'text-brand-600 scale-105' 
                    : 'text-gray-400 scale-100'
                }`}>
                  {tab.label}
                </span>
                
                {/* Indicateur de position (ligne en bas) - Agrandi */}
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-10 h-1 bg-brand-500 rounded-full shadow-md shadow-brand-500/50" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
