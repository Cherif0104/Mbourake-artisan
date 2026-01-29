import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, Heart, Star, CheckCircle, ArrowUpRight, Hammer,
  Wrench, PaintBucket, Droplets, Zap, HardHat, CloudLightning,
  Wind, Car, Scissors, ChefHat, Truck, Lightbulb, Sparkles, Bike,
  ChevronRight, X
} from 'lucide-react';
import { useDiscovery } from '../hooks/useDiscovery';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { LanguageSelector } from '../components/LanguageSelector';
import { supabase } from '../lib/supabase';

function normalizeForSearch(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

interface ArtisanSuggestion {
  id: string;
  name: string;
  specialty: string;
  category: string;
  img: string;
}

const MAX_SUGGESTION_CATEGORIES = 10;
const MAX_SUGGESTION_ARTISANS = 6;

export function LandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { categories: dbCategories, loading } = useDiscovery();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [artisans, setArtisans] = useState<ArtisanSuggestion[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = !auth.loading && !profileLoading && !!auth.user && !!profile;
  // Map icon names to Lucide components
  const iconMap: Record<string, React.ReactNode> = {
    'hammer': <Hammer size={24} />,
    'wrench': <Wrench size={24} />,
    'paint-bucket': <PaintBucket size={24} />,
    'droplets': <Droplets size={24} />,
    'zap': <Zap size={24} />,
    'hard-hat': <HardHat size={24} />,
    'cloud-lightning': <CloudLightning size={24} />,
    'wind': <Wind size={24} />,
    'car': <Car size={24} />,
    'scissors': <Scissors size={24} />,
    'chef-hat': <ChefHat size={24} />,
    'truck': <Truck size={24} />,
    'lightbulb': <Lightbulb size={24} />,
    'sparkles': <Sparkles size={24} />,
    'bike': <Bike size={24} />,
  };

  // Afficher 12 catégories populaires sur la landing (mieux représentées)
  const popularCategories = useMemo(() => {
    return dbCategories.slice(0, 12);
  }, [dbCategories]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return popularCategories;
    return dbCategories.filter(cat => 
      cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [popularCategories, dbCategories, searchQuery]);

  // Suggestions pour le dropdown : catégories + artisans (comme page Artisans)
  const suggestionCategories = useMemo(() => {
    const q = normalizeForSearch(searchQuery.trim());
    if (!q) return dbCategories.slice(0, MAX_SUGGESTION_CATEGORIES);
    return dbCategories
      .filter(c => normalizeForSearch(c.name).includes(q))
      .slice(0, MAX_SUGGESTION_CATEGORIES);
  }, [searchQuery, dbCategories]);

  const suggestionArtisans = useMemo(() => {
    const q = normalizeForSearch(searchQuery.trim());
    if (!q || q.length < 2) return [];
    return artisans
      .filter(
        a =>
          normalizeForSearch(a.name).includes(q) ||
          normalizeForSearch(a.specialty).includes(q) ||
          normalizeForSearch(a.category).includes(q)
      )
      .slice(0, MAX_SUGGESTION_ARTISANS);
  }, [searchQuery, artisans]);

  const hasSuggestions = suggestionCategories.length > 0 || suggestionArtisans.length > 0;

  // Charger les artisans pour les suggestions (lecture publique OK pour anon)
  useEffect(() => {
    const fetchArtisans = async () => {
      const { data: artisansData, error } = await supabase
        .from('artisans')
        .select('id, specialty, categories(name)')
        .limit(80);

      if (error || !artisansData?.length) {
        setArtisans([]);
        return;
      }

      const ids = artisansData.map((a: any) => a.id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', ids);

      const profilesMap: Record<string, any> = {};
      if (profilesData) {
        profilesData.forEach((p: any) => {
          profilesMap[p.id] = p;
        });
      }

      const list: ArtisanSuggestion[] = artisansData.map((a: any) => {
        const p = profilesMap[a.id];
        const name = p?.full_name?.trim() || 'Artisan';
        const img =
          p?.avatar_url?.trim() ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=F97316&color=fff`;
        return {
          id: a.id,
          name,
          specialty: a.specialty?.trim() || 'Spécialiste',
          category: a.categories?.name || 'Autre',
          img,
        };
      });
      setArtisans(list);
    };
    fetchArtisans();
  }, []);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCategory = (slug: string) => {
    setShowSuggestions(false);
    setSearchQuery('');
    navigate(`/category/${slug}`);
  };

  const handleSelectArtisan = (id: string) => {
    setShowSuggestions(false);
    setSearchQuery('');
    navigate(`/artisans/${id}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/artisans?search=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/artisans');
    }
  };

  // Redirection pour utilisateurs authentifiés sans profil
  // Après OAuth Google, si l'utilisateur n'a pas encore de profil,
  // le rediriger vers /edit-profile?mode=onboarding pour compléter son profil
  useEffect(() => {
    if (auth.loading || profileLoading) return;
    if (!auth.user) return;

    // Nouveau compte Google sans profil encore créé :
    // on envoie directement vers le wizard de profil (EditProfilePage en mode onboarding)
    if (!profile) {
      // Essayer de récupérer le rôle depuis localStorage (sauvegardé avant OAuth)
      const roleFromStorage = localStorage.getItem('mbourake_pending_role');
      const params = new URLSearchParams({ mode: 'onboarding' });
      if (roleFromStorage) {
        params.set('role', roleFromStorage);
      }
      navigate(`/edit-profile?${params.toString()}`, { replace: true });
      return;
    }

    // Si l'utilisateur a un profil complet, rediriger vers le dashboard
    // sauf s'il arrive depuis le bouton Recherche (?recherche=1) pour voir la landing (localhost ou mbourake.com)
    const fromRecherche = searchParams.get('recherche') === '1' || (typeof window !== 'undefined' && window.location.search.includes('recherche=1'));
    if (fromRecherche) return;

    const requiredFields = ['role', 'full_name', 'location'];
    const hasRequiredFields = requiredFields.every(
      field => profile[field] && profile[field].toString().trim().length > 0
    );
    const isProfileComplete = hasRequiredFields && 
      (profile.role !== 'artisan' || profile.category_id);
    
    if (isProfileComplete) {
      navigate('/dashboard', { replace: true });
    }
  }, [auth.loading, profileLoading, auth.user, profile, navigate, searchParams]);

  if (auth.loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] overflow-x-hidden selection:bg-brand-100 font-sans">
      {/* Top Navbar */}
      <nav className="bg-white/95 backdrop-blur-md px-4 md:px-8 lg:px-20 py-3 md:py-4 flex items-center justify-between border-b border-gray-100/50 shadow-sm sticky top-0 z-50">
        {/* Logo Section */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 group transition-all"
        >
          <span className="text-xl md:text-2xl font-black text-gray-900 tracking-tighter italic group-hover:text-brand-500 transition-colors">
            Mboura<span className="text-brand-500">ké</span>
          </span>
          <div className="w-4 h-4 md:w-5 md:h-5 rounded-full border border-gray-200 group-hover:border-brand-300 flex items-center justify-center text-[9px] md:text-[10px] text-gray-400 group-hover:text-brand-500 font-bold transition-colors">
            i
          </div>
        </button>

        {/* Navigation & Actions */}
        <div className="flex items-center gap-2 md:gap-3 lg:gap-5">
          {/* À propos - Desktop */}
          <button 
            onClick={() => navigate('/about')}
            className="hidden lg:block text-gray-600 hover:text-brand-500 font-semibold text-sm transition-all duration-200 relative group"
          >
            À propos
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-500 group-hover:w-full transition-all duration-200" />
          </button>

          {/* Language Selector */}
          <div className="flex items-center">
            <LanguageSelector />
          </div>

          {/* Divider - Desktop */}
          <div className="hidden md:block w-px h-6 bg-gray-200" />

          {/* CTA Buttons */}
          <div className="flex items-center gap-2 md:gap-3">
            {isLoggedIn ? (
              <>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="px-4 md:px-5 py-2 md:py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-wider hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 active:scale-[0.97] transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Mon tableau de bord
                </button>
                <button 
                  onClick={() => navigate('/artisans')}
                  className="px-4 md:px-5 py-2 md:py-2.5 bg-brand-500 text-white rounded-xl font-black text-[10px] md:text-xs uppercase tracking-wider shadow-md shadow-brand-200/50 hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-300/50 active:scale-[0.97] transition-all duration-200"
                >
                  Explorer les artisans
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => navigate('/onboard?mode=signup')}
                  className="px-4 md:px-5 py-2 md:py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-wider hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 active:scale-[0.97] transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  S'inscrire
                </button>
                <button 
                  onClick={() => navigate('/onboard?mode=login')}
                  className="px-4 md:px-5 py-2 md:py-2.5 bg-brand-500 text-white rounded-xl font-black text-[10px] md:text-xs uppercase tracking-wider shadow-md shadow-brand-200/50 hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-300/50 active:scale-[0.97] transition-all duration-200"
                >
                  Connexion
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section 
        className="relative h-[650px] flex flex-col items-center justify-center text-center px-6 overflow-hidden"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />
        <div className="relative z-10 w-full max-w-4xl animate-in fade-in zoom-in duration-700">
          <h1 className="text-4xl md:text-7xl font-black text-white mb-10 tracking-tighter leading-[1.1]">
            Trouvez les meilleurs <br />
            <span className="text-brand-500">artisans</span> du Sénégal.
          </h1>
          
          <div ref={searchContainerRef} className="w-full max-w-2xl mx-auto relative">
            <form onSubmit={handleSearch} className="flex w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-1.5 border-4 border-white/20 backdrop-blur-md transition-all focus-within:ring-4 ring-brand-500/30">
              <div className="flex-1 flex items-center px-4 gap-3 text-gray-400">
                <Search size={24} className="text-brand-500 shrink-0" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Rechercher une catégorie ou un artisan (ex: Maçon, Couture...)"
                  className="w-full py-4 outline-none text-gray-700 font-bold text-lg placeholder:font-medium min-w-0"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setShowSuggestions(false); }}
                    className="p-1 text-gray-400 hover:text-gray-600 shrink-0"
                    aria-label="Effacer"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
              <button type="submit" className="bg-brand-500 text-white px-10 py-4 font-black rounded-xl hover:bg-brand-600 transition-all uppercase tracking-widest text-xs shadow-lg shadow-brand-100 active:scale-95">
                Rechercher
              </button>
            </form>

            {/* Dropdown suggestions : catégories + artisans (comme page Artisans) */}
            {showSuggestions && hasSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
                {suggestionCategories.length > 0 && (
                  <div className="p-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-2">
                      Catégories
                    </p>
                    {suggestionCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectCategory(cat.slug || String(cat.id))}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl hover:bg-brand-50 text-left transition-colors"
                      >
                        <span className="font-bold text-gray-900 truncate">{cat.name}</span>
                        <ChevronRight size={18} className="text-gray-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
                {suggestionArtisans.length > 0 && (
                  <div className="p-2 border-t border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-2">
                      Artisans
                    </p>
                    {suggestionArtisans.map((artisan) => (
                      <button
                        key={artisan.id}
                        type="button"
                        onClick={() => handleSelectArtisan(artisan.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-brand-50 text-left transition-colors"
                      >
                        <img
                          src={artisan.img}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 truncate">{artisan.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {artisan.specialty} · {artisan.category}
                          </p>
                        </div>
                        <ChevronRight size={18} className="text-gray-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {['Maçonnerie', 'Plomberie', 'Couture', 'Solaire', 'Mécanique'].map(tag => (
              <button 
                key={tag} 
                onClick={() => { setSearchQuery(tag); setShowSuggestions(true); }} 
                className="px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand-500 transition-all"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section id="categories-section" className="py-24 px-6 md:px-20 bg-white scroll-mt-24">
        <div className="flex flex-col items-center mb-20 text-center">
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">Corps de métiers populaires</h2>
          <p className="text-gray-500 max-w-xl mb-8 font-medium leading-relaxed italic">
            "Le mélange parfait entre professionnels qualifiés et clients exigeants, ancré dans la culture sénégalaise."
          </p>
          <div className="h-1.5 w-24 bg-brand-500 rounded-full" />
        </div>
        
        {loading ? (
          <div className="flex justify-center p-20">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 max-w-5xl mx-auto mb-12">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((cat, i) => (
                  <button 
                    key={cat.id} 
                    onClick={() => navigate(`/category/${cat.slug || cat.id}`)}
                    className="flex flex-col items-center group animate-in fade-in slide-in-from-bottom-4 duration-500" 
                    style={{ animationDelay: `${i * 5}ms` }}
                  >
                    <div className="w-20 h-20 bg-orange-50/50 rounded-[2rem] flex items-center justify-center text-brand-500 mb-5 transition-all duration-500 group-hover:bg-brand-500 group-hover:text-white shadow-sm border border-orange-100 group-hover:rotate-6 group-hover:scale-110">
                      {iconMap[cat.icon_name || 'wrench'] || <Wrench size={24} />}
                    </div>
                    <span className="text-[9px] font-black text-gray-800 text-center uppercase tracking-[0.12em] leading-tight px-2 transition-colors group-hover:text-brand-600 h-10 flex items-center justify-center">
                      {cat.name}
                    </span>
                  </button>
                ))
              ) : (
                <div className="col-span-full py-20 text-center">
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">
                    Aucun métier ne correspond à votre recherche "{searchQuery}"
                  </p>
                  <button 
                    onClick={() => setSearchQuery('')} 
                    className="mt-4 text-brand-500 font-black uppercase text-xs hover:underline underline-offset-4"
                  >
                    Voir tous les métiers
                  </button>
                </div>
              )}
            </div>
            
            {/* Bouton pour voir toutes les catégories */}
            {!searchQuery && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => navigate('/artisans')}
                  className="px-8 py-4 bg-brand-500 text-white font-black rounded-2xl hover:bg-brand-600 active:scale-[0.98] transition-all uppercase tracking-widest text-xs shadow-lg shadow-brand-200 flex items-center gap-2"
                >
                  <ArrowUpRight size={18} />
                  Voir toutes les catégories
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 bg-orange-50/20 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-brand-500 rounded-3xl flex items-center justify-center text-white mb-10 rotate-6 shadow-2xl shadow-brand-100/50">
          <Hammer size={36} strokeWidth={2.5} className="-rotate-6" />
        </div>
        <h2 className="text-4xl font-black text-gray-900 mb-6 tracking-tight">
          Prêt à commencer ?
        </h2>
        <p className="text-gray-500 max-w-xl mb-12 leading-relaxed font-medium">
          Rejoignez la plateforme et connectez-vous avec les meilleurs artisans du Sénégal.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => navigate('/onboard?mode=signup')}
            className="bg-gray-900 text-white px-16 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.25em] shadow-2xl hover:bg-brand-500 transition-all active:scale-95"
          >
            S'inscrire
          </button>
          <button 
            onClick={() => navigate('/onboard?mode=login')}
            className="bg-white text-gray-700 border-2 border-gray-200 px-16 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.25em] shadow-xl hover:border-brand-500 hover:text-brand-600 transition-all active:scale-95"
          >
            Se connecter
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t py-20 px-6 text-center">
        <div className="mb-10">
          <span className="text-3xl font-black text-gray-900 tracking-tighter italic">
            Mboura <span className="text-brand-500">ké</span>
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-6 mb-10">
          <button 
            onClick={() => navigate('/about')}
            className="text-gray-600 hover:text-brand-500 font-bold text-sm transition-colors"
          >
            À propos
          </button>
          <button 
            onClick={() => navigate('/artisans')}
            className="text-gray-600 hover:text-brand-500 font-bold text-sm transition-colors"
          >
            Artisans
          </button>
          <button 
            onClick={() => navigate('/onboard?mode=signup')}
            className="text-gray-600 hover:text-brand-500 font-bold text-sm transition-colors"
          >
            S'inscrire
          </button>
        </div>
        <p className="text-gray-400 text-[9px] font-black uppercase tracking-[0.4em] mb-10 opacity-60">
          © 2026 Mbourake - L'alliance de l'excellence artisanale.
        </p>
        <div className="h-px w-20 bg-orange-100 mx-auto" />
      </footer>
    </div>
  );
}
