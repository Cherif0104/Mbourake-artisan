import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, Heart, Star, CheckCircle, ArrowUpRight, Hammer,
  Wrench, PaintBucket, Droplets, Zap, HardHat, CloudLightning,
  Wind, Car, Scissors, ChefHat, Truck, Lightbulb, Sparkles, Bike,
  ChevronRight, X, MapPin, User, ShoppingBag, Menu, Shield, Download,
  ShoppingCart, MessageCircle
} from 'lucide-react';
import { useDiscovery } from '../hooks/useDiscovery';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useToastContext } from '../contexts/ToastContext';
import { usePWAInstall } from '../contexts/PWAInstallContext';
import { LoadingOverlay } from '../components/LoadingOverlay';
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

/** Produit minimal pour la section "Produits à la une" */
interface FeaturedProduct {
  id: string;
  title: string | null;
  price: number;
  images: string[] | null;
  artisan_id: string | null;
  profiles?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

const MAX_SUGGESTION_CATEGORIES = 10;
const MAX_SUGGESTION_ARTISANS = 6;
const MAX_FEATURED_PRODUCTS = 8;
const MAX_FEATURED_ARTISANS = 8;

export function LandingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const auth = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { success: showSuccess } = useToastContext();
  const pwaInstall = usePWAInstall();
  const { categories: dbCategories, loading } = useDiscovery();
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [artisans, setArtisans] = useState<ArtisanSuggestion[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [featuredProductsLoading, setFeaturedProductsLoading] = useState(false);

  // Éviter la page blanche : après 3 s, afficher la landing même si auth/profile chargent encore
  useEffect(() => {
    const t = window.setTimeout(() => setLoadingTimeout(true), 3000);
    return () => window.clearTimeout(t);
  }, []);

  // Message après suppression de compte : afficher le toast puis retirer le paramètre de l'URL
  useEffect(() => {
    if (searchParams.get('account_deleted') !== '1') return;
    showSuccess('Votre compte et toutes vos données ont été supprimés. Vous pouvez vous réinscrire à tout moment.', 8000);
    const next = new URLSearchParams(searchParams);
    next.delete('account_deleted');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, showSuccess]);

  const fromRecherche = searchParams.get('recherche') === '1';
  const willRedirectToDashboard = !!auth.user && !fromRecherche;
  const showLoading = (auth.loading || profileLoading || willRedirectToDashboard) && !loadingTimeout;

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

  // Produits à la une (marketplace) : 8 derniers publiés
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      setFeaturedProductsLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            id,
            title,
            price,
            images,
            artisan_id,
            profiles!products_artisan_id_fkey(id, full_name, avatar_url)
          `)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(MAX_FEATURED_PRODUCTS);

        if (error) {
          const code = (error as any)?.code;
          const msg = (error.message || '').toLowerCase();
          const isMissing = code === 'PGRST205' || msg.includes('does not exist') || msg.includes('relation') || msg.includes('42p01');
          if (!isMissing && import.meta.env.DEV) console.warn('Landing: products fetch failed', error);
          setFeaturedProducts([]);
        } else {
          setFeaturedProducts((data as FeaturedProduct[]) || []);
        }
      } catch {
        setFeaturedProducts([]);
      } finally {
        setFeaturedProductsLoading(false);
      }
    };
    fetchFeaturedProducts();
  }, []);

  // Fermer le dropdown recherche et le menu mobile au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) setShowSuggestions(false);
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) setMobileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCategory = (categoryName: string) => {
    setShowSuggestions(false);
    setSearchQuery('');
    const params = new URLSearchParams();
    params.set('search', categoryName.trim());
    navigate(`/marketplace?${params.toString()}`);
  };

  const handleSelectArtisan = (id: string) => {
    setShowSuggestions(false);
    setSearchQuery('');
    navigate(`/artisans/${id}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (locationQuery.trim()) params.set('region', locationQuery.trim());
    const qs = params.toString();
    navigate(qs ? `/marketplace?${qs}` : '/marketplace');
  };

  // Redirection pour utilisateurs authentifiés : toujours vers le dashboard
  // (dès que la session est connue, pour éviter tout flash edit-profile ou contenu landing)
  useEffect(() => {
    if (auth.loading || !auth.user || fromRecherche) return;
    navigate('/dashboard', { replace: true });
  }, [auth.loading, auth.user, fromRecherche, navigate]);

