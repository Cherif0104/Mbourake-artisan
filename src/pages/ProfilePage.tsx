import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star, MapPin, Phone, Mail, Shield, CheckCircle,
  Clock, Image, Video, ChevronLeft, ChevronRight, X, Play,
  Briefcase, Award, Hash, User, Quote, Building2, Calendar,
  Pencil, Settings, ExternalLink, LogOut, ShoppingBag, Award as AwardIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { getTier, TIER_COLORS } from '../utils/artisanUtils';
import { BackButton } from '../components/BackButton';
import { LoadingOverlay } from '../components/LoadingOverlay';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  artisan_response: string | null;
  artisan_response_at: string | null;
  client: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface ArtisanProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  location: string | null;
  member_id: string | null;
  created_at: string;
  artisan: {
    bio: string | null;
    specialty: string | null;
    portfolio_urls: string[];
    video_urls: string[];
    verification_status: string;
    rating_avg: number | null;
    is_available: boolean | null;
    category: {
      id: number;
      name: string;
      icon_name: string;
    } | null;
  } | null;
}

interface ProductPreview {
  id: string;
  title: string;
  description: string | null;
  price: number;
  promo_percent: number | null;
  status: string;
  images: unknown;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { user } = auth;
  const { profile, loading: profileLoading } = useProfile();

