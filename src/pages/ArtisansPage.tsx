import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, Heart, CheckCircle, Star, Filter, X, ChevronDown, MapPin, 
  ArrowLeft, SlidersHorizontal, Award, Clock, Verified, Briefcase
} from 'lucide-react';
import { useDiscovery } from '../hooks/useDiscovery';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabase';

interface ArtisanData {
  id: string;
  name: string;
  specialty: string;
  category: string;
  rating: number;
  reviews: number;
  status: string;
  tier: string;
  location: string;
  verified: boolean;
  img: string;
  bio: string;
}

export function ArtisansPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { categories } = useDiscovery();
  const { user } = useAuth();
  const { profile } = useProfile();
  
  // Artisans from DB
  const [artisans, setArtisans] = useState<ArtisanData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || '');
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  const isLoggedIn = !!user && !!profile;
  
  // Fetch artisans from database
  useEffect(() => {
    const fetchArtisans = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, full_name, avatar_url, location,
          artisans (
            bio, specialty, verification_status,
            categories (name)
          )
        `)
        .eq('role', 'artisan')
        .limit(50);
      
      if (data) {
        const formattedArtisans: ArtisanData[] = data.map((p: any) => ({
          id: p.id,
          name: p.full_name || 'Artisan',
          specialty: p.artisans?.specialty || '',
          category: p.artisans?.categories?.name || 'Autre',
          rating: 4.5 + Math.random() * 0.5, // Placeholder - will come from reviews
          reviews: Math.floor(Math.random() * 50) + 5,
          status: 'Disponible',
          tier: ['Platine', 'Or', 'Argent', 'Bronze'][Math.floor(Math.random() * 4)],
          location: p.location || 'Sénégal',
          verified: p.artisans?.verification_status === 'verified',
          img: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || 'A')}&background=F97316&color=fff`,
          bio: p.artisans?.bio || '',
        }));
        setArtisans(formattedArtisans);
      }
      
      setLoading(false);
    };
    
    fetchArtisans();
  }, []);
  
  // Filter artisans
  const filteredArtisans = useMemo(() => {
    return artisans.filter(artisan => {
      // Search filter
      if (searchQuery && !artisan.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !artisan.specialty.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Category filter
      if (selectedCategory && artisan.category !== selectedCategory) {
        return false;
      }
      // Rating filter
      if (selectedRating && artisan.rating < selectedRating) {
        return false;
      }
      // Tier filter
      if (selectedTier && artisan.tier !== selectedTier) {
        return false;
      }
      // Status filter
      if (selectedStatus && artisan.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [artisans, searchQuery, selectedCategory, selectedRating, selectedTier, selectedStatus]);
  
  // Sort by rating (highest first)
  const sortedArtisans = useMemo(() => {
    return [...filteredArtisans].sort((a, b) => b.rating - a.rating);
  }, [filteredArtisans]);
  
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedRating(null);
    setSelectedTier('');
    setSelectedStatus('');
  };
  
  const hasActiveFilters = searchQuery || selectedCategory || selectedRating || selectedTier || selectedStatus;
  
  const uniqueCategories = [...new Set(artisans.map(a => a.category))];

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/landing')}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900">Artisans</h1>
              <p className="text-xs text-gray-400 font-bold">{sortedArtisans.length} professionnels trouvés</p>
            </div>
          </div>
          {isLoggedIn ? (
            <button 
              onClick={() => navigate('/dashboard')}
              className="bg-brand-500 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-brand-600 transition-all"
            >
              Tableau de bord
            </button>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className="bg-brand-500 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-brand-600 transition-all"
            >
              Connexion
            </button>
          )}
        </div>
      </header>
      
      {/* Search & Filters Bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 focus-within:border-brand-300 focus-within:ring-2 ring-brand-100 transition-all">
              <Search size={20} className="text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un artisan ou une spécialité..."
                className="flex-1 bg-transparent outline-none text-gray-700 font-medium"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              )}
            </div>
            
            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
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
          
          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-100 animate-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Catégorie</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm text-gray-700 focus:outline-none focus:border-brand-300"
                  >
                    <option value="">Toutes</option>
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                {/* Rating Filter */}
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Note minimum</label>
                  <select
                    value={selectedRating || ''}
                    onChange={(e) => setSelectedRating(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm text-gray-700 focus:outline-none focus:border-brand-300"
                  >
                    <option value="">Toutes</option>
                    <option value="4.5">4.5+ étoiles</option>
                    <option value="4">4+ étoiles</option>
                    <option value="3.5">3.5+ étoiles</option>
                    <option value="3">3+ étoiles</option>
                  </select>
                </div>
                
                {/* Tier Filter */}
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Niveau Expert</label>
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
                
                {/* Status Filter */}
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Disponibilité</label>
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
              </div>
              
              {hasActiveFilters && (
                <button
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
      
      {/* Quick Filter Pills */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-wrap gap-2">
          {['Platine', 'Or', 'Disponible', '4.5+ étoiles'].map(pill => (
            <button
              key={pill}
              onClick={() => {
                if (pill === 'Platine' || pill === 'Or') setSelectedTier(selectedTier === pill ? '' : pill);
                else if (pill === 'Disponible') setSelectedStatus(selectedStatus === pill ? '' : pill);
                else if (pill === '4.5+ étoiles') setSelectedRating(selectedRating === 4.5 ? null : 4.5);
              }}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                (pill === selectedTier) || (pill === selectedStatus) || (pill === '4.5+ étoiles' && selectedRating === 4.5)
                  ? 'bg-brand-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300'
              }`}
            >
              {pill}
            </button>
          ))}
        </div>
      </div>
      
      {/* Artisans Grid */}
      <main className="max-w-7xl mx-auto px-6 pb-20">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 font-medium">Chargement des artisans...</p>
            </div>
          </div>
        ) : sortedArtisans.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={32} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Aucun artisan trouvé</h3>
            <p className="text-gray-500 mb-6">Essayez de modifier vos filtres</p>
            <button
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
                  
                  {/* Status Badge */}
                  <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg ${
                    artisan.status === 'Disponible' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
                  }`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {artisan.status}
                  </div>
                  
                  {/* Tier Badge */}
                  <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg ${
                    artisan.tier === 'Platine' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' :
                    artisan.tier === 'Or' ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white' :
                    artisan.tier === 'Argent' ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white' :
                    'bg-gradient-to-r from-orange-300 to-orange-400 text-white'
                  }`}>
                    <Award size={12} className="inline mr-1" />
                    {artisan.tier}
                  </div>
                  
                  {/* Favorite Button */}
                  <button className="absolute bottom-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-brand-500 transition-all shadow-lg">
                    <Heart size={18} />
                  </button>
                  
                  {/* Location */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-white/90 text-xs font-bold">
                    <MapPin size={14} />
                    {artisan.location}
                  </div>
                </div>
                
                <div className="p-6">
                  {/* Category */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em]">{artisan.category}</span>
                    {artisan.verified && (
                      <span className="flex items-center gap-1 text-green-600 text-[10px] font-bold">
                        <Verified size={14} fill="currentColor" className="fill-green-100" />
                        Vérifié
                      </span>
                    )}
                  </div>
                  
                  {/* Name */}
                  <h3 className="text-lg font-black text-gray-900 mb-1">{artisan.name}</h3>
                  <p className="text-sm text-gray-500 font-medium mb-4">{artisan.specialty}</p>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, idx) => (
                        <Star 
                          key={idx} 
                          size={14} 
                          className={idx < Math.floor(artisan.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} 
                        />
                      ))}
                    </div>
                    <span className="text-gray-900 font-black text-sm">{artisan.rating}</span>
                    <span className="text-gray-400 text-xs font-bold">({artisan.reviews} avis)</span>
                  </div>
                  
                  {/* Bio Preview */}
                  <p className="text-xs text-gray-500 leading-relaxed mb-6 line-clamp-2">{artisan.bio}</p>
                  
                  {/* CTA */}
                  <button 
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