  if (showLoading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] overflow-x-hidden selection:bg-brand-100 font-sans">
      {/* Header — logo officiel + nav + CTA */}
      <header className="bg-white border-b border-gray-100 px-4 md:px-8 lg:px-16 py-3 md:py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
          <img src="/logo-mbourake.svg" alt="Mbouraké" className="h-10 w-10 md:h-12 md:w-12 object-contain" />
          <span className="text-lg md:text-xl font-black text-gray-800 tracking-tight uppercase">
            MBOURAKÉ
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          <button onClick={() => navigate('/marketplace')} className="text-gray-700 hover:text-brand-600 font-semibold text-sm transition-colors">
            Artisan Marketplace
          </button>
          <button onClick={() => navigate('/onboard?mode=login&role=client&redirect=' + encodeURIComponent('/create-project'))} className="text-gray-700 hover:text-brand-600 font-semibold text-sm transition-colors">
            Demander un Service
          </button>
        </nav>

        {/* Menu mobile */}
        <div className="md:hidden relative" ref={mobileMenuRef}>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-600 hover:text-brand-600" aria-label="Menu">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          {mobileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-gray-100 shadow-lg py-2 z-50">
              <button onClick={() => { navigate('/marketplace'); setMobileMenuOpen(false); }} className="w-full px-4 py-3 text-left text-gray-700 font-semibold text-sm hover:bg-brand-50">
                Artisan Marketplace
              </button>
              <button onClick={() => { navigate('/onboard?mode=login&role=client&redirect=' + encodeURIComponent('/create-project')); setMobileMenuOpen(false); }} className="w-full px-4 py-3 text-left text-gray-700 font-semibold text-sm hover:bg-brand-50">
                Demander un Service
              </button>
              </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              <button onClick={() => navigate('/dashboard')} className="px-4 py-2 text-gray-700 font-semibold text-sm hover:text-brand-600 hidden sm:block">
                Tableau de bord
              </button>
              <button onClick={() => navigate('/marketplace')} className="px-5 py-2.5 bg-brand-500 text-white rounded-lg font-bold text-sm hover:bg-brand-600 transition-colors shadow-md">
                Explorer
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/onboard?mode=signup')} className="px-4 py-2 text-gray-700 font-semibold text-sm hover:text-brand-600 hidden sm:block">
                S&apos;inscrire
              </button>
              <button onClick={() => navigate('/onboard?mode=login')} className="px-5 py-2.5 bg-brand-500 text-white rounded-lg font-bold text-sm hover:bg-brand-600 transition-colors shadow-md">
                Se Connecter
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero — image mise en valeur + overlay texte pour lisibilité */}
      <section 
        className="relative min-h-[520px] sm:min-h-[560px] md:min-h-[620px] flex flex-col justify-end pb-8 sm:pb-12 md:pb-16 px-4 sm:px-6 overflow-hidden"
        style={{ 
          backgroundImage: 'url("/hero-mbourake.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Overlay léger pour laisser la photo du hero bien visible */}
        <div className="absolute inset-0 bg-black/20" />
        {/* Gradient en bas uniquement : assombrit la zone du texte sans masquer la photo */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent pointer-events-none" />
        <div className="relative z-10 w-full max-w-4xl mx-auto text-left">
          {/* Bloc texte discret : fond très léger + ombre sur le texte pour lisibilité sans cacher la photo */}
          <div className="rounded-xl bg-black/15 backdrop-blur-[1px] p-3 sm:p-4 md:p-5 mb-4 max-w-2xl">
            <h1 className="text-lg sm:text-xl md:text-3xl lg:text-4xl font-black text-white mb-3 sm:mb-4 tracking-tight leading-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
              Artisans & entrepreneurs : trouvez les talents pour vos projets
            </h1>
            <p className="text-white/95 text-sm sm:text-base md:text-lg max-w-2xl mb-3 sm:mb-4 leading-relaxed [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
              Rejoignez la plateforme pour engager des artisans qualifiés et des entrepreneurs au Sénégal. Publiez vos projets, obtenez des devis, et achetez des produits artisanaux auprès des artisans et des entreprises.
            </p>
            <p className="text-white/95 text-xs sm:text-sm md:text-base font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
              Devis gratuit. Vous ne payez qu&apos;après avoir accepté un devis.
            </p>
          </div>

          {/* Barre recherche : quoi + lieu + Rechercher + Artisan ou entrepreneur */}
          <div ref={searchContainerRef} className="relative">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 p-3 sm:p-3 bg-white/95 rounded-xl shadow-xl border border-white/20">
              <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg min-w-0">
                <Search size={20} className="text-brand-500 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Que cherchez-vous ? Plomberie, menuiserie..."
                  className="w-full py-1 outline-none text-gray-800 font-medium placeholder:text-gray-500 bg-transparent"
                  autoComplete="off"
                />
              </div>
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg sm:max-w-[200px]">
                <MapPin size={20} className="text-brand-500 shrink-0" />
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="Lieu : Dakar..."
                  className="w-full py-1 outline-none text-gray-800 font-medium placeholder:text-gray-500 bg-transparent"
                />
              </div>
              <button type="submit" className="px-6 py-3 bg-brand-500 text-white rounded-lg font-bold text-sm hover:bg-brand-600 transition-colors whitespace-nowrap">
                Rechercher
              </button>
              <button
                type="button"
                onClick={() => navigate('/onboard?mode=signup&role=artisan')}
                className="flex items-center justify-center gap-2 px-4 py-3 text-gray-700 font-semibold text-sm hover:bg-brand-50 hover:text-brand-700 rounded-lg transition-colors border border-gray-200"
              >
                <User size={20} className="text-brand-500 shrink-0" />
                Artisan ou entrepreneur
              </button>
            </form>

            {showSuggestions && hasSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden max-h-[60vh] overflow-y-auto">
                {suggestionCategories.length > 0 && (
                  <div className="p-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-2">Catégories</p>
                    {suggestionCategories.map((cat) => (
                      <button key={cat.id} type="button" onClick={() => handleSelectCategory(cat.name)} className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg hover:bg-brand-50 text-left transition-colors">
                        <span className="font-bold text-gray-900 truncate">{cat.name}</span>
                        <ChevronRight size={18} className="text-gray-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
                {suggestionArtisans.length > 0 && (
                  <div className="p-2 border-t border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-2">Artisans</p>
                    {suggestionArtisans.map((artisan) => (
                      <button key={artisan.id} type="button" onClick={() => handleSelectArtisan(artisan.id)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-brand-50 text-left transition-colors">
                        <img src={artisan.img} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 truncate">{artisan.name}</p>
                          <p className="text-xs text-gray-500 truncate">{artisan.specialty} · {artisan.category}</p>
                        </div>
                        <ChevronRight size={18} className="text-gray-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Produits à la une — marketplace-first */}
      <section className="py-16 md:py-20 px-6 md:px-12 lg:px-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center mb-10 text-center">
            <h2 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight mb-2">Produits à la une</h2>
            <p className="text-gray-500 max-w-xl text-sm md:text-base">Découvrez les créations des artisans et commandez en direct.</p>
            <div className="h-1.5 w-24 bg-brand-500 rounded-full mt-4" />
          </div>
          {featuredProductsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {featuredProducts.map((prod) => {
                const imgList = Array.isArray(prod.images) && prod.images.length > 0 ? prod.images : [];
                const primaryImage = imgList[0] ?? null;
                const priceDisplay = Number(prod.price || 0).toLocaleString('fr-FR');
                return (
                  <div
                    key={prod.id}
                    className="bg-[#FDFDFD] border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow flex flex-col"
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/marketplace/${prod.id}`)}
                      className="aspect-[4/3] bg-gray-100 w-full overflow-hidden flex-shrink-0"
                    >
                      {primaryImage ? (
                        <img src={primaryImage} alt={prod.title ?? 'Produit'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <ShoppingBag size={32} />
                        </div>
                      )}
                    </button>
                    <div className="p-3 md:p-4 flex flex-col flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/marketplace/${prod.id}`)}
                        className="text-left"
                      >
                        <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">{prod.title || 'Sans titre'}</h3>
                        <p className="text-brand-600 font-black text-sm">{priceDisplay} FCFA</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isLoggedIn) {
                            navigate(`/onboard?mode=login&role=client&redirect=${encodeURIComponent(`/marketplace/${prod.id}/checkout`)}`);
                          } else {
                            navigate(`/marketplace/${prod.id}/checkout`);
                          }
                        }}
                        className="mt-2 w-full py-2.5 rounded-xl bg-brand-500 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-brand-600 transition-colors"
                      >
                        <ShoppingCart size={16} />
                        Commander
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          {!featuredProductsLoading && featuredProducts.length > 0 && (
            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={() => navigate('/marketplace')}
                className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                Voir toute la marketplace
                <ArrowUpRight size={18} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Artisans à découvrir */}
      <section className="py-16 md:py-20 px-6 md:px-12 lg:px-20 bg-[#FDFDFD]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center mb-10 text-center">
            <h2 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight mb-2">Artisans à découvrir</h2>
            <p className="text-gray-500 max-w-xl text-sm md:text-base">Trouvez l&apos;artisan qu&apos;il vous faut et demandez un devis.</p>
            <div className="h-1.5 w-24 bg-brand-500 rounded-full mt-4" />
          </div>
          {artisans.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {artisans.slice(0, MAX_FEATURED_ARTISANS).map((artisan) => (
                <div
                  key={artisan.id}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/artisans/${artisan.id}`)}
                    className="p-4 flex flex-col items-center text-center"
                  >
                    <img
                      src={artisan.img}
                      alt={artisan.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-100 mb-3"
                    />
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{artisan.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{artisan.specialty}</p>
                    <p className="text-[10px] text-brand-600 font-semibold uppercase tracking-wide mt-1">{artisan.category}</p>
                  </button>
                  <div className="p-3 pt-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isLoggedIn) {
                          navigate(`/onboard?mode=login&role=client&redirect=${encodeURIComponent(`/create-project?artisan=${artisan.id}`)}`);
                        } else {
                          navigate(`/create-project?artisan=${artisan.id}`);
                        }
                      }}
                      className="w-full py-2.5 rounded-xl bg-brand-500 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-brand-600 transition-colors"
                    >
                      <MessageCircle size={16} />
                      Contacter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {artisans.length > 0 && (
            <div className="flex justify-center mt-8">
              <button
                type="button"
                onClick={() => navigate('/artisans')}
                className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                Voir tous les artisans
                <ArrowUpRight size={18} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Bandeau confiance */}
      <section className="py-10 px-6 md:px-12 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
                <Shield size={24} className="text-brand-600" />
              </div>
              <p className="text-sm font-bold text-gray-900">Paiement sécurisé</p>
              <p className="text-xs text-gray-600">Wave, Orange Money et moyens locaux</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <Star size={24} className="text-amber-600 fill-amber-600" />
              </div>
              <p className="text-sm font-bold text-gray-900">Avis vérifiés</p>
              <p className="text-xs text-gray-600">Note et retours des clients</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <p className="text-sm font-bold text-gray-900">Devis gratuit</p>
              <p className="text-xs text-gray-600">Vous ne payez qu&apos;après acceptation</p>
            </div>
          </div>
        </div>
      </section>

      {/* Notre approche produit */}
      <section className="py-16 md:py-24 px-6 md:px-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Une approche orientée artisans et développement local
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Mbouraké met l'artisan au centre. Notre produit est conçu pour aider les professionnels
              à mieux vivre de leur métier, gagner en visibilité et créer de la valeur durable dans les
              quartiers, communes et régions du Sénégal.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#FDFDFD] border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="font-black text-gray-900 text-lg mb-2">Impact terrain</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Chaque mission publiée peut devenir un revenu direct pour un artisan local et un service
                plus fiable pour les familles et entreprises.
              </p>
            </div>
            <div className="bg-[#FDFDFD] border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="font-black text-gray-900 text-lg mb-2">Confiance et transparence</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Devis clairs, profils détaillés, suivi projet, messagerie et historique des échanges :
                tout est pensé pour sécuriser la relation client-artisan.
              </p>
            </div>
            <div className="bg-[#FDFDFD] border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="font-black text-gray-900 text-lg mb-2">Croissance des artisans</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Visibilité digitale, certifications, réputation et accès à la demande : nous aidons les
                artisans à structurer leur activité et développer leur entreprise.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section id="categories-section" className="py-24 px-6 md:px-20 bg-[#FDFDFD] scroll-mt-24">
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
        <div className="mb-10 flex items-center justify-center gap-2">
          <img src="/logo-mbourake.svg" alt="Mbouraké" className="h-12 w-12 object-contain" />
          <span className="text-2xl font-black text-gray-800 tracking-tight uppercase">MBOURAKÉ</span>
        </div>
        <div className="flex flex-wrap justify-center gap-6 mb-10">
          <button 
            onClick={() => navigate('/about')}
            className="text-gray-600 hover:text-brand-500 font-bold text-sm transition-colors"
          >
            À propos
          </button>
          <button 
            onClick={() => navigate('/aide')}
            className="text-gray-600 hover:text-brand-500 font-bold text-sm transition-colors"
          >
            Aide
          </button>
          <button 
            onClick={() => navigate('/artisans')}
            className="text-gray-600 hover:text-brand-500 font-bold text-sm transition-colors"
          >
            Artisans
          </button>
          {pwaInstall?.canInstall && (
            <button
              type="button"
              onClick={() => pwaInstall.promptInstall()}
              className="flex items-center gap-2 text-gray-600 hover:text-brand-500 font-bold text-sm transition-colors"
              aria-label="Installer l'application sur votre téléphone"
            >
              <Download size={18} />
              Installer l&apos;application
            </button>
          )}
          <button 
            onClick={() => navigate('/onboard?mode=signup')}
            className="text-gray-600 hover:text-brand-500 font-bold text-sm transition-colors"
          >
            S&apos;inscrire
          </button>
          <button 
            onClick={() => navigate('/onboard?mode=login')}
            className="text-gray-600 hover:text-brand-500 font-bold text-sm transition-colors"
          >
            Se connecter
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
