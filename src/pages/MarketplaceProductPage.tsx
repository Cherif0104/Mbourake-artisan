import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, User, Image as ImageIcon, ChevronLeft, ChevronRight, Star, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '@shared';
import { useAuth } from '../hooks/useAuth';
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

export function MarketplaceProductPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductWithArtisan | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tableUnavailable, setTableUnavailable] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [artisanStats, setArtisanStats] = useState<ArtisanStats | null>(null);

  useEffect(() => {
    if (!productId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      setLoading(true);
      setNotFound(false);
      setTableUnavailable(false);
      try {
        const { data, error } = await supabase
          .from('products')
          .select(
            `
            *,
            profiles!products_artisan_id_fkey (
              id,
              full_name,
              avatar_url,
              region,
              department,
              commune
            )
          `
          )
          .eq('id', productId)
          .eq('status', 'published')
          .maybeSingle();

        if (error) {
          const code = (error as any)?.code;
          const msg = (error.message || '').toLowerCase();
          const isMissing =
            code === 'PGRST205' ||
            msg.includes('does not exist') ||
            msg.includes('relation') ||
            msg.includes('42p01');
          if (isMissing) setTableUnavailable(true);
          else setNotFound(true);
          setProduct(null);
        } else if (!data) {
          setNotFound(true);
          setProduct(null);
        } else {
          const prod = data as ProductWithArtisan;
          setProduct(prod);
          const aid = prod?.artisan_id;
          if (aid) {
            const [artisansRes, reviewsRes] = await Promise.all([
              supabase.from('artisans').select('id, rating_avg, verification_status').eq('id', aid).maybeSingle(),
              supabase.from('reviews').select('id').eq('artisan_id', aid),
            ]);
            const reviewCount = reviewsRes.data?.length ?? 0;
            const a = artisansRes.data as { id: string; rating_avg: number | null; verification_status: string } | null;
            setArtisanStats({
              rating_avg: a?.rating_avg ?? null,
              verification_status: a?.verification_status || 'unverified',
              reviewCount,
            });
          } else {
            setArtisanStats(null);
          }
        }
      } catch (e: any) {
        const msg = (e?.message ?? '').toLowerCase();
        const isMissing =
          msg.includes('does not exist') || msg.includes('relation') || msg.includes('42p01');
        if (isMissing) setTableUnavailable(true);
        else setNotFound(true);
        setProduct(null);
        setArtisanStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  useEffect(() => {
    setGalleryIndex(0);
  }, [product?.id]);

  const handleContactArtisan = () => {
    const artisanId = product?.profiles?.id;
    if (!artisanId) return;
    if (!user) {
      const redirect = `/artisans/${artisanId}`;
      navigate(
        `/onboard?mode=login&role=client&redirect=${encodeURIComponent(redirect)}`
      );
      return;
    }
    navigate(`/artisans/${artisanId}`);
  };

  if (loading) {
    return <LoadingOverlay message="Chargement du produit..." />;
  }

  if (tableUnavailable || notFound) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/marketplace')}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <HomeButton />
        </header>
        <main className="max-w-lg mx-auto px-4 py-10 text-center">
          <h1 className="text-lg font-black text-gray-900 mb-2">
            {tableUnavailable ? 'Marketplace indisponible' : 'Produit introuvable'}
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            {tableUnavailable
              ? 'Le module marketplace sera bientôt disponible.'
              : 'Ce produit n\'existe pas ou n\'est plus publié.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/marketplace')}
            className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold text-sm"
          >
            Retour à la marketplace
          </button>
        </main>
      </div>
    );
  }

  const imageList: string[] =
    Array.isArray(product!.images) && product!.images.length > 0
      ? (product!.images as string[])
      : [];
  const primaryImage = imageList[0] ?? null;
  const hasGallery = imageList.length > 1;
  const currentImage = imageList[galleryIndex] ?? primaryImage;
  const artisan = product!.profiles;
  const location =
    artisan?.commune ||
    artisan?.department ||
    artisan?.region ||
    product!.commune ||
    product!.region ||
    'Sénégal';
  const priceDisplay =
    product!.promo_percent != null &&
    product!.promo_percent > 0 &&
    product!.status !== 'sold_out'
      ? (Number(product!.price || 0) * (1 - (product!.promo_percent || 0) / 100)).toLocaleString(
          'fr-FR'
        )
      : Number(product!.price || 0).toLocaleString('fr-FR');

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur border-b border-gray-100">
        <button
          type="button"
          onClick={() => navigate('/marketplace')}
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <HomeButton />
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="aspect-[4/3] bg-gray-100 relative">
            {currentImage ? (
              <img
                src={currentImage}
                alt={product!.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                <ImageIcon size={40} />
                <span className="text-sm mt-2">Photo à venir</span>
              </div>
            )}
            {hasGallery && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setGalleryIndex((i) => (i <= 0 ? imageList.length - 1 : i - 1));
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                  aria-label="Image précédente"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setGalleryIndex((i) => (i >= imageList.length - 1 ? 0 : i + 1));
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                  aria-label="Image suivante"
                >
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                  {imageList.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setGalleryIndex(idx);
                      }}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === galleryIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                      aria-label={`Image ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
            {product!.status === 'sold_out' && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-bold px-4 py-2 rounded-full bg-gray-800">
                  Rupture
                </span>
              </div>
            )}
            {product!.promo_percent != null &&
              product!.promo_percent > 0 &&
              product!.status !== 'sold_out' && (
                <span className="absolute top-3 left-3 text-sm font-bold px-2.5 py-1 rounded bg-red-500 text-white">
                  -{product!.promo_percent}%
                </span>
              )}
          </div>
          <div className="p-4">
            <h1 className="text-xl font-black text-gray-900 mb-2">{product!.title}</h1>
            <p className="text-sm text-gray-600 mb-4">
              {product!.description || 'Produit artisanal'}
            </p>
            <div className="flex items-center gap-2 text-brand-600 font-bold text-lg mb-4">
              {product!.promo_percent != null &&
              product!.promo_percent > 0 &&
              product!.status !== 'sold_out' ? (
                <>
                  <span className="text-gray-400 line-through text-base font-medium">
                    {Number(product!.price || 0).toLocaleString('fr-FR')}
                  </span>
                  {priceDisplay} FCFA
                </>
              ) : (
                `${priceDisplay} FCFA`
              )}
            </div>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <MapPin size={16} />
              {location}
            </div>
            {product!.status === 'published' &&
              (product!.stock == null || product!.stock > 0) &&
              product!.profiles?.id !== user?.id && (
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      navigate(
                        `/onboard?mode=login&role=client&redirect=${encodeURIComponent(
                          `/marketplace/${product!.id}/checkout`
                        )}`
                      );
                    } else {
                      navigate(`/marketplace/${product!.id}/checkout`);
                    }
                  }}
                  className="mt-4 w-full rounded-xl bg-brand-500 text-white font-bold py-3 flex items-center justify-center gap-2 hover:bg-brand-600 transition-colors"
                >
                  Commander
                </button>
              )}
          </div>
        </div>

        {artisan && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Vendu par
            </p>
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => navigate(`/artisans/${artisan.id}`)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                  {artisan.avatar_url ? (
                    <img
                      src={artisan.avatar_url}
                      alt={artisan.full_name ?? ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User size={24} className="text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-gray-900 truncate block flex items-center gap-1.5">
                    {artisan.full_name || 'Artisan'}
                    {artisanStats?.verification_status === 'verified' && (
                      <ShieldCheck size={14} className="text-brand-600 shrink-0" title="Artisan vérifié" />
                    )}
                  </span>
                  {artisanStats && (artisanStats.rating_avg != null || artisanStats.reviewCount > 0) && (
                    <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Star size={12} className="text-yellow-500 fill-yellow-500" />
                      {(artisanStats.rating_avg ?? 0).toFixed(1)}
                      <span>({artisanStats.reviewCount} avis)</span>
                    </p>
                  )}
                  <span className="text-xs text-brand-600 font-medium">
                    Voir toute la boutique
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={handleContactArtisan}
                className="px-5 py-2.5 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600 whitespace-nowrap"
              >
                Contacter l&apos;artisan
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
