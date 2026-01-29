import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Heart, Star, X, MapPin, ArrowLeft, SlidersHorizontal,
  Award, Verified, ChevronRight
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

  // Charger les artisans depuis la table artisans (+ profils + counts en batch)
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

  // Suggestions : catégories (et artisans) qui matchent la saisie
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

  // Fermer les suggestions au clic extérieur
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

  // Catégories présentes parmi les artisans + toutes pour le filtre (éviter liste vide)
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
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label="Retour au tableau de bord"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900">Explorer les artisans</h1>
              <p className="text-xs text-gray-400 font-bold">
                {sortedArtisans.length} professionnel{sortedArtisans.length > 1 ? 's' : ''} trouvé
                {sortedArtisans.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {!isLoggedIn && (
            <button
              onClick={() => navigate('/')}
              className="bg-brand-500 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-brand-600 transition-all"
            >
              Connexion
            </button>
          )}
        </div>
      </header>

      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Barre de recherche avec suggestions */}
            <div ref={searchContainerRef} className="flex-1 relative">
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 focus-within:border-brand-300 focus-within:ring-2 ring-brand-100 transition-all">
                <Search size={20} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Rechercher une catégorie (ex. Couture), un artisan..."
                  className="flex-1 bg-transparent outline-none text-gray-700 font-medium min-w-0"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setShowSuggestions(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 shrink-0"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {showSuggestions && hasSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
                  {suggestionCategories.length > 0 && (
                    <div className="p-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-2">
                        Catégories
                      </p>
                      {suggestionCategories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelectCategorySuggestion(cat.slug || String(cat.id))}
                          className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg hover:bg-brand-50 text-left transition-colors"
                        >
                          <span className="font-bold text-gray-900 truncate">{cat.name}</span>
                          <ChevronRight size={16} className="text-gray-400 shrink-0" />
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
                          onClick={() => handleSelectArtisanSuggestion(artisan.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-brand-50 text-left transition-colors"
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
                          <ChevronRight size={16} className="text-gray-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shrink-0 ${
                showFilters || hasActiveFilters
                  ? 'bg-brand-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <SlidersHorizontal size={18} />
              Filtres
              {hasActiveFilters && (
                <span className="w-5 h-5 bg-white text-brand-500 rounded-full text-[10px] flex items-center justify-center">
                  !
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-100 animate-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                    Catégorie
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm text-gray-700 focus:outline-none focus:border-brand-300"
                  >
                    <option value="">Toutes</option>
                    {uniqueCategoryNames.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                    Région
                  </label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm text-gray-700 focus:outline-none focus:border-brand-300"
                  >
                    <option value="">Toutes</option>
                    {availableLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                    Note minimum
                  </label>
                  <select
                    value={selectedRating ?? ''}
                    onChange={(e) =>
                      setSelectedRating(e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm text-gray-700 focus:outline-none focus:border-brand-300"
                  >
                    <option value="">Toutes</option>
                    <option value="4.5">4.5+ étoiles</option>
                    <option value="4">4+ étoiles</option>
                    <option value="3.5">3.5+ étoiles</option>
                    <option value="3">3+ étoiles</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                    Niveau
                  </label>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm text-gray-700 focus:outline-none focus:border-brand-300"
                  >
                    <option value="">Tous</option>
                    <option value="Platine">Platine</option>
                    <option value="Or">Or</option>
                    <option value="Argent">Argent</option>
                    <option value="Bronze">Bronze</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                    Disponibilité
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm text-gray-700 focus:outline-none focus:border-brand-300"
                  >
                    <option value="">Tous</option>
                    <option value="Disponible">Disponible</option>
                    <option value="Occupé">Occupé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                    Affiliation
                  </label>
                  <select
                    value={selectedAffiliation}
                    onChange={(e) => setSelectedAffiliation(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm text-gray-700 focus:outline-none focus:border-brand-300"
                  >
                    <option value="">Toutes</option>
                    <option value="chambre">Chambre de métier</option>
                    <option value="sae">SAE</option>
                    <option value="incubateur">Incubateur</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 text-brand-500 font-black text-xs uppercase tracking-widest hover:underline underline-offset-4"
                >
                  Effacer tous les filtres
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-wrap gap-2">
          {['Platine', 'Or', 'Disponible', '4.5+ étoiles'].map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => {
                if (pill === 'Platine' || pill === 'Or')
                  setSelectedTier(selectedTier === pill ? '' : pill);
                else if (pill === 'Disponible')
                  setSelectedStatus(selectedStatus === pill ? '' : pill);
                else if (pill === '4.5+ étoiles') setSelectedRating(selectedRating === 4.5 ? null : 4.5);
              }}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                (pill === selectedTier) ||
                (pill === selectedStatus) ||
                (pill === '4.5+ étoiles' && selectedRating === 4.5)
                  ? 'bg-brand-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300'
              }`}
            >
              {pill}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 pb-20">
        {sortedArtisans.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={32} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Aucun artisan trouvé</h3>
            <p className="text-gray-500 mb-6">
              Essayez une catégorie dans la recherche (ex. Couture) ou modifiez les filtres.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="px-6 py-3 bg-brand-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-brand-600 transition-all"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedArtisans.map((artisan, i) => (
              <div
                key={artisan.id}
                className="bg-white rounded-[2rem] overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-500 group hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={artisan.img}
                    alt={artisan.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  <div
                    className={`absolute top-4 left-4 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg ${
                      artisan.status === 'Disponible'
                        ? 'bg-green-500 text-white'
                        : 'bg-yellow-500 text-white'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full bg-white ${
                        artisan.is_available ? 'animate-pulse' : ''
                      }`}
                    />
                    {artisan.status}
                  </div>

                  <div
                    className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg ${TIER_COLORS[artisan.tier]}`}
                  >
                    <Award size={12} className="inline mr-1" />
                    {artisan.tier}
                  </div>

                  <button
                    type="button"
                    className="absolute bottom-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-brand-500 transition-all shadow-lg"
                    aria-label="Ajouter aux favoris"
                  >
                    <Heart size={18} />
                  </button>

                  <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-white/90 text-xs font-bold">
                    <MapPin size={14} />
                    {artisan.location}
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em]">
                      {artisan.category}
                    </span>
                    {artisan.verified && (
                      <span className="flex items-center gap-1 text-green-600 text-[10px] font-bold">
                        <Verified size={14} fill="currentColor" className="fill-green-100" />
                        Vérifié
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-black text-gray-900 mb-1">{artisan.name}</h3>
                  <p className="text-sm text-gray-500 font-medium mb-4">{artisan.specialty}</p>

                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3, 4].map((idx) => (
                        <Star
                          key={idx}
                          size={14}
                          className={
                            idx < Math.floor(artisan.rating)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-200'
                          }
                        />
                      ))}
                    </div>
                    <span className="text-gray-900 font-black text-sm">{artisan.rating}</span>
                    <span className="text-gray-400 text-xs font-bold">
                      ({artisan.reviews} avis)
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed mb-6 line-clamp-2">
                    {artisan.bio}
                  </p>

                  <button
                    type="button"
                    onClick={() => navigate(`/artisans/${artisan.id}`)}
                    className="w-full py-3.5 bg-gray-900 text-white font-black rounded-xl hover:bg-brand-500 active:scale-[0.98] transition-all uppercase tracking-widest text-[10px] shadow-lg"
                  >
                    Voir le profil complet
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
