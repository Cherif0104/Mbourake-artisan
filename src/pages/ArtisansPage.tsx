import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Star, MapPin, ArrowLeft, SlidersHorizontal,
  Award, CheckCircle, ChevronRight, Users
} from 'lucide-react';
import { useDiscovery } from '../hooks/useDiscovery';
import { useAuth } from '../hooks/useAuth';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabase';
import { getTier, TIER_COLORS } from '../utils/artisanUtils';
import type { ArtisanTier } from '../utils/artisanUtils';

interface ArtisanData {
  id: string;
  name: string;
  specialty: string;
  category: string;
  categorySlug: string;
  rating: number;
  reviews: number;
  projects_completed: number;
  status: string;
  tier: ArtisanTier;
  location: string;
  verified: boolean;
  img: string;
  bio: string;
  is_available: boolean;
  affiliationTypes: string[];
}

function normalizeForSearch(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

const MAX_SUGGESTION_ARTISANS = 6;

export function ArtisansPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { categories } = useDiscovery();
  const { user } = useAuth();
  const { profile } = useProfile();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [artisans, setArtisans] = useState<ArtisanData[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || '');
  const [selectedLocation, setSelectedLocation] = useState<string>(searchParams.get('region') || '');
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedAffiliation, setSelectedAffiliation] = useState<string>(searchParams.get('affiliation') || '');
  const [showFilters, setShowFilters] = useState(false);

  const isLoggedIn = !!user && !!profile;

  useEffect(() => {
    const fetchArtisans = async () => {
      setLoading(true);

      const { data: artisansData, error: artisansError } = await supabase
        .from('artisans')
        .select(`
          id, bio, specialty, verification_status, is_available, rating_avg,
          category_id, portfolio_urls,
          categories (name, slug)
        `)
        .limit(200);

      if (artisansError) {
        console.error('Error fetching artisans:', artisansError);
        setArtisans([]);
        setLoading(false);
        return;
      }

      if (!artisansData || artisansData.length === 0) {
        setArtisans([]);
        setLoading(false);
        return;
      }

      const artisanIds = artisansData.map((a: any) => a.id);

      const [profilesRes, reviewsRes, quotesRes, affiliationsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, avatar_url, location').in('id', artisanIds),
        supabase.from('reviews').select('artisan_id').in('artisan_id', artisanIds),
        supabase
          .from('quotes')
          .select('artisan_id')
          .in('artisan_id', artisanIds)
          .eq('status', 'accepted'),
        supabase
          .from('artisan_affiliations')
          .select('artisan_id, affiliation_type')
          .in('artisan_id', artisanIds)
          .eq('status', 'verified'),
      ]);

      const profilesMap: Record<string, any> = {};
      if (profilesRes.data) {
        profilesRes.data.forEach((p: any) => {
          profilesMap[p.id] = p;
        });
      }

      const reviewCountMap: Record<string, number> = {};
      if (reviewsRes.data) {
        reviewsRes.data.forEach((r: any) => {
          reviewCountMap[r.artisan_id] = (reviewCountMap[r.artisan_id] || 0) + 1;
        });
      }

      const projectCountMap: Record<string, number> = {};
      if (quotesRes.data) {
        quotesRes.data.forEach((q: any) => {
          projectCountMap[q.artisan_id] = (projectCountMap[q.artisan_id] || 0) + 1;
        });
      }

      const affiliationMap: Record<string, string[]> = {};
      if (affiliationsRes.data) {
        affiliationsRes.data.forEach((row: any) => {
          if (!affiliationMap[row.artisan_id]) affiliationMap[row.artisan_id] = [];
          if (!affiliationMap[row.artisan_id].includes(row.affiliation_type)) {
            affiliationMap[row.artisan_id].push(row.affiliation_type);
          }
        });
      }

      const formatted: ArtisanData[] = artisansData.map((a: any) => {
        const profileRow = profilesMap[a.id];
        const fullName = profileRow?.full_name?.trim() || 'Artisan';
        const location = profileRow?.location?.trim() || 'Sénégal';
        const avatarUrl = profileRow?.avatar_url?.trim() || null;
        const reviewCount = reviewCountMap[a.id] || 0;
        const projectCount = projectCountMap[a.id] || 0;
        const categoryName = a.categories?.name || 'Autre';
        const categorySlug = a.categories?.slug || '';

        return {
          id: a.id,
          name: fullName,
          specialty: a.specialty?.trim() || 'Spécialiste',
          category: categoryName,
          categorySlug,
          rating: a.rating_avg ?? 0,
          reviews: reviewCount,
          projects_completed: projectCount,
          status: a.is_available !== false ? 'Disponible' : 'Occupé',
          tier: getTier(projectCount),
          location,
          verified: a.verification_status === 'verified',
          img:
            avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=F97316&color=fff`,
          bio: a.bio?.trim() || '',
          is_available: a.is_available !== false,
          affiliationTypes: affiliationMap[a.id] || [],
        };
      });

      setArtisans(formatted);
      setLoading(false);
    };

    fetchArtisans();
  }, []);

  const suggestionCategories = useMemo(() => {
    const q = normalizeForSearch(searchQuery.trim());
    if (!q) return categories.slice(0, 12);
    return categories.filter((c) => normalizeForSearch(c.name).includes(q)).slice(0, 10);
  }, [searchQuery, categories]);

  const suggestionArtisans = useMemo(() => {
    const q = normalizeForSearch(searchQuery.trim());
    if (!q || q.length < 2) return [];
    return artisans
      .filter(
        (a) =>
          normalizeForSearch(a.name).includes(q) ||
          normalizeForSearch(a.specialty).includes(q) ||
          normalizeForSearch(a.category).includes(q)
      )
      .slice(0, MAX_SUGGESTION_ARTISANS);
  }, [searchQuery, artisans]);

  const hasSuggestions = suggestionCategories.length > 0 || suggestionArtisans.length > 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredArtisans = useMemo(() => {
    const queryNorm = normalizeForSearch(searchQuery.trim());
    return artisans.filter((artisan) => {
      if (queryNorm) {
        const nameNorm = normalizeForSearch(artisan.name);
        const specialtyNorm = normalizeForSearch(artisan.specialty);
        const categoryNorm = normalizeForSearch(artisan.category);
        const bioNorm = normalizeForSearch(artisan.bio);
        const match =
          nameNorm.includes(queryNorm) ||
          specialtyNorm.includes(queryNorm) ||
          categoryNorm.includes(queryNorm) ||
          bioNorm.includes(queryNorm);
        if (!match) return false;
      }
      if (selectedCategory && artisan.category !== selectedCategory) return false;
      if (selectedLocation && artisan.location !== selectedLocation) return false;
      if (selectedRating != null && artisan.rating < selectedRating) return false;
      if (selectedTier && artisan.tier !== selectedTier) return false;
      if (selectedStatus && artisan.status !== selectedStatus) return false;
      if (selectedAffiliation && (!artisan.affiliationTypes || !artisan.affiliationTypes.includes(selectedAffiliation))) return false;
      return true;
    });
  }, [
    artisans,
    searchQuery,
    selectedCategory,
    selectedLocation,
    selectedRating,
    selectedTier,
    selectedStatus,
    selectedAffiliation,
  ]);

  const sortedArtisans = useMemo(
    () => [...filteredArtisans].sort((a, b) => b.rating - a.rating),
    [filteredArtisans]
  );

  const availableLocations = useMemo(() => {
    const set = new Set<string>();
    artisans.forEach((a) => {
      if (a.location?.trim()) set.add(a.location.trim());
    });
    return Array.from(set).sort();
  }, [artisans]);

  const uniqueCategoryNames = useMemo(() => {
    const fromArtisans = new Set(artisans.map((a) => a.category));
    categories.forEach((c) => fromArtisans.add(c.name));
    return Array.from(fromArtisans).sort();
  }, [artisans, categories]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedLocation('');
    setSelectedRating(null);
    setSelectedTier('');
    setSelectedStatus('');
    setSelectedAffiliation('');
    setShowSuggestions(false);
  };

  const hasActiveFilters =
    !!(
      searchQuery ||
      selectedCategory ||
      selectedLocation ||
      selectedRating ||
      selectedTier ||
      selectedStatus ||
      selectedAffiliation
    );

  const handleSelectCategorySuggestion = (slug: string) => {
    setShowSuggestions(false);
    setSearchQuery('');
    navigate(`/category/${slug}`);
  };

  const handleSelectArtisanSuggestion = (id: string) => {
    setShowSuggestions(false);
    setSearchQuery('');
    navigate(`/artisans/${id}`);
  };

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header minimal */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate(isLoggedIn ? '/dashboard' : '/')}
            className="p-2.5 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            aria-label={isLoggedIn ? 'Retour au tableau de bord' : "Retour à l'accueil"}
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <span className="text-lg font-bold text-gray-900 truncate">Artisans</span>
          {!isLoggedIn ? (
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 transition-colors"
            >
              Connexion
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </header>

      {/* Hero + recherche */}
      <section className="relative border-b border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 text-brand-600 text-xs font-bold uppercase tracking-wider mb-4">
              <Users size={14} />
              Profils publics
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
              Découvrez nos artisans
            </h1>
            <p className="text-gray-500 text-sm sm:text-base max-w-md">
              {sortedArtisans.length} professionnel{sortedArtisans.length > 1 ? 's' : ''} — consultez avis, réalisations et boutique.
            </p>
          </div>

          <div ref={searchContainerRef} className="relative max-w-xl mx-auto">
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3.5 border border-gray-100 focus-within:border-brand-200 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
              <Search size={20} className="text-gray-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Rechercher un métier, un nom, une catégorie…"
                className="flex-1 bg-transparent outline-none text-gray-800 font-medium min-w-0 placeholder:text-gray-400"
                autoComplete="off"
              />
            </div>

            {showSuggestions && hasSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
                {suggestionCategories.length > 0 && (
                  <div className="p-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-2">Catégories</p>
                    {suggestionCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectCategorySuggestion(cat.slug || String(cat.id))}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl hover:bg-gray-50 text-left transition-colors"
                      >
                        <span className="font-medium text-gray-900 truncate">{cat.name}</span>
                        <ChevronRight size={16} className="text-gray-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
                {suggestionArtisans.length > 0 && (
                  <div className="p-2 border-t border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-2">Artisans</p>
                    {suggestionArtisans.map((artisan) => (
                      <button
                        key={artisan.id}
                        type="button"
                        onClick={() => handleSelectArtisanSuggestion(artisan.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-left transition-colors"
                      >
                        <img
                          src={artisan.img}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 truncate">{artisan.name}</p>
                          <p className="text-xs text-gray-500 truncate">{artisan.specialty} · {artisan.category}</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Filtres compacts */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                showFilters || hasActiveFilters
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-200/40'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <SlidersHorizontal size={18} />
              Filtres
              {hasActiveFilters && (
                <span className="w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">!</span>
              )}
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Tout effacer
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Catégorie</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
                >
                  <option value="">Toutes</option>
                  {uniqueCategoryNames.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Région</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
                >
                  <option value="">Toutes</option>
                  {availableLocations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Note min.</label>
                <select
                  value={selectedRating ?? ''}
                  onChange={(e) => setSelectedRating(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
                >
                  <option value="">Toutes</option>
                  <option value="4.5">4.5+</option>
                  <option value="4">4+</option>
                  <option value="3.5">3.5+</option>
                  <option value="3">3+</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Niveau</label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
                >
                  <option value="">Tous</option>
                  <option value="Platine">Platine</option>
                  <option value="Or">Or</option>
                  <option value="Argent">Argent</option>
                  <option value="Bronze">Bronze</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Dispo.</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
                >
                  <option value="">Tous</option>
                  <option value="Disponible">Disponible</option>
                  <option value="Occupé">Occupé</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Affiliation</label>
                <select
                  value={selectedAffiliation}
                  onChange={(e) => setSelectedAffiliation(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
                >
                  <option value="">Toutes</option>
                  <option value="chambre">Chambre de métier</option>
                  <option value="sae">SAE</option>
                  <option value="incubateur">Incubateur</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Grille artisans */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        {sortedArtisans.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <Search size={32} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Aucun artisan trouvé</h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              Modifiez la recherche ou les filtres pour afficher plus de résultats.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="px-6 py-3 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {sortedArtisans.map((artisan, i) => (
              <article
                key={artisan.id}
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/artisans/${artisan.id}`)}
                  className="block w-full text-left"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    <img
                      src={artisan.img}
                      alt={artisan.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                          artisan.status === 'Disponible' ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'
                        }`}
                      >
                        {artisan.status === 'Disponible' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        {artisan.status}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${TIER_COLORS[artisan.tier]}`}>
                        <Award size={12} />
                        {artisan.tier}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white/90 text-xs font-medium drop-shadow">
                      <MapPin size={14} />
                      {artisan.location}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                        {artisan.category}
                      </span>
                      {artisan.verified && (
                        <span className="inline-flex items-center gap-0.5 text-emerald-600 text-[10px] font-bold">
                          <CheckCircle size={12} />
                          Vérifié
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-0.5 group-hover:text-brand-600 transition-colors">
                      {artisan.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">{artisan.specialty}</p>
                    <div className="flex items-center gap-2 text-sm mb-4">
                      <div className="flex items-center gap-0.5 text-amber-500">
                        <Star size={16} fill="currentColor" />
                        <span className="font-bold text-gray-900">{artisan.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-500">{artisan.reviews} avis</span>
                    </div>
                    {artisan.bio && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-4">{artisan.bio}</p>
                    )}
                    <span className="inline-flex items-center gap-2 text-brand-600 font-bold text-sm">
                      Voir le profil public
                      <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </button>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
