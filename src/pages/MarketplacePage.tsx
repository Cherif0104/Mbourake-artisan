import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, AlertTriangle, User, Image as ImageIcon, ChevronDown, Star, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '@shared';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { HomeButton } from '../components/HomeButton';

type ProductRow = Database['public']['Tables']['products']['Row'];

type ProductWithArtisan = ProductRow & {
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    region: string | null;
    department: string | null;
    commune: string | null;
  } | null;
};

type ArtisanStats = { rating_avg: number | null; verification_status: string; reviewCount: number };

type SortBy = 'recent' | 'price_asc' | 'price_desc';

function escapeIlike(term: string): string {
  return term.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export function MarketplacePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductWithArtisan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tableUnavailable, setTableUnavailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [artisanStatsMap, setArtisanStatsMap] = useState<Record<string, ArtisanStats>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      setTableUnavailable(false);
      try {
        const select = `
            *,
            profiles!products_artisan_id_fkey (
              id,
              full_name,
              avatar_url,
              region,
              department,
              commune
            )
          `;
        let query = supabase
          .from('products')
          .select(select)
          .eq('status', 'published');

        if (debouncedSearch) {
          const escaped = escapeIlike(debouncedSearch);
          query = query.or(
            `title.ilike.%${escaped}%,description.ilike.%${escaped}%`
          );
        }

        if (sortBy === 'price_asc') {
          query = query.order('price', { ascending: true });
        } else if (sortBy === 'price_desc') {
          query = query.order('price', { ascending: false });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          const code = (fetchError as any)?.code;
          const msg = (fetchError.message || '').toLowerCase();
          const isMissing = code === 'PGRST205' || msg.includes('does not exist') || msg.includes('relation') || msg.includes('42p01');
          if (isMissing) {
            setTableUnavailable(true);
            setProducts([]);
          } else {
            setError(fetchError.message || 'Impossible de charger les produits.');
            setProducts([]);
          }
        } else {
          const list = (data as ProductWithArtisan[]) || [];
          setProducts(list);
          const artisanIds = [...new Set(list.map((p) => p.artisan_id).filter(Boolean))] as string[];
          if (artisanIds.length > 0) {
            const [artisansRes, reviewsRes] = await Promise.all([
              supabase.from('artisans').select('id, rating_avg, verification_status').in('id', artisanIds),
              supabase.from('reviews').select('artisan_id').in('artisan_id', artisanIds),
            ]);
            const reviewCountByArtisan: Record<string, number> = {};
            artisanIds.forEach((id) => { reviewCountByArtisan[id] = 0; });
            (reviewsRes.data || []).forEach((r: { artisan_id: string }) => {
              if (r.artisan_id) reviewCountByArtisan[r.artisan_id] = (reviewCountByArtisan[r.artisan_id] || 0) + 1;
            });
            const map: Record<string, ArtisanStats> = {};
            (artisansRes.data || []).forEach((a: { id: string; rating_avg: number | null; verification_status: string }) => {
              map[a.id] = {
                rating_avg: a.rating_avg ?? null,
                verification_status: a.verification_status || 'unverified',
                reviewCount: reviewCountByArtisan[a.id] || 0,
              };
            });
            artisanIds.forEach((id) => {
              if (!map[id]) map[id] = { rating_avg: null, verification_status: 'unverified', reviewCount: reviewCountByArtisan[id] || 0 };
            });
            setArtisanStatsMap(map);
          } else {
            setArtisanStatsMap({});
          }
        }
      } catch (e: any) {
        console.error('Error fetching marketplace products:', e);
        const msg = (e?.message ?? '').toLowerCase();
        const isMissing = msg.includes('does not exist') || msg.includes('relation') || msg.includes('42p01');
        if (isMissing) {
          setTableUnavailable(true);
          setProducts([]);
        } else {
          setError(e?.message ?? 'Erreur inconnue lors du chargement des produits.');
          setProducts([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [debouncedSearch, sortBy]);

  if (loading) {
    return <LoadingOverlay />;
  }

  if (error && !tableUnavailable) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertTriangle size={40} className="text-amber-500 mx-auto mb-4" />
          <h1 className="text-lg font-black text-gray-900 mb-2">Marketplace indisponible</h1>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
        <HomeButton />
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">Marketplace</h1>
          <p className="text-xs text-gray-400">Découvrir les produits des artisans</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-32 space-y-4">
        {/* Barre de recherche */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center gap-2 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="search"
            placeholder="Rechercher un produit, un artisan, un métier..."
            className="flex-1 border-none outline-none text-sm bg-transparent placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Recherche"
          />
        </div>

        {/* Tri */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-gray-500">Trier par</span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSortDropdownOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-100 text-sm font-medium text-gray-700 shadow-sm"
              aria-expanded={sortDropdownOpen}
              aria-haspopup="listbox"
            >
              {sortBy === 'recent' && 'Récents'}
              {sortBy === 'price_asc' && 'Prix croissant'}
              {sortBy === 'price_desc' && 'Prix décroissant'}
              <ChevronDown size={16} className="text-gray-400" />
            </button>
            {sortDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setSortDropdownOpen(false)}
                />
                <ul
                  role="listbox"
                  className="absolute right-0 top-full mt-1 py-1 w-48 bg-white rounded-xl border border-gray-100 shadow-lg z-20"
                >
                  <li>
                    <button
                      type="button"
                      role="option"
                      aria-selected={sortBy === 'recent'}
                      onClick={() => { setSortBy('recent'); setSortDropdownOpen(false); }}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Récents
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      role="option"
                      aria-selected={sortBy === 'price_asc'}
                      onClick={() => { setSortBy('price_asc'); setSortDropdownOpen(false); }}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Prix croissant
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      role="option"
                      aria-selected={sortBy === 'price_desc'}
                      onClick={() => { setSortBy('price_desc'); setSortDropdownOpen(false); }}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Prix décroissant
                    </button>
                  </li>
                </ul>
              </>
            )}
          </div>
        </div>

        {tableUnavailable || products.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto">
              <ImageIcon size={28} className="text-brand-400" />
            </div>
            <h2 className="font-black text-gray-900 text-lg">
              {tableUnavailable ? 'Bientôt disponible' : 'En cours d\'ajustement'}
            </h2>
            <p className="text-sm text-gray-600 max-w-sm mx-auto">
              {tableUnavailable
                ? 'Le module marketplace sera bientôt disponible. Les artisans pourront publier leurs articles et les clients les découvrir.'
                : 'Le marché des produits est en pleine construction. Les artisans pourront bientôt y publier leurs articles. Merci de votre patience.'}
            </p>
            {tableUnavailable && (
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-medium"
              >
                Retour à l&apos;accueil
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => {
              const primaryImage =
                Array.isArray(product.images) && product.images.length > 0
                  ? (product.images[0] as string)
                  : null;
              const artisan = product.profiles;
              const location =
                artisan?.commune ||
                artisan?.department ||
                artisan?.region ||
                product.commune ||
                product.region ||
                'Sénégal';

              return (
                <div
                  key={product.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/marketplace/${product.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/marketplace/${product.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col cursor-pointer hover:border-brand-200 transition-colors"
                >
                  <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative">
                    {primaryImage ? (
                      <img
                        src={primaryImage}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                        <ImageIcon size={28} />
                        <span className="text-[11px] mt-1">Photo à venir</span>
                      </div>
                    )}
                    {product.status === 'sold_out' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-bold text-sm px-3 py-1 rounded-full bg-gray-800">Rupture</span>
                      </div>
                    )}
                    {product.promo_percent != null && product.promo_percent > 0 && product.status !== 'sold_out' && (
                      <span className="absolute top-2 left-2 text-[11px] font-bold px-2 py-0.5 rounded bg-red-500 text-white">
                        -{product.promo_percent}%
                      </span>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <h2 className="text-sm font-bold text-gray-900 line-clamp-2 mb-1.5">
                      {product.title}
                    </h2>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                      {product.description || 'Produit artisanal'}
                    </p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-brand-600">
                        {product.promo_percent != null && product.promo_percent > 0 && product.status !== 'sold_out' ? (
                          <>
                            <span className="text-gray-400 line-through mr-1">
                              {Number(product.price || 0).toLocaleString('fr-FR')}
                            </span>
                            {(Number(product.price || 0) * (1 - (product.promo_percent || 0) / 100)).toLocaleString('fr-FR')} FCFA
                          </>
                        ) : (
                          `${Number(product.price || 0).toLocaleString('fr-FR')} FCFA`
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                        <MapPin size={11} />
                        {location}
                      </span>
                    </div>
                    {artisan && (
                      <div className="mt-auto space-y-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/artisans/${artisan.id}`);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors"
                        >
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                            {artisan.avatar_url ? (
                              <img
                                src={artisan.avatar_url}
                                alt={artisan.full_name ?? ''}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User size={14} className="text-gray-400" />
                            )}
                          </div>
                          <span className="truncate">
                            {artisan.full_name || 'Artisan'}
                          </span>
                          {artisanStatsMap[artisan.id]?.verification_status === 'verified' && (
                            <ShieldCheck size={12} className="text-brand-600 shrink-0" title="Artisan vérifié" />
                          )}
                        </button>
                        {artisanStatsMap[artisan.id] && (artisanStatsMap[artisan.id].rating_avg != null || artisanStatsMap[artisan.id].reviewCount > 0) && (
                          <p className="flex items-center gap-1 text-[11px] text-gray-500 px-1">
                            <Star size={10} className="text-yellow-500 fill-yellow-500" />
                            {(artisanStatsMap[artisan.id].rating_avg ?? 0).toFixed(1)}
                            <span>({artisanStatsMap[artisan.id].reviewCount} avis)</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

