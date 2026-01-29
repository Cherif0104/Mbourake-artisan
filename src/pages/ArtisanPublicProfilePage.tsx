import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Star, MapPin, Phone, Mail, Shield, CheckCircle,
  Heart, Share2, MessageSquare, Calendar, Clock, Image, Video,
  ChevronLeft, ChevronRight, X, Play, Briefcase, Award, Hash,
  User, Quote, Building2, MessageCircle, Send, Pencil, Copy
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useFavorites } from '../hooks/useFavorites';
import { useToastContext } from '../contexts/ToastContext';
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

export function ArtisanPublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { profile: currentUserProfile } = useProfile();
  const { success, error: showError } = useToastContext();
  
  const [artisan, setArtisan] = useState<ArtisanProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState({ count: 0, avg: 0, projectsCount: 0, tier: 'Bronze' as 'Platine' | 'Or' | 'Argent' | 'Bronze' });
  const [affiliations, setAffiliations] = useState<Array<{ affiliation_type: string; affiliation_name: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isFavorite, toggleFavorite } = useFavorites();
  const isArtisanFavorite = id ? isFavorite(id) : false;
  
  // Gallery modal state
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryType, setGalleryType] = useState<'photo' | 'video'>('photo');
  
  // Review response modal state
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  // Projet commun client ↔ artisan (pour afficher "Message" uniquement si un projet les relie)
  const [sharedProjectId, setSharedProjectId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const shareUrl = (typeof window !== 'undefined' && id) ? `${window.location.origin}/artisans/${id}` : '';
  const shareTitle = artisan ? `${artisan.full_name} | Artisan sur Mbourake` : 'Profil artisan | Mbourake';
  const shareText = artisan ? `Découvrez le profil de ${artisan.full_name} sur Mbourake` : 'Découvrez ce profil artisan sur Mbourake';

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleNativeShare = async () => {
    if (!canNativeShare || !shareUrl) return;
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      });
      setShowShareModal(false);
      success('Partage réussi');
    } catch (e: unknown) {
      if ((e as { name?: string })?.name !== 'AbortError') showError?.((e as Error)?.message || 'Partage annulé');
    }
  };

  const openShare = (url: string) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
    setShowShareModal(false);
    success('Ouverture du partage');
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowShareModal(false);
      success('Lien copié dans le presse-papiers');
    } catch {
      showError?.('Impossible de copier le lien');
    }
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);
  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    sms: `sms:?body=${encodedText}%20${encodedUrl}`,
  };

  useEffect(() => {
    const fetchArtisan = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);

      // Vérifier d'abord que c'est bien un artisan via la table artisans
      // Fetch artisan details d'abord
      const { data: artisanData, error: artisanError } = await supabase
        .from('artisans')
        .select(`
          bio, specialty, portfolio_urls, video_urls, verification_status, rating_avg, is_available,
          categories (id, name, icon_name)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (artisanError) {
        console.error('Error fetching artisan details:', artisanError);
        setError('Artisan non trouvé');
        setLoading(false);
        return;
      }
      
      if (!artisanData) {
        setError('Artisan non trouvé');
        setLoading(false);
        return;
      }

      // Récupérer le profil ; si anon et échec, réessayer avec champs publics uniquement
      let profileData: any = null;
      let profileError: any = null;
      const fullRes = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, avatar_url, location, member_id, created_at, role')
        .eq('id', id)
        .maybeSingle();
      profileData = fullRes.data;
      profileError = fullRes.error;
      if ((profileError || !profileData) && !user) {
        const minRes = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, location')
          .eq('id', id)
          .maybeSingle();
        profileData = minRes.data;
        profileError = minRes.error;
      }

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setError('Artisan non trouvé');
        setLoading(false);
        return;
      }

      if (!profileData) {
        setError('Artisan non trouvé');
        setLoading(false);
        return;
      }

      setArtisan({
        ...profileData,
        artisan: artisanData ? {
          bio: artisanData.bio,
          specialty: artisanData.specialty,
          portfolio_urls: artisanData.portfolio_urls || [],
          video_urls: artisanData.video_urls || [],
          verification_status: artisanData.verification_status,
          rating_avg: artisanData.rating_avg,
          is_available: artisanData.is_available,
          category: artisanData.categories as any
        } : null
      });

      // Fetch reviews for this artisan
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
          id, rating, comment, created_at,
          profiles!reviews_client_id_fkey (full_name, avatar_url)
        `)
        .eq('artisan_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (reviewsData) {
        const formattedReviews = reviewsData.map((r: any) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          client: r.profiles ? {
            full_name: r.profiles.full_name,
            avatar_url: r.profiles.avatar_url
          } : null
        }));
        setReviews(formattedReviews);
        
        // Calculate stats
        const count = formattedReviews.length;
        const artisanRatingAvg = artisanData?.rating_avg ?? 0;
        const avg = count > 0 
          ? formattedReviews.reduce((sum, r) => sum + r.rating, 0) / count 
          : artisanRatingAvg;
        
        // Count completed projects
        const { count: projectsCount } = await supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .eq('artisan_id', id)
          .eq('status', 'accepted');
        
        const tier = getTier(projectsCount || 0);
        setReviewStats({ count, avg: avg || 0, projectsCount: projectsCount || 0, tier });
      }

      // Charger les affiliations vérifiées
      const { data: affiliationsData } = await supabase
        .from('artisan_affiliations')
        .select('affiliation_type, affiliation_name')
        .eq('artisan_id', id)
        .eq('status', 'verified');

      if (affiliationsData) {
        setAffiliations(affiliationsData);
      }
      
      setLoading(false);
    };

    fetchArtisan();
  }, [id]);

  const openGallery = (type: 'photo' | 'video', index: number) => {
    setGalleryType(type);
    setGalleryIndex(index);
    setShowGallery(true);
  };

  const closeGallery = () => {
    setShowGallery(false);
  };

  const nextImage = () => {
    const items = galleryType === 'photo' 
      ? artisan?.artisan?.portfolio_urls || []
      : artisan?.artisan?.video_urls || [];
    setGalleryIndex((prev) => (prev + 1) % items.length);
  };

  const prevImage = () => {
    const items = galleryType === 'photo'
      ? artisan?.artisan?.portfolio_urls || []
      : artisan?.artisan?.video_urls || [];
    setGalleryIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleRequestProject = () => {
    // Si l'utilisateur n'est pas connecté, rediriger vers l'inscription en tant que client
    if (!user) {
      navigate('/onboard?mode=signup&role=client');
      return;
    }
    
    // Si l'utilisateur est connecté mais n'est pas un client, rediriger vers l'inscription client
    if (currentUserProfile?.role !== 'client') {
      navigate('/onboard?mode=signup&role=client');
      return;
    }
    
    // Navigate to create project with artisan pre-selected
    navigate(`/create-project?artisan=${id}`);
  };

  const isVerified = artisan?.artisan?.verification_status === 'verified';
  const portfolioPhotos = artisan?.artisan?.portfolio_urls || [];
  const portfolioVideos = artisan?.artisan?.video_urls || [];
  const isClient = currentUserProfile?.role === 'client';
  const isOwnProfile = Boolean(user && id && user.id === id);
  const showBottomBar = !isOwnProfile && (!user || isClient);

  // Si on arrive avec ?focus=portfolio, scroller vers la section portfolio après chargement.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const focus = params.get('focus');
    if (focus !== 'portfolio') return;
    if (loading) return;

    // Attendre un tick pour que le DOM soit prêt
    const t = window.setTimeout(() => {
      const el = document.getElementById('portfolio');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);

    return () => window.clearTimeout(t);
  }, [location.search, loading]);

  // Projet commun : client connecté + artisan affiché → un projet où ils sont liés (devis accepté/pending/viewed)
  useEffect(() => {
    if (!user?.id || !id || currentUserProfile?.role !== 'client') {
      setSharedProjectId(null);
      return;
    }
    const fetchSharedProject = async () => {
      const { data: myProjects } = await supabase.from('projects').select('id').eq('client_id', user.id);
      const myIds = myProjects?.map((p: { id: string }) => p.id) ?? [];
      if (myIds.length === 0) {
        setSharedProjectId(null);
        return;
      }
      const { data: quote } = await supabase
        .from('quotes')
        .select('project_id')
        .eq('artisan_id', id)
        .in('project_id', myIds)
        .in('status', ['accepted', 'pending', 'viewed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setSharedProjectId(quote?.project_id ?? null);
    };
    fetchSharedProject();
  }, [user?.id, id, currentUserProfile?.role]);

  if (loading) {
    return <LoadingOverlay />;
  }

  if (error || !artisan) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Briefcase size={40} className="text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Artisan non trouvé</h2>
          <p className="text-gray-500 mb-6">Ce profil n'existe pas ou n'est plus disponible</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <BackButton />
          <h1 className="font-bold text-gray-900">Profil artisan</h1>
          <div className="flex items-center gap-2">
            {isOwnProfile ? (
              <button
                type="button"
                onClick={() => navigate('/edit-profile')}
                className="p-2 rounded-xl transition-colors hover:bg-brand-50 text-brand-600 flex items-center gap-1.5"
                aria-label="Modifier le profil"
              >
                <Pencil size={18} />
                <span className="text-xs font-bold hidden sm:inline">Modifier</span>
              </button>
            ) : (
              <button 
                onClick={() => id && toggleFavorite(id)}
                className={`p-2 rounded-xl transition-colors ${isArtisanFavorite ? 'bg-red-50 text-red-500' : 'hover:bg-gray-100 text-gray-400'}`}
              >
                <Heart size={20} fill={isArtisanFavorite ? 'currentColor' : 'none'} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
              aria-label="Partager ce profil"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto pb-32">
        {/* Profile Hero */}
        <div className="bg-white border-b">
          <div className="px-6 py-8">
            <div className="flex items-start gap-5">
              {/* Avatar */}
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

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-black text-gray-900">{artisan.full_name}</h2>
                </div>
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
              {affiliations.length > 0 && affiliations.map((aff, idx) => {
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
                  artisan.artisan.is_available !== false 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-gray-100 text-gray-600'
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

        {/* Bio */}
        {artisan.artisan?.bio && (
          <section className="bg-white border-b px-6 py-6">
            <h3 className="font-bold text-gray-900 mb-3">À propos</h3>
            <p className="text-gray-600 leading-relaxed">{artisan.artisan.bio}</p>
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
          <section id={portfolioPhotos.length === 0 ? 'portfolio' : undefined} className="bg-white border-b px-6 py-6">
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

        {/* Contact Info */}
        <section className="bg-white border-b px-6 py-6">
          <h3 className="font-bold text-gray-900 mb-4">Contact</h3>
          <div className="space-y-3">
            {/* Téléphone masqué pour la confidentialité */}
            {artisan.phone && (
              <div className="flex items-center gap-3 text-gray-400">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Phone size={18} className="text-gray-400" />
                </div>
                <span className="font-medium text-sm">Numéro masqué pour la confidentialité</span>
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
        <section className="bg-white px-6 py-6">
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

        {/* Avis clients */}
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
              <p className="text-gray-500 font-medium">Pas encore d'avis</p>
              <p className="text-sm text-gray-400">Soyez le premier à donner votre avis !</p>
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
                        <p className="font-bold text-gray-900 truncate">
                          {review.client?.full_name || 'Client'}
                        </p>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {new Date(review.created_at).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={14} 
                            className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-gray-600 text-sm leading-relaxed mb-3">{review.comment}</p>
                  )}
                  
                  {/* Réponse de l'artisan */}
                  {review.artisan_response && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                          <MessageCircle size={14} className="text-brand-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-bold text-brand-700">Réponse de l'artisan</p>
                            {review.artisan_response_at && (
                              <span className="text-xs text-gray-400">
                                {new Date(review.artisan_response_at).toLocaleDateString('fr-FR', { 
                                  day: 'numeric', 
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{review.artisan_response}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bouton pour répondre (seulement si c'est le profil de l'artisan connecté) */}
                  {!review.artisan_response && user?.id === id && (
                    <button
                      onClick={() => {
                        const reviewId = review.id;
                        setSelectedReviewId(reviewId);
                      }}
                      className="mt-3 w-full py-2 bg-brand-50 text-brand-700 font-bold text-xs rounded-xl hover:bg-brand-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={14} />
                      Répondre au commentaire
                    </button>
                  )}
                </div>
              ))}
              
              {reviews.length > 5 && (
                <button className="w-full py-3 text-center text-brand-600 font-bold text-sm hover:bg-brand-50 rounded-xl transition-colors">
                  Voir tous les avis ({reviewStats.count})
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Fixed Bottom CTA : masquée si artisan regarde son profil ou un autre artisan ; sinon selon connecté / client / projet commun */}
      {showBottomBar && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-4 z-40">
          <div className="max-w-2xl mx-auto flex gap-3">
            {!user ? (
              <button
                onClick={handleRequestProject}
                className="flex-[2] w-full py-4 bg-brand-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-brand-600 active:scale-[0.98] transition-all shadow-lg shadow-brand-200"
              >
                <MessageCircle size={20} />
                Contacter (s'inscrire ou se connecter)
              </button>
            ) : (
              <>
                {sharedProjectId && (
                  <button
                    type="button"
                    onClick={() => navigate(`/chat/${sharedProjectId}`)}
                    className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                  >
                    <MessageSquare size={20} />
                    Message
                  </button>
                )}
                <button
                  onClick={handleRequestProject}
                  className={`${sharedProjectId ? 'flex-[2]' : 'flex-1'} py-4 bg-brand-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-brand-600 active:scale-[0.98] transition-all shadow-lg shadow-brand-200`}
                >
                  <Briefcase size={20} />
                  Demander un projet
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal Partager ce profil */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-black text-gray-900">Partager ce profil</h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                aria-label="Fermer"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
              {canNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full py-3 px-4 rounded-xl bg-brand-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-brand-600 transition-colors"
                >
                  <Share2 size={20} />
                  Partager via… (WhatsApp, SMS, Bluetooth, etc.)
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => openShare(shareLinks.facebook)} className="py-3 px-3 rounded-xl bg-[#1877F2] text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                  <span aria-hidden>f</span> Facebook
                </button>
                <button type="button" onClick={() => openShare(shareLinks.whatsapp)} className="py-3 px-3 rounded-xl bg-[#25D366] text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                  WhatsApp
                </button>
                <button type="button" onClick={() => openShare(shareLinks.twitter)} className="py-3 px-3 rounded-xl bg-black text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                  X (Twitter)
                </button>
                <button type="button" onClick={() => openShare(shareLinks.linkedin)} className="py-3 px-3 rounded-xl bg-[#0A66C2] text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                  LinkedIn
                </button>
                <button type="button" onClick={() => openShare(shareLinks.telegram)} className="py-3 px-3 rounded-xl bg-[#0088cc] text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                  Telegram
                </button>
                <button type="button" onClick={() => { window.location.href = shareLinks.sms; setShowShareModal(false); }} className="py-3 px-3 rounded-xl bg-gray-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors">
                  SMS
                </button>
              </div>
              <button
                type="button"
                onClick={copyShareLink}
                className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-700 font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
              >
                <Copy size={18} />
                Copier le lien
              </button>
              <p className="text-xs text-gray-500 text-center pt-1">
                Instagram, TikTok : collez le lien copié dans l’app.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <button
            onClick={closeGallery}
            className="absolute top-4 right-4 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
          >
            <X size={24} />
          </button>

          <button
            onClick={prevImage}
            className="absolute left-4 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <ChevronLeft size={28} />
          </button>

          <button
            onClick={nextImage}
            className="absolute right-4 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <ChevronRight size={28} />
          </button>

          <div className="max-w-4xl max-h-[80vh] w-full mx-4">
            {galleryType === 'photo' ? (
              <img
                src={portfolioPhotos[galleryIndex]}
                alt={`Portfolio ${galleryIndex + 1}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <video
                src={portfolioVideos[galleryIndex]}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            )}
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm font-bold bg-black/50 px-4 py-2 rounded-full">
            {galleryIndex + 1} / {galleryType === 'photo' ? portfolioPhotos.length : portfolioVideos.length}
          </div>
        </div>
      )}

      {/* Modal pour répondre à un commentaire */}
      {selectedReviewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                  <MessageCircle className="text-brand-600" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Répondre au commentaire</h3>
                  <p className="text-xs text-gray-500">Votre réponse sera visible publiquement</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedReviewId(null);
                  setResponseText('');
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                disabled={submittingResponse}
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!responseText.trim()) {
                  showError('Veuillez saisir une réponse');
                  return;
                }

                setSubmittingResponse(true);
                try {
                  const { error } = await supabase
                    .from('reviews')
                    .update({
                      artisan_response: responseText.trim(),
                      artisan_response_at: new Date().toISOString()
                    })
                    .eq('id', selectedReviewId);

                  if (error) throw error;

                  success('Réponse publiée avec succès');
                  
                  // Recharger les reviews
                  const { data: reviewsData } = await supabase
                    .from('reviews')
                    .select(`
                      id, rating, comment, created_at, artisan_response, artisan_response_at,
                      profiles!reviews_client_id_fkey (full_name, avatar_url)
                    `)
                    .eq('artisan_id', id)
                    .order('created_at', { ascending: false })
                    .limit(10);

                  if (reviewsData) {
                    const formattedReviews = reviewsData.map((r: any) => ({
                      id: r.id,
                      rating: r.rating,
                      comment: r.comment,
                      created_at: r.created_at,
                      artisan_response: r.artisan_response,
                      artisan_response_at: r.artisan_response_at,
                      client: r.profiles ? {
                        full_name: r.profiles.full_name,
                        avatar_url: r.profiles.avatar_url
                      } : null
                    }));
                    setReviews(formattedReviews);
                  }

                  setSelectedReviewId(null);
                  setResponseText('');
                } catch (err: any) {
                  console.error('Error submitting response:', err);
                  showError(`Erreur: ${err.message || 'Impossible de publier la réponse'}`);
                } finally {
                  setSubmittingResponse(false);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Votre réponse <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Merci pour votre commentaire..."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none text-sm"
                  disabled={submittingResponse}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {responseText.length} / 500 caractères
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReviewId(null);
                    setResponseText('');
                  }}
                  disabled={submittingResponse}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingResponse || !responseText.trim()}
                  className="flex-1 px-4 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submittingResponse ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={16} />
                      Publier la réponse
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