  const [artisan, setArtisan] = useState<ArtisanProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState({ count: 0, avg: 0, projectsCount: 0, tier: 'Bronze' as 'Platine' | 'Or' | 'Argent' | 'Bronze' });
  const [affiliations, setAffiliations] = useState<Array<{ affiliation_type: string; affiliation_name: string | null }>>([]);
  const [certifications, setCertifications] = useState<Array<{ id: string; title: string; type: string; image_url: string | null; issuer: string | null }>>([]);
  const [products, setProducts] = useState<ProductPreview[]>([]);
  const [artisanLoading, setArtisanLoading] = useState(true);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryType, setGalleryType] = useState<'photo' | 'video'>('photo');

  const isArtisan = profile?.role === 'artisan';
  const userId = user?.id ?? '';

  useEffect(() => {
    if (!isArtisan || !userId) {
      setArtisanLoading(false);
      return;
    }

    const fetchArtisan = async () => {
      setArtisanLoading(true);

      const { data: artisanData, error: artisanError } = await supabase
        .from('artisans')
        .select(`
          bio, specialty, portfolio_urls, video_urls, verification_status, rating_avg, is_available,
          categories (id, name, icon_name)
        `)
        .eq('id', userId)
        .maybeSingle();

      if (artisanError || !artisanData) {
        setArtisanLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, avatar_url, location, member_id, created_at, role')
        .eq('id', userId)
        .maybeSingle();

      if (profileError || !profileData) {
        setArtisanLoading(false);
        return;
      }

      setArtisan({
        ...profileData,
        artisan: {
          bio: artisanData.bio,
          specialty: artisanData.specialty,
          portfolio_urls: artisanData.portfolio_urls || [],
          video_urls: artisanData.video_urls || [],
          verification_status: artisanData.verification_status,
          rating_avg: artisanData.rating_avg,
          is_available: artisanData.is_available,
          category: artisanData.categories as any
        }
      });

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
          id, rating, comment, created_at, artisan_response, artisan_response_at,
          profiles!reviews_client_id_fkey (full_name, avatar_url)
        `)
        .eq('artisan_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (reviewsData) {
        const formatted = reviewsData.map((r: any) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          artisan_response: r.artisan_response,
          artisan_response_at: r.artisan_response_at,
          client: r.profiles ? { full_name: r.profiles.full_name, avatar_url: r.profiles.avatar_url } : null
        }));
        setReviews(formatted);
        const count = formatted.length;
        const avg = count > 0
          ? formatted.reduce((sum: number, r: Review) => sum + r.rating, 0) / count
          : (artisanData?.rating_avg ?? 0);
        const { count: projectsCount } = await supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .eq('artisan_id', userId)
          .eq('status', 'accepted');
        const tier = getTier(projectsCount || 0);
        setReviewStats({ count, avg: avg || 0, projectsCount: projectsCount || 0, tier });
      }

      const { data: affiliationsData } = await supabase
        .from('artisan_affiliations')
        .select('affiliation_type, affiliation_name')
        .eq('artisan_id', userId)
        .eq('status', 'verified');
      if (affiliationsData) setAffiliations(affiliationsData);

      const { data: certsData } = await supabase
        .from('artisan_certifications')
        .select('id, title, type, image_url, issuer')
        .eq('artisan_id', userId)
        .order('created_at', { ascending: false });
      if (certsData) setCertifications(certsData);

      const { data: productsData } = await supabase
        .from('products')
        .select('id, title, description, price, promo_percent, status, images')
        .eq('artisan_id', userId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(12);
      setProducts((productsData as ProductPreview[] | null) || []);

      setArtisanLoading(false);
    };

    fetchArtisan();
  }, [isArtisan, userId]);

  const openGallery = (type: 'photo' | 'video', index: number) => {
    setGalleryType(type);
    setGalleryIndex(index);
    setShowGallery(true);
  };

  const closeGallery = () => setShowGallery(false);
  const portfolioPhotos = artisan?.artisan?.portfolio_urls || [];
  const portfolioVideos = artisan?.artisan?.video_urls || [];
  const nextImage = () => {
    const items = galleryType === 'photo' ? portfolioPhotos : portfolioVideos;
    setGalleryIndex((prev) => (prev + 1) % items.length);
  };
  const prevImage = () => {
    const items = galleryType === 'photo' ? portfolioPhotos : portfolioVideos;
    setGalleryIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/', { replace: true });
  };

  if (auth.loading || profileLoading) {
    return <LoadingOverlay />;
  }
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col items-center justify-center px-5">
        <p className="text-gray-600 text-center mb-6">Profil introuvable.</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-colors"
        >
          Retour à l&apos;accueil
        </button>
      </div>
    );
  }

  // ——— Vue client (simplifiée) ———
  if (!isArtisan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-30 shadow-sm border-b border-gray-100/50">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <BackButton />
            <h1 className="text-lg font-black text-gray-900">Mon profil</h1>
            <div className="w-10" />
          </div>
        </header>
        <main className="max-w-lg mx-auto px-5 py-6 pb-20">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 p-0.5 shadow-lg">
              <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={32} className="text-brand-500" />
                )}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">{profile.full_name || 'Client'}</h2>
              <p className="text-sm text-gray-500">{profile.email}</p>
              {profile.location && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin size={14} />
                  {profile.location}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/edit-profile')}
              className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                  <Pencil size={20} className="text-brand-600" />
                </div>
                <span className="font-bold text-gray-900">Modifier le profil</span>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Settings size={20} className="text-gray-600" />
                </div>
                <span className="font-bold text-gray-900">Paramètres</span>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:bg-red-50 transition-colors text-left border-red-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <LogOut size={20} className="text-red-600" />
                </div>
                <span className="font-bold text-red-700">Déconnexion</span>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ——— Vue artisan : même peau que la page publique ———
  if (artisanLoading || !artisan) {
    return <LoadingOverlay />;
  }

  const isVerified = artisan.artisan?.verification_status === 'verified';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <BackButton />
          <h1 className="font-bold text-gray-900">Mon profil</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/edit-profile')}
              className="p-2 rounded-xl transition-colors hover:bg-brand-50 text-brand-600 flex items-center gap-1.5"
              aria-label="Modifier le profil"
            >
              <Pencil size={18} />
              <span className="text-xs font-bold hidden sm:inline">Modifier</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/artisans/${userId}`)}
              className="p-2 rounded-xl transition-colors hover:bg-gray-100 text-gray-600 flex items-center gap-1.5"
              aria-label="Voir ma page publique"
            >
              <ExternalLink size={18} />
              <span className="text-xs font-bold hidden sm:inline">Voir ma page</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto pb-32">
        {/* Hero (même structure que page publique) */}
        <div className="bg-white border-b">
          <div className="px-6 py-8">
            <div className="flex items-start gap-5">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 p-0.5 shadow-lg">
                  <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center overflow-hidden">
                    {artisan.avatar_url ? (
                      <img src={artisan.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Briefcase size={32} className="text-brand-500" />
                    )}
                  </div>
                </div>
                {isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center border-2 border-white shadow-lg">
                    <CheckCircle size={16} className="text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-black text-gray-900 mb-1">{artisan.full_name}</h2>
                <p className="text-brand-600 font-bold text-sm mb-2">
                  {artisan.artisan?.category?.name || 'Artisan'}
                </p>
                {artisan.artisan?.specialty && (
                  <p className="text-gray-500 text-sm mb-2">{artisan.artisan.specialty}</p>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star size={16} fill="currentColor" />
                    <span className="font-bold text-gray-900">{reviewStats.avg.toFixed(1)}</span>
                    <span className="text-gray-400">({reviewStats.count} avis)</span>
                  </div>
                  {artisan.location && (
                    <div className="flex items-center gap-1 text-gray-400">
                      <MapPin size={14} />
                      <span>{artisan.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-6">
              {isVerified && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-bold">
                  <Shield size={14} />
                  Certifié
                </span>
              )}
              {affiliations.map((aff, idx) => {
                const getTypeLabel = (type: string) => {
                  switch (type) {
                    case 'chambre': return 'Chambre de Métier';
                    case 'incubateur': return 'Incubateur';
                    case 'sae': return 'SAE';
                    case 'autre': return 'Organisme';
                    default: return type;
                  }
                };
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-full text-xs font-bold"
                    title={aff.affiliation_name || getTypeLabel(aff.affiliation_type)}
                  >
                    <Building2 size={14} />
                    {aff.affiliation_name || getTypeLabel(aff.affiliation_type)}
                  </span>
                );
              })}
              {artisan.artisan && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                  artisan.artisan.is_available !== false ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Clock size={14} />
                  {artisan.artisan.is_available !== false ? 'Disponible' : 'Occupé'}
                </span>
              )}
              {artisan.member_id && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-mono">
                  <Hash size={12} />
                  {artisan.member_id}
                </span>
              )}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${TIER_COLORS[reviewStats.tier]}`}>
                <Award size={14} />
                {reviewStats.tier}
              </span>
              {artisan.created_at && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                  <Calendar size={14} />
                  Membre depuis {new Date(artisan.created_at).getFullYear()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Avis clients (remonté pour visibilité) */}
        <section className="bg-white border-b px-6 py-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Quote size={18} className="text-brand-500" />
            Avis clients ({reviewStats.count})
          </h3>
          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Star size={24} className="text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">Pas encore d&apos;avis</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {review.client?.avatar_url ? (
                        <img src={review.client.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={18} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-gray-900 truncate">{review.client?.full_name || 'Client'}</p>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {new Date(review.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {review.comment && <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>}
                  {review.artisan_response && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-bold text-brand-700 mb-1">Votre réponse</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{review.artisan_response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bio */}
        {artisan.artisan?.bio && (
          <section className="bg-white border-b px-6 py-6">
            <h3 className="font-bold text-gray-900 mb-3">À propos</h3>
            <p className="text-gray-600 leading-relaxed">{artisan.artisan.bio}</p>
          </section>
        )}

        {/* Certifications */}
        {certifications.length > 0 && (
          <section className="bg-white border-b px-6 py-6">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              Certifications & reconnaissances
            </h3>
            <div className="space-y-3">
              {certifications.map((c) => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Award size={20} className="text-amber-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{c.title}</p>
                    <p className="text-xs text-gray-500 capitalize">{c.type}</p>
                    {c.issuer && <p className="text-xs text-gray-500 mt-0.5">{c.issuer}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Portfolio Photos */}
        {portfolioPhotos.length > 0 && (
          <section id="portfolio" className="bg-white border-b px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Image size={18} className="text-brand-500" />
                Portfolio Photos
              </h3>
              <span className="text-xs text-gray-400 font-bold">{portfolioPhotos.length}/10</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {portfolioPhotos.slice(0, 6).map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => openGallery('photo', idx)}
                  className="relative aspect-square rounded-xl overflow-hidden group"
                >
                  <img src={url} alt={`Portfolio ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  {idx === 5 && portfolioPhotos.length > 6 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">+{portfolioPhotos.length - 6}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Portfolio Videos */}
        {portfolioVideos.length > 0 && (
          <section className="bg-white border-b px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Video size={18} className="text-brand-500" />
                Portfolio Vidéos
              </h3>
              <span className="text-xs text-gray-400 font-bold">{portfolioVideos.length}/5</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {portfolioVideos.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => openGallery('video', idx)}
                  className="relative aspect-video rounded-xl overflow-hidden group bg-gray-900"
                >
                  <video src={url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition-colors">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Play size={24} className="text-white ml-1" fill="white" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Boutique / Mes produits */}
        <section className="bg-white border-b px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag size={18} className="text-brand-500" />
              Boutique
            </h3>
            <span className="text-xs text-gray-400 font-bold">{products.length} article(s)</span>
          </div>
          {products.length === 0 ? (
            <div className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-4">
              Aucun article publié pour le moment.
              <button
                type="button"
                onClick={() => navigate('/my-products')}
                className="block mt-2 text-brand-600 font-bold hover:underline"
              >
                Gérer mes produits →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => {
                const primaryImage =
                  Array.isArray(product.images) && product.images.length > 0
                    ? String(product.images[0])
                    : null;
                const promoActive =
                  product.promo_percent != null && product.promo_percent > 0 && product.status !== 'sold_out';
                const finalPrice = promoActive
                  ? Number(product.price || 0) * (1 - (product.promo_percent || 0) / 100)
                  : Number(product.price || 0);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => navigate(`/marketplace/${product.id}`)}
                    className="text-left bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden hover:border-brand-200 transition-colors"
                  >
                    <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                      {primaryImage ? (
                        <img src={primaryImage} alt={product.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Image size={24} />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-gray-900 text-sm line-clamp-2">{product.title}</p>
                      <p className="text-brand-600 font-bold text-xs mt-1">
                        {promoActive && (
                          <span className="text-gray-400 line-through mr-1">
                            {Number(product.price || 0).toLocaleString('fr-FR')}
                          </span>
                        )}
                        {finalPrice.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Contact (pour soi on peut afficher le téléphone) */}
        <section className="bg-white border-b px-6 py-6">
          <h3 className="font-bold text-gray-900 mb-4">Contact</h3>
          <div className="space-y-3">
            {artisan.phone && (
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Phone size={18} className="text-gray-500" />
                </div>
                <span className="font-medium">{artisan.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-gray-600">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <Mail size={18} className="text-gray-500" />
              </div>
              <span className="font-medium">{artisan.email}</span>
            </div>
            {artisan.location && (
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <MapPin size={18} className="text-gray-500" />
                </div>
                <span className="font-medium">{artisan.location}</span>
              </div>
            )}
          </div>
        </section>

        {/* Stats */}
        <section className="bg-white border-b px-6 py-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-2xl">
              <p className="text-2xl font-black text-gray-900">{reviewStats.projectsCount}</p>
              <p className="text-xs text-gray-500 font-bold uppercase">Projets</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-2xl">
              <p className="text-2xl font-black text-gray-900">{reviewStats.avg.toFixed(1)}</p>
              <p className="text-xs text-gray-500 font-bold uppercase">Note</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-2xl">
              <p className="text-2xl font-black text-gray-900">{reviewStats.count}</p>
              <p className="text-xs text-gray-500 font-bold uppercase">Avis</p>
            </div>
          </div>
        </section>

        {/* Actions : Modifier, Paramètres, Voir page publique, Ma boutique, Certifications, Déconnexion */}
        <section className="bg-white px-6 py-6 space-y-3">
          <button
            onClick={() => navigate('/edit-profile')}
            className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-brand-600 transition-colors"
          >
            <Pencil size={18} />
            Modifier le profil
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <Settings size={18} />
            Paramètres
          </button>
          <button
            onClick={() => navigate(`/artisans/${userId}`)}
            className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <ExternalLink size={18} />
            Voir ma page publique
          </button>
          <button
            onClick={() => navigate('/my-products')}
            className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <ShoppingBag size={18} />
            Ma boutique
          </button>
          <button
            onClick={() => navigate('/my-certifications')}
            className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <AwardIcon size={18} />
            Certifications
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-xl border-2 border-red-200 text-red-700 font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </section>
      </main>

      {/* Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <button onClick={closeGallery} className="absolute top-4 right-4 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10">
            <X size={24} />
          </button>
          <button onClick={prevImage} className="absolute left-4 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <ChevronLeft size={28} />
          </button>
          <button onClick={nextImage} className="absolute right-4 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <ChevronRight size={28} />
          </button>
          <div className="max-w-4xl max-h-[80vh] w-full mx-4">
            {galleryType === 'photo' ? (
              <img src={portfolioPhotos[galleryIndex]} alt={`Portfolio ${galleryIndex + 1}`} className="w-full h-full object-contain" />
            ) : (
              <video src={portfolioVideos[galleryIndex]} controls autoPlay className="w-full h-full object-contain" />
            )}
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm font-bold bg-black/50 px-4 py-2 rounded-full">
            {galleryIndex + 1} / {galleryType === 'photo' ? portfolioPhotos.length : portfolioVideos.length}
          </div>
        </div>
      )}
    </div>
  );
}
