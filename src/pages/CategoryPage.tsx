import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, Heart, CheckCircle, Star, ArrowLeft, MapPin, 
  Award, Filter, X, ChevronDown, SlidersHorizontal, Shield,
  User, Briefcase, PlusCircle, Image
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabase';
import { getTier, TIER_COLORS } from '../utils/artisanUtils';
import { BackButton } from '../components/BackButton';
import { LoadingOverlay } from '../components/LoadingOverlay';

interface ArtisanData {
  id: string;
  name: string;
  specialty: string;
  category: string;
  category_id: number;
  rating: number;
  reviews: number;
  projects_completed: number;
  is_available: boolean;
  tier: 'Platine' | 'Or' | 'Argent' | 'Bronze';
  location: string;
  verified: boolean;
  img: string;
  bio: string;
  portfolio_first_image: string | null;
}

interface CategoryData {
  id: number;
  name: string;
  icon_name: string;
  slug: string;
}

type SortOption = 'rating' | 'reviews' | 'projects' | 'tier';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { profile } = useProfile();
  
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [artisans, setArtisans] = useState<ArtisanData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [showFilters, setShowFilters] = useState(false);
  
  const isLoggedIn = !!user && !!profile;
  const isClient = profile?.role === 'client';
  
  // Fetch category and artisans
  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      setLoading(true);
      
      // 1. Get category by slug
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (catError || !catData) {
        // Try by ID if slug doesn't work
        const categoryId = parseInt(slug);
        if (!isNaN(categoryId)) {
          const { data: catById } = await supabase
            .from('categories')
            .select('*')
            .eq('id', categoryId)
            .single();
          if (catById) {
            setCategory(catById);
          }
        } else {
          setLoading(false);
          return;
        }
      } else {
        setCategory(catData);
      }
      
      const categoryId = catData?.id || parseInt(slug);
      
      // 2. Get artisans in this category
      const { data: artisansData, error: artisansError } = await supabase
        .from('artisans')
        .select(`
          id, bio, specialty, verification_status, is_available, rating_avg,
          category_id, portfolio_urls,
          categories (name, slug)
        `)
        .eq('category_id', categoryId);
      
      if (artisansError) {
        console.error('Error fetching artisans:', artisansError);
      }
      
      // 3. Récupérer les profils séparément pour éviter les problèmes de jointure
      let profilesMap: Record<string, any> = {};
      if (artisansData && artisansData.length > 0) {
        const artisanIds = artisansData.map(a => a.id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, location')
          .in('id', artisanIds);
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        } else if (profilesData) {
          // Créer une map pour accès rapide
          profilesMap = profilesData.reduce((acc: Record<string, any>, profile: any) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
        }
      }
      
      // 4. Get review counts for each artisan
      if (artisansData && artisansData.length > 0) {
        const formattedArtisans: ArtisanData[] = await Promise.all(
          artisansData.map(async (a: any) => {
            // Get review count
            const { count: reviewCount } = await supabase
              .from('reviews')
              .select('*', { count: 'exact', head: true })
              .eq('artisan_id', a.id);
            
            // Get completed projects count
            const { count: projectCount } = await supabase
              .from('quotes')
              .select('*', { count: 'exact', head: true })
              .eq('artisan_id', a.id)
              .eq('status', 'accepted');
            
            // Récupérer les vraies données depuis la base de données
            // Ne pas utiliser de valeurs par défaut qui masquent les vraies données
            const portfolioUrls = Array.isArray(a.portfolio_urls) ? a.portfolio_urls.filter((url: string) => url && url.trim() !== '') : [];
            
            // Récupérer le profil depuis la map
            const profile = profilesMap[a.id];
            
            const fullName = profile?.full_name?.trim() || null;
            const specialty = a.specialty?.trim() || null;
            const location = profile?.location?.trim() || null;
            const avatarUrl = profile?.avatar_url?.trim() || null;
            const bio = a.bio?.trim() || null;
            
            // Log pour debug (à retirer en production)
            console.log('Artisan data:', {
              id: a.id,
              fullName,
              specialty,
              location,
              avatarUrl,
              portfolioUrls: portfolioUrls.length,
              bio: bio ? bio.substring(0, 50) : null,
              profileData: profile
            });
            
            return {
              id: a.id,
              name: fullName || 'Artisan',
              specialty: specialty || 'Spécialiste',
              category: a.categories?.name || 'Autre',
              category_id: a.category_id,
              rating: a.rating_avg || 0,
              reviews: reviewCount || 0,
              projects_completed: projectCount || 0,
              is_available: a.is_available !== false,
              tier: getTier(projectCount || 0),
              location: location || 'Localisation non renseignée',
              verified: a.verification_status === 'verified',
              img: avatarUrl || (fullName ? `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=F97316&color=fff` : `https://ui-avatars.com/api/?name=Artisan&background=F97316&color=fff`),
              bio: bio || '',
              portfolio_first_image: portfolioUrls.length > 0 ? portfolioUrls[0] : null,
            };
          })
        );
        setArtisans(formattedArtisans);
      } else {
        console.warn('No artisans data found for category:', categoryId);
        setArtisans([]);
      }
      
      setLoading(false);
    };
    
    fetchData();
  }, [slug]);
  
  // Liste des localisations disponibles pour le filtre
  const availableLocations = useMemo(() => {
    const set = new Set<string>();
    artisans.forEach((a) => {
      if (a.location && a.location.trim()) {
        set.add(a.location.trim());
      }
    });
    return Array.from(set).sort();
  }, [artisans]);

  // Filter artisans
  const filteredArtisans = useMemo(() => {
    return artisans.filter((artisan) => {
      if (
        searchQuery &&
        !artisan.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !artisan.specialty.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (selectedRating && artisan.rating < selectedRating) {
        return false;
      }
      if (selectedTier && artisan.tier !== selectedTier) {
        return false;
      }
      if (onlyAvailable && !artisan.is_available) {
        return false;
      }
      if (onlyVerified && !artisan.verified) {
        return false;
      }
      if (selectedLocation && artisan.location !== selectedLocation) {
        return false;
      }
      return true;
    });
  }, [artisans, searchQuery, selectedRating, selectedTier, onlyAvailable, onlyVerified, selectedLocation]);
  
  // Sort artisans
  const sortedArtisans = useMemo(() => {
    return [...filteredArtisans].sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'reviews':
          return b.reviews - a.reviews;
        case 'projects':
          return b.projects_completed - a.projects_completed;
        case 'tier':
          const tierOrder = { 'Platine': 4, 'Or': 3, 'Argent': 2, 'Bronze': 1 };
          return tierOrder[b.tier] - tierOrder[a.tier];
        default:
          return 0;
      }
    });
  }, [filteredArtisans, sortBy]);
  
  const hasActiveFilters =
    !!(searchQuery || selectedRating || selectedTier || selectedLocation || onlyAvailable || onlyVerified);
  
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedRating(null);
    setSelectedTier('');
    setSelectedLocation('');
    setOnlyAvailable(false);
    setOnlyVerified(false);
  };

  if (loading) {
    return <LoadingOverlay />;
  }

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Catégorie introuvable</h2>
          <p className="text-gray-500 mb-6">Cette catégorie n'existe pas ou a été supprimée.</p>
          <button 
            onClick={() => navigate('/artisans')}
            className="px-6 py-3 bg-brand-500 text-white font-bold rounded-xl"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-xl font-black text-gray-900">{category.name}</h1>
              <p className="text-xs text-gray-400 font-bold">
                {sortedArtisans.length} artisan{sortedArtisans.length > 1 ? 's' : ''} trouvé{sortedArtisans.length > 1 ? 's' : ''}{' '}
                {availableLocations.length > 0 && selectedLocation && `• ${selectedLocation}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                {isClient && (
                  <button 
                    onClick={() => navigate(`/create-project?category=${category.id}`)}
                    className="hidden md:flex items-center gap-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-brand-600 transition-all"
                  >
                    <PlusCircle size={16} />
                    Publier un projet
                  </button>
                )}
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  <User size={16} />
                  Tableau de bord
                </button>
              </>
            ) : (
              <button 
                onClick={() => navigate('/')}
                className="bg-brand-500 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-brand-600 transition-all"
              >
                Connexion
              </button>
            )}
          </div>
        </div>
      </header>
      
      {/* Filter Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 focus-within:border-brand-300 focus-within:ring-2 ring-brand-100 transition-all">
              <Search size={20} className="text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un artisan..."
                className="flex-1 bg-transparent outline-none text-gray-700 font-medium"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              )}
            </div>
            
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm text-gray-700 focus:outline-none focus:border-brand-300"
              >
                <option value="rating">Trier par note</option>
                <option value="reviews">Trier par avis</option>
                <option value="projects">Trier par projets</option>
                <option value="tier">Trier par niveau</option>
              </select>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                  showFilters || hasActiveFilters
                    ? 'bg-brand-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <SlidersHorizontal size={16} />
                Filtres
              </button>
            </div>
          </div>
          
          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
              <div className="flex flex-wrap gap-4">
                {/* Rating Filter */}
                <select
                  value={selectedRating || ''}
                  onChange={(e) => setSelectedRating(e.target.value ? Number(e.target.value) : null)}
                  className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm text-gray-700"
                >
                  <option value="">Note minimum</option>
                  <option value="4.5">4.5+ étoiles</option>
                  <option value="4">4+ étoiles</option>
                  <option value="3">3+ étoiles</option>
                </select>
                
                {/* Tier Filter */}
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm text-gray-700"
                >
                  <option value="">Tous les niveaux</option>
                  <option value="Platine">Platine</option>
                  <option value="Or">Or</option>
                  <option value="Argent">Argent</option>
                  <option value="Bronze">Bronze</option>
                </select>
                
                {/* Toggle Buttons */}
                <button
                  onClick={() => setOnlyAvailable(!onlyAvailable)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    onlyAvailable ? 'bg-green-500 text-white' : 'bg-gray-50 text-gray-600 border border-gray-100'
                  }`}
                >
                  Disponible uniquement
                </button>
                
                <button
                  onClick={() => setOnlyVerified(!onlyVerified)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                    onlyVerified ? 'bg-blue-500 text-white' : 'bg-gray-50 text-gray-600 border border-gray-100'
                  }`}
                >
                  <Shield size={14} />
                  Vérifiés uniquement
                </button>
                
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2.5 text-brand-500 font-bold text-sm hover:underline"
                  >
                    Effacer les filtres
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* CTA for Clients (Mobile) */}
      {isClient && (
        <div className="md:hidden bg-brand-50 border-b border-brand-100 px-4 py-3">
          <button 
            onClick={() => navigate(`/create-project?category=${category.id}`)}
            className="w-full flex items-center justify-center gap-2 bg-brand-500 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg"
          >
            <PlusCircle size={18} />
            Créer un projet dans cette catégorie
          </button>
        </div>
      )}
      
      {/* Artisans Grid */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {sortedArtisans.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Briefcase size={32} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Aucun artisan dans cette catégorie</h3>
            <p className="text-gray-500 mb-6">
              {hasActiveFilters 
                ? "Essayez de modifier vos filtres" 
                : "Les premiers artisans arrivent bientôt !"}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-6 py-3 bg-brand-500 text-white font-bold rounded-xl"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedArtisans.map((artisan, i) => (
              <div 
                key={artisan.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* Image Section */}
                <div className="relative h-56 overflow-hidden bg-gray-100">
                  {/* Portfolio image or avatar - Toujours afficher la vraie image */}
                  {artisan.portfolio_first_image ? (
                    <img 
                      src={artisan.portfolio_first_image} 
                      alt={`Portfolio de ${artisan.name}`} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      onError={(e) => {
                        // Si l'image du portfolio échoue, utiliser l'avatar
                        const target = e.target as HTMLImageElement;
                        if (artisan.img && target.src !== artisan.img) {
                          target.src = artisan.img;
                        }
                      }}
                    />
                  ) : artisan.img ? (
                    <img 
                      src={artisan.img} 
                      alt={artisan.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-100 to-orange-100 flex items-center justify-center">
                      <User size={48} className="text-gray-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  
                  {/* Photo de profil en overlay - Toujours afficher si disponible */}
                  {artisan.img && (
                    <div className="absolute top-3 left-3">
                      <div className="w-12 h-12 rounded-xl border-2 border-white/90 shadow-lg overflow-hidden bg-white">
                        <img 
                          src={artisan.img} 
                          alt={artisan.name} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            // Si l'avatar échoue, masquer l'overlay
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg ${
                    artisan.is_available ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full bg-white ${artisan.is_available ? 'animate-pulse' : ''}`} />
                    {artisan.is_available ? 'Disponible' : 'Occupé'}
                  </div>
                  
                  {/* Tier Badge */}
                  <div className={`absolute top-14 right-3 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg ${TIER_COLORS[artisan.tier]}`}>
                    <Award size={12} />
                    {artisan.tier}
                  </div>
                  
                  {/* Location - Plus visible */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="flex items-center gap-1.5 text-white text-xs font-bold bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                      <MapPin size={14} />
                      <span>{artisan.location}</span>
                    </div>
                  </div>
                  
                  {/* Verified Badge */}
                  {artisan.verified && (
                    <div className="absolute top-14 left-3 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg border-2 border-white">
                      <Shield size={14} className="text-white" />
                    </div>
                  )}
                </div>
                
                {/* Content Section */}
                <div className="p-5">
                  <h3 className="text-lg font-black text-gray-900 mb-1 flex items-center gap-2">
                    {artisan.name}
                    {artisan.verified && <CheckCircle size={16} className="text-blue-500" />}
                  </h3>
                  
                  {artisan.specialty && (
                    <p className="text-sm text-brand-600 font-bold mb-3">
                      {artisan.specialty}
                    </p>
                  )}
                  
                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <Star size={16} className="text-yellow-400 fill-yellow-400" />
                      <span className="font-black text-gray-900">{artisan.rating.toFixed(1)}</span>
                      <span className="text-gray-400 text-xs">({artisan.reviews} avis)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Briefcase size={16} />
                      <span className="font-bold text-sm">{artisan.projects_completed} projets</span>
                    </div>
                  </div>
                  
                  {/* Bio Preview */}
                  {artisan.bio && (
                    <p className="text-xs text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                      {artisan.bio}
                    </p>
                  )}
                  
                  {/* Portfolio indicator */}
                  {artisan.portfolio_first_image && (
                    <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
                      <Image size={14} />
                      <span className="font-medium">Portfolio disponible</span>
                    </div>
                  )}
                  
                  {/* CTA */}
                  <button 
                    onClick={() => navigate(`/artisans/${artisan.id}`)}
                    className="w-full py-3 bg-gray-900 text-white font-black rounded-xl hover:bg-brand-500 active:scale-[0.98] transition-all uppercase tracking-widest text-[10px]"
                  >
                    Voir le profil complet
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      {/* Floating CTA for logged-in clients */}
      {isClient && sortedArtisans.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40 md:hidden">
          <button 
            onClick={() => navigate(`/create-project?category=${category.id}`)}
            className="flex items-center gap-2 bg-brand-500 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-brand-500/30 hover:bg-brand-600 transition-all"
          >
            <PlusCircle size={18} />
            Créer un projet
          </button>
        </div>
      )}
    </div>
  );
}
