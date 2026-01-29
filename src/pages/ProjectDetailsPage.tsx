import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, Calendar, Play, MessageCircle, CheckCircle, X, 
  Star, ThumbsUp, Hash, Clock, AlertTriangle, FileText,
  Mic, User, Video, ChevronDown, ChevronUp, ChevronRight, Shield, Circle, CreditCard,
  Wrench, Award
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useEscrow } from '../hooks/useEscrow';
import { useToastContext } from '../contexts/ToastContext';
import { EscrowBanner } from '../components/EscrowBanner';
import { QuoteForm } from '../components/QuoteForm';
import { RejectionModal } from '../components/RejectionModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { RatingModal } from '../components/RatingModal';
import { supabase } from '../lib/supabase';
import { 
  notifyArtisanQuoteAccepted, 
  notifyArtisanQuoteRejected, 
  notifyClientProjectCompleted,
  notifyArtisanClientRequestedCompletion,
  notifyArtisanClientConfirmedClosure,
  notifyClientArtisanAbandoned,
  notifyOtherPartyDisputeRaised,
  ensureProjectChatExists
} from '../lib/notificationService';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { LoadingSpinner } from '../components/SkeletonScreen';

const PROJECT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-600' },
  open: { label: 'En attente de devis', color: 'bg-blue-100 text-blue-600' },
  quote_received: { label: 'Devis reçu', color: 'bg-purple-100 text-purple-600' },
  quote_accepted: { label: 'Devis accepté', color: 'bg-green-100 text-green-600' },
  payment_pending: { label: 'Paiement en attente', color: 'bg-yellow-100 text-yellow-600' },
  in_progress: { label: 'En cours', color: 'bg-brand-100 text-brand-600' },
  completion_requested: { label: 'Clôture demandée', color: 'bg-orange-100 text-orange-600' },
  disputed: { label: 'En litige', color: 'bg-red-100 text-red-600' },
  completed: { label: 'Terminé', color: 'bg-green-100 text-green-700' },
  expired: { label: 'Expiré', color: 'bg-gray-100 text-gray-500' },
  cancelled: { label: 'Annulé', color: 'bg-gray-100 text-gray-500' },
};

const QUOTE_STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'En attente', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: Clock },
  viewed: { label: 'Vu', color: 'bg-purple-50 text-purple-600 border-purple-200', icon: CheckCircle },
  accepted: { label: 'Accepté', color: 'bg-green-50 text-green-600 border-green-200', icon: CheckCircle },
  rejected: { label: 'Refusé', color: 'bg-red-50 text-red-600 border-red-200', icon: X },
  expired: { label: 'Expiré', color: 'bg-gray-50 text-gray-500 border-gray-200', icon: Clock },
  abandoned: { label: 'Abandonné', color: 'bg-gray-50 text-gray-500 border-gray-200', icon: X },
};

// Timeline steps configuration
const TIMELINE_STEPS = [
  { id: 'created', label: 'Publié', icon: Circle },
  { id: 'quoted', label: 'Devis reçu', icon: FileText },
  { id: 'accepted', label: 'Accepté', icon: CheckCircle },
  { id: 'paid', label: 'Payé', icon: CreditCard },
  { id: 'in_progress', label: 'Travaux', icon: Wrench },
  { id: 'completed', label: 'Terminé', icon: Award },
];

const getTimelineProgress = (status: string, hasQuotes: boolean, escrowStatus: string | null) => {
  switch (status) {
    case 'open':
      return hasQuotes ? 1 : 0;
    case 'quote_accepted':
    case 'payment_pending':
      // Dès que le devis est accepté, on affiche l'étape "Payé" (en attente ou OK selon escrow)
      return 3;
    case 'payment_received':
      // Paiement OK → on considère la phase "Travaux" comme entamée (étape courante)
      return 4;
    case 'in_progress':
      return 4;
    case 'completion_requested':
      return 4;
    case 'completed':
      return 5;
    case 'disputed':
      return 4;
    default:
      return 0;
  }
};

export function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const { profile } = useProfile();
  const { initiateEscrow } = useEscrow();
  const { success, error: showError, warning, info } = useToastContext();
  
  const [project, setProject] = useState<any>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [escrow, setEscrow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI States
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [rejectQuoteId, setRejectQuoteId] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [revisionQuoteId, setRevisionQuoteId] = useState<string | null>(null);
  const [quoteRevisions, setQuoteRevisions] = useState<any[]>([]);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [abandonQuoteId, setAbandonQuoteId] = useState<string | null>(null);
  
  // Ref pour éviter les recharges intempestifs
  const fetchDetailsRef = useRef(false);
  const ratingAutoOpenedRef = useRef(false);
  const redirectToStepPageScheduledRef = useRef(false);

  const fetchDetails = async () => {
    if (!id) return;
    
    // Attendre que l'utilisateur soit chargé avant de fetch
    if (auth.loading || !auth.user) {
      console.log('[DEBUG] Waiting for user to be loaded...');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
    // Fetch project with relations - Permettre l'accès même aux projets expirés/annulés
      const { data: pData, error: pError } = await supabase
      .from('projects')
        .select('*, profiles!projects_client_id_fkey(*), categories(*)')
      .eq('id', id)
      .single();

      if (pError) {
        console.error('Error fetching project:', pError);
        console.error('Project ID:', id);
        console.error('Error details:', JSON.stringify(pError, null, 2));
        
        // Détecter les erreurs CORS ou réseau
        const isNetworkError = pError.message?.includes('Failed to fetch') || 
                               pError.message?.includes('NetworkError') ||
                               pError.message?.includes('ERR_FAILED') ||
                               pError.message?.includes('CORS');
        
        if (isNetworkError) {
          setError('Erreur de connexion. Vérifiez votre connexion internet et désactivez les extensions de navigateur (AdBlock, VPN, etc.) qui pourraient bloquer les requêtes.');
          setProject(null);
          setLoading(false);
          return;
        }
        
        // Set appropriate error message avec instructions
        if (pError.code === 'PGRST116' || pError.message?.includes('No rows')) {
          setError('Projet introuvable. Il se peut que ce projet n\'existe pas ou ait été supprimé.');
        } else if (pError.code === '42501' || pError.message?.includes('permission denied')) {
          setError('Vous n\'avez pas la permission d\'accéder à ce projet. Veuillez vérifier que vous êtes bien connecté et que ce projet vous appartient ou que vous y avez accès.');
        } else if (pError.code === 'PGRST201') {
          // Ambiguïté de relation - réessayer avec relation explicite
          console.warn('Ambiguity error, retrying with explicit relationship...');
          const { data: retryData, error: retryError } = await supabase
            .from('projects')
            .select('*, profiles!projects_client_id_fkey(*), categories(*)')
            .eq('id', id)
            .single();
          
          if (retryError) {
            setError(`Erreur lors du chargement du projet: ${retryError.message || 'Erreur inconnue'}`);
            setProject(null);
            setLoading(false);
            return;
          }
          
          setProject(retryData);
          setError(null);
          // Continuer avec le reste du fetch
        } else {
          setError(`Erreur lors du chargement du projet: ${pError.message || 'Erreur inconnue'}`);
        }
        
        if (pError.code !== 'PGRST201') {
          setProject(null);
          setLoading(false);
          return;
        }
      }

      if (!pData && !pError) {
        setError('Projet introuvable.');
        setProject(null);
        setLoading(false);
        return;
      }
      
      // Si on a récupéré les données, continuer
      if (!pData) {
        setLoading(false);
        return;
      }

    setProject(pData);
      setError(null);

    // VÉRIFICATION SÉCURITÉ : Si artisan, vérifier que le projet est de sa catégorie
    if (profile?.role === 'artisan' && pData) {
      // Récupérer la catégorie de l'artisan
      const { data: artisanData } = await supabase
        .from('artisans')
        .select('category_id')
        .eq('id', profile.id)
        .single();

      // Si l'artisan a une catégorie et que le projet n'est pas de cette catégorie
      // ET que ce n'est pas un projet ciblé spécifiquement pour lui
      if (artisanData?.category_id && 
          pData.category_id !== artisanData.category_id && 
          pData.target_artisan_id !== profile.id) {
        setError('Vous n\'avez pas accès à ce projet. Ce projet n\'est pas dans votre catégorie.');
        setProject(null);
        setLoading(false);
        return;
      }
    }

    // Fetch quotes - Récupérer TOUS les devis (tous statuts) pour diagnostic
    let qData: any[] = [];
    let qError: any = null;

    console.log('[DEBUG] Fetching quotes for project:', id);
    console.log('[DEBUG] Current user:', auth.user?.id);

    // Tentative 1: Avec relation explicite - SANS FILTRE DE STATUT
    const { data: qDataWithProfile, error: qErrorWithProfile } = await supabase
      .from('quotes')
      .select(`
        *,
        profiles!quotes_artisan_id_fkey (
          id,
          full_name,
          avatar_url,
          role
        )
      `)
      .eq('project_id', id)
      .order('created_at', { ascending: false });

    console.log('[DEBUG] Quotes with profile - Data:', qDataWithProfile);
    console.log('[DEBUG] Quotes with profile - Error:', qErrorWithProfile);

    if (!qErrorWithProfile && qDataWithProfile) {
      qData = qDataWithProfile || [];
      console.log('[DEBUG] Successfully fetched', qData.length, 'quotes with profile');
    } else {
      console.warn('[DEBUG] Error fetching quotes with profile, trying fallback:', qErrorWithProfile);
      
      // Tentative 2: Sans relation (fallback) - SANS FILTRE DE STATUT
      const { data: qDataFallback, error: qErrorFallback } = await supabase
        .from('quotes')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });
      
      console.log('[DEBUG] Quotes fallback - Data:', qDataFallback);
      console.log('[DEBUG] Quotes fallback - Error:', qErrorFallback);
      
      if (!qErrorFallback && qDataFallback) {
        qData = qDataFallback || [];
        console.log('[DEBUG] Successfully fetched', qData.length, 'quotes without profile');
        
        // Récupérer les profils séparément si nécessaire
        if (qData.length > 0) {
          const artisanIds = [...new Set(qData.map(q => q.artisan_id).filter(Boolean))];
          console.log('[DEBUG] Fetching profiles for artisan IDs:', artisanIds);
          
          if (artisanIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url, role')
              .in('id', artisanIds);
            
            console.log('[DEBUG] Profiles data:', profilesData);
            console.log('[DEBUG] Profiles error:', profilesError);
            
            // Fusionner les profils avec les devis
            qData = qData.map(quote => ({
              ...quote,
              profiles: profilesData?.find(p => p.id === quote.artisan_id) || null
            }));
          }
        }
      } else {
        console.error('[DEBUG] Error fetching quotes (fallback):', qErrorFallback);
        qError = qErrorFallback;
      }
    }

    console.log('[DEBUG] Final quotes array length:', qData.length);
    console.log('[DEBUG] Final quotes:', qData.map(q => ({ id: q.id, status: q.status, artisan_id: q.artisan_id })));
    
    setQuotes(qData);

    // Fetch quote revisions pour ce projet
    const { data: revisionsData } = await supabase
      .from('quote_revisions')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false });

    if (revisionsData) {
      setQuoteRevisions(revisionsData);
    }

    // Fetch escrow
      const { data: eData, error: eError } = await supabase
      .from('escrows')
      .select('*')
      .eq('project_id', id)
      .maybeSingle();

      if (eError) {
        console.error('Error fetching escrow:', eError);
      }
      setEscrow(eData || null);

      // Auto-sync : si l'escrow est "held" mais le projet est encore "payment_pending", corriger le statut
      // (évite de rester bloqué "paiement en cours" quand le paiement a bien réussi)
      if (eData?.status === 'held' && pData?.status === 'payment_pending') {
        const { error: syncErr } = await supabase
          .from('projects')
          .update({ status: 'payment_received' })
          .eq('id', id);
        if (!syncErr) {
          setProject((prev) => (prev ? { ...prev, status: 'payment_received' } : prev));
        } else {
          console.warn('[ProjectDetails] Sync statut payment_received:', syncErr);
        }
      }

      // Auto-sync : devis accepté ou révision acceptée mais projet encore "open"/"quote_received"
      // (ex. client a gardé l’onglet ouvert pendant que l’artisan acceptait la révision)
      const accQuote = (qData || []).find((q: any) => q.status === 'accepted');
      const hasAccRev = (revisionsData || []).some((r: any) => r.status === 'accepted');
      if ((accQuote || hasAccRev) && ['open', 'quote_received'].includes(pData?.status || '')) {
        const { error: syncProjErr } = await supabase
          .from('projects')
          .update({ status: 'quote_accepted' })
          .eq('id', id);
        if (!syncProjErr) {
          setProject((prev) => (prev ? { ...prev, status: 'quote_accepted' } : prev));
        } else {
          console.warn('[ProjectDetails] Sync statut quote_accepted:', syncProjErr);
        }
      }
    } catch (err: any) {
      console.error('Unexpected error in fetchDetails:', err);
      setError(`Erreur inattendue: ${err.message || 'Erreur inconnue'}`);
      setProject(null);
    } finally {
    setLoading(false);
    }
  };

  // Rediriger ?revision=xxx vers la page de réponse à la révision
  useEffect(() => {
    const revisionParam = searchParams.get('revision');
    if (revisionParam && project) {
      navigate(`/revisions/${revisionParam}/respond`, { replace: true });
    }
  }, [searchParams, project, navigate]);

  // Scroll vers la section cible quand on arrive avec un hash (ex. #devis, #suivi)
  useEffect(() => {
    if (!project || loading) return;
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    const el = hash === '#suivi'
      ? document.getElementById('suivi')
      : hash === '#devis'
        ? document.getElementById('section-devis')
        : null;
    if (el) {
      const t = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
      return () => clearTimeout(t);
    }
  }, [project, loading]);

  // Ouverture automatique du modal de notation : projet terminé, client, pas encore noté
  useEffect(() => {
    if (loading || !project || !id || !auth.user) return;
    if (project.status !== 'completed') return;
    if (project.client_id !== auth.user.id) return;
    const accepted = quotes.find((q: any) => q.status === 'accepted');
    if (!accepted?.artisan_id) return;
    if (ratingAutoOpenedRef.current) return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('reviews')
        .select('id')
        .eq('project_id', id)
        .eq('client_id', auth.user!.id)
        .eq('artisan_id', accepted.artisan_id)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        ratingAutoOpenedRef.current = true;
        setShowRatingModal(true);
      }
    })();
    return () => { cancelled = true; };
  }, [loading, id, project?.status, project?.client_id, quotes, auth.user]);

  // Redirection selon l'étape de la timeline : dès qu'on ouvre un projet (ou qu'on clique "Voir les détails"),
  // on est renvoyé vers la page correspondant à l'étape en cours (payment, thank-you, work, completion).
  useEffect(() => {
    if (loading || !project || !id || !auth.user) return;

    const isClient = project.client_id === auth.user.id;
    const acceptedQuote = quotes.find((q: any) => q.status === 'accepted');
    const isArtisanAssigned = acceptedQuote?.artisan_id === auth.user.id;
    if (!isClient && !isArtisanAssigned) return;

    const st = project.status || '';
    const paid = st === 'payment_received' || escrow?.status === 'held' || escrow?.status === 'advance_paid' || escrow?.status === 'released';
    const hasAcceptedQuote = quotes.some((q: any) => q.status === 'accepted');
    const hasAcceptedRevision = quoteRevisions.some((r: any) => r.status === 'accepted');
    const isAcceptedLikeStatus =
      st === 'quote_accepted' || st === 'payment_pending' ||
      ((hasAcceptedQuote || hasAcceptedRevision) && ['open', 'quote_received'].includes(st));

    if (redirectToStepPageScheduledRef.current) return;

    let target: string | null = null;
    // Ordre : de l'étape la plus avancée à la moins avancée
    // Alignement client / artisan : paiement = client uniquement ; clôture = client → completion, artisan → work
    if (['completion_requested', 'completed'].includes(st)) {
      target = isClient ? `/projects/${id}/completion` : `/projects/${id}/work`;
    } else if (st === 'in_progress') {
      target = `/projects/${id}/work`;
    } else if (paid) {
      target = `/projects/${id}/thank-you`;
    } else if (isAcceptedLikeStatus && isClient) {
      target = `/projects/${id}/payment`;
    }

    if (!target) return;

    redirectToStepPageScheduledRef.current = true;
    const t = setTimeout(() => navigate(target!), 0);
    return () => {
      clearTimeout(t);
      redirectToStepPageScheduledRef.current = false;
    };
  }, [loading, id, project, escrow, quotes, quoteRevisions, auth.user, navigate]);

  // Optimiser le useEffect pour éviter les recharges intempestifs
  useEffect(() => {
    // Réinitialiser les refs quand l'ID change
    fetchDetailsRef.current = false;
    ratingAutoOpenedRef.current = false;
    redirectToStepPageScheduledRef.current = false;
    
    // Ne fetch que si l'utilisateur est chargé et disponible
    // ET si on n'est pas déjà en train de charger
    if (!auth.loading && auth.user && !fetchDetailsRef.current) {
      fetchDetailsRef.current = true;
      fetchDetails().finally(() => {
        fetchDetailsRef.current = false;
      });
    } else if (auth.loading) {
      // Si l'auth est en cours de chargement, réinitialiser le loading
      setLoading(true);
    }
  }, [id, auth.user, auth.loading]); // Dépendre de id, auth.user et auth.loading

  // Grouper les quotes par artisan, dernière action en haut (plus récent en premier)
  const groupedQuotes = useMemo(() => {
    const groups: Record<string, any[]> = {};
    quotes.forEach(quote => {
      const key = quote.artisan_id || 'unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(quote);
    });
    // Trier chaque groupe : plus récent en premier (dernière action en haut)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
    });
    // Ordre des artisans : celui avec l'activité la plus récente en premier
    const entries = Object.entries(groups);
    entries.sort(([, aQuotes], [, bQuotes]) => {
      const aMax = Math.max(...aQuotes.map(q => new Date(q.created_at || 0).getTime()));
      const bMax = Math.max(...bQuotes.map(q => new Date(q.created_at || 0).getTime()));
      return bMax - aMax;
    });
    return Object.fromEntries(entries);
  }, [quotes]);

  const photosUrls = useMemo(() => {
    const v = project?.photos_urls;
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') {
      try {
        const p = JSON.parse(v);
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [project?.photos_urls]);

  const handleAcceptQuote = async (quote: any) => {
    // Validation préalable complète
    if (!id || !auth.user?.id) {
      showError('Erreur : informations manquantes');
      return;
    }
    
    // Vérifier que le projet appartient bien au client
    if (project?.client_id !== auth.user.id) {
      showError('Vous n\'êtes pas autorisé à accepter ce devis.');
      return;
    }
    
    // Vérifier que le devis peut être accepté (pending ou viewed)
    if (!['pending', 'viewed'].includes(quote.status)) {
      showError('Ce devis ne peut plus être accepté (statut: ' + quote.status + ')');
      return;
    }
    
    // Vérifier qu'il n'y a pas déjà un devis accepté
    const hasAcceptedQuote = quotes.some(q => q.status === 'accepted' && q.id !== quote.id);
    if (hasAcceptedQuote) {
      showError('Un devis a déjà été accepté pour ce projet.');
      return;
    }
    
    try {
      setActionLoading(true);
      const oldStatus = quote.status;

      // 1) Débiter les crédits de l'artisan avant de marquer le devis comme accepté
      //    (unité : nombre de crédits consommés par devis accepté)
      // Chaque projet accepté coûte 10 crédits
      const COST_PER_ACCEPTED_QUOTE = 10;
      try {
        const { error: creditError } = await supabase.rpc('consume_credits_for_quote', {
          p_artisan_id: quote.artisan_id,
          p_project_id: id,
          p_quote_id: quote.id,
          p_cost: COST_PER_ACCEPTED_QUOTE,
        });

        if (creditError) {
          // Manque de crédits : empêcher l'acceptation et informer le client
          if (creditError.message?.includes('insufficient_credits')) {
            showError("L'artisan n'a pas assez de crédits pour ce projet. Demandez-lui de recharger son compte.");
          } else {
            console.error('Erreur lors du débit des crédits de l\'artisan :', creditError);
            showError("Impossible de débiter les crédits de l'artisan pour ce projet.");
          }
          setActionLoading(false);
          return;
        }
      } catch (creditErr: any) {
        console.error('Unexpected error in consume_credits_for_quote:', creditErr);
        showError("Une erreur est survenue lors du débit des crédits de l'artisan.");
        setActionLoading(false);
        return;
      }

      // 2) Marquer le devis comme accepté
      const { error: quoteUpdateError } = await supabase
        .from('quotes')
        .update({ status: 'accepted' })
        .eq('id', quote.id);
      
      if (quoteUpdateError) {
        throw new Error(`Erreur mise à jour devis: ${quoteUpdateError.message}`);
      }
      
      // Log action acceptation devis (non-bloquant)
      try {
        await supabase.rpc('log_quote_action', {
          p_quote_id: quote.id,
          p_project_id: id,
          p_user_id: auth.user.id,
          p_action: 'accepted',
          p_old_value: { status: oldStatus },
          p_new_value: { status: 'accepted', amount: quote.amount }
        });
      } catch (logErr) {
        // Fonction RPC optionnelle - ignorer silencieusement si elle n'existe pas
        console.error('Error logging quote acceptance:', logErr);
      }
      
      // Reject other quotes
      const { data: rejectedQuotes, error: rejectError } = await supabase
        .from('quotes')
        .select('id')
        .eq('project_id', id)
        .neq('id', quote.id)
        .in('status', ['pending', 'viewed']);
      
      if (rejectError) {
        console.error('Error fetching quotes to reject:', rejectError);
      } else if (rejectedQuotes && rejectedQuotes.length > 0) {
        const { error: updateRejectError } = await supabase
          .from('quotes')
          .update({ status: 'rejected' })
          .in('id', rejectedQuotes.map(q => q.id));
        
        if (updateRejectError) {
          console.error('Error rejecting other quotes:', updateRejectError);
        }
        
        // Log rejections des autres devis (non-bloquant)
        for (const rejectedQuote of rejectedQuotes) {
          try {
            await supabase.rpc('log_quote_action', {
              p_quote_id: rejectedQuote.id,
              p_project_id: id,
              p_user_id: auth.user.id,
              p_action: 'rejected',
              p_old_value: { status: 'pending' },
              p_new_value: { status: 'rejected' },
              p_metadata: { reason: 'other_quote_accepted' }
            });
          } catch (logErr) {
            // Fonction RPC optionnelle - ignorer silencieusement si elle n'existe pas
            console.error('Error logging quote rejection:', logErr);
          }
        }
      }
      
      const oldProjectStatus = project?.status;
      
      // Update project status avec vérification
      const { error: projectUpdateError } = await supabase
        .from('projects')
        .update({ status: 'quote_accepted' })
        .eq('id', id);

      if (projectUpdateError) {
        throw new Error(`Erreur mise à jour projet: ${projectUpdateError.message}`);
      }

      // Log changement statut projet (non-bloquant)
      try {
        await supabase.rpc('log_project_action', {
          p_project_id: id,
          p_user_id: auth.user.id,
          p_action: 'status_changed',
          p_old_value: { status: oldProjectStatus },
          p_new_value: { status: 'quote_accepted' },
          p_metadata: { quote_id: quote.id }
        });
      } catch (logErr) {
        // Fonction RPC optionnelle - ignorer silencieusement si elle n'existe pas
        console.error('Error logging project status change:', logErr);
      }

      // Vérifier si un escrow existe déjà pour ce projet (bypass système de paiement)
      const { data: existingEscrow } = await supabase
        .from('escrows')
        .select('id, status')
        .eq('project_id', id)
        .maybeSingle();

      // Refetch quote pour utiliser le montant à jour (ex. révision acceptée avec suggested_price)
      const { data: freshQuote } = await supabase
        .from('quotes')
        .select('amount')
        .eq('id', quote.id)
        .single();
      const amountForEscrow = (freshQuote?.amount != null ? Number(freshQuote.amount) : null) ?? Number(quote.amount || 0);

      // Initiate escrow seulement si aucun escrow n'existe déjà
      if (!existingEscrow) {
        try {
          // Essayer de créer l'escrow via la fonction normale
          const escrowResult = await initiateEscrow({
            project_id: id,
            total_amount: amountForEscrow,
            artisan_is_verified: quote.profiles?.is_verified ?? false,
          });
        
          if (!escrowResult?.id) {
            throw new Error('Échec de la création de l\'escrow');
          }
          
          // Mettre à jour l'état local immédiatement pour affichage immédiat
          setEscrow(escrowResult);
          
          // Log création escrow (non-bloquant)
          try {
            await supabase.rpc('log_escrow_action', {
              p_escrow_id: escrowResult.id,
              p_user_id: auth.user.id,
              p_action: 'created',
              p_new_value: { total_amount: amountForEscrow, status: 'pending' }
            });
          } catch (logErr) {
            // Fonction RPC optionnelle - ignorer silencieusement si elle n'existe pas
            console.error('Error logging escrow creation:', logErr);
          }
        } catch (escrowErr: any) {
          console.error('Error creating escrow:', escrowErr);
          // Si l'erreur est liée à la politique RLS (récursion infinie), essayer via RPC SECURITY DEFINER
          if (escrowErr.message?.includes('infinite recursion') || escrowErr.message?.includes('policy')) {
            console.warn('Escrow creation failed due to RLS policy error. Trying bypass via RPC...');
            try {
              // Essayer de créer l'escrow via une fonction RPC qui bypass les RLS
              const { data: bypassEscrow, error: bypassError } = await supabase.rpc('create_escrow_bypass', {
                p_project_id: id,
                p_total_amount: amountForEscrow,
                p_artisan_is_verified: quote.profiles?.is_verified ?? false,
              });
              
              if (bypassError || !bypassEscrow) {
                console.warn('Bypass RPC failed or not available. Proceeding without escrow (bypass mode).');
                // Mettre le statut du projet à payment_pending pour indiquer qu'on est en attente de paiement
                // même sans escrow créé (mode bypass uniquement)
                await supabase
                  .from('projects')
                  .update({ status: 'payment_pending' })
                  .eq('id', id);
              } else if (bypassEscrow) {
                // Mettre à jour l'état local si escrow créé via bypass
                setEscrow(bypassEscrow);
              }
            } catch (bypassErr) {
              console.warn('Bypass RPC not available. Proceeding without escrow (bypass mode).');
              // Mettre le statut du projet à payment_pending pour indiquer qu'on est en attente de paiement
              await supabase
                .from('projects')
                .update({ status: 'payment_pending' })
                .eq('id', id);
            }
          } else {
            // Pour les autres erreurs, mettre le statut à payment_pending quand même
            console.warn('Escrow creation failed. Proceeding without escrow (bypass mode).');
            await supabase
              .from('projects')
              .update({ status: 'payment_pending' })
              .eq('id', id);
          }
          // L'escrow peut être créé manuellement par un admin si nécessaire
        }
      } else {
        console.log('Escrow already exists for this project. Skipping creation.');
        // Ne pas changer le statut - il reste à quote_accepted car l'escrow existe
        // L'EscrowBanner s'affichera automatiquement quand l'escrow existe
      }

      // Notifier l'artisan
      if (quote.artisan_id && project?.title) {
        try {
          await notifyArtisanQuoteAccepted(id, quote.artisan_id, project.title);
        } catch (notifErr) {
          console.error('Error notifying artisan:', notifErr);
        }
      }

      // Créer automatiquement le chat entre client et artisan
      if (quote.artisan_id && project?.client_id && project?.title) {
        try {
          await ensureProjectChatExists(id, project.client_id, quote.artisan_id, project.title);
        } catch (chatErr) {
          console.error('Error ensuring chat exists:', chatErr);
          // Ne pas bloquer si le chat échoue
        }
      }
      
      // Message de succès avec guidance
      success('Devis accepté avec succès ! Redirection vers la page de paiement...');
      
      // Rediriger immédiatement vers la page de paiement (comme la timeline → étape Payé)
      setTimeout(() => {
        if (id) {
          navigate(`/projects/${id}/payment`);
        }
      }, 0);
      
    } catch (err: any) {
      console.error('Error accepting quote:', err);
      showError(`Erreur lors de l'acceptation: ${err.message || 'Erreur inconnue'}`);
      // En cas d'erreur, juste rafraîchir pour avoir l'état correct
      setTimeout(async () => {
        await fetchDetails();
      }, 100);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectQuote = async (quoteId: string, rejectionReason?: string) => {
    // Validation préalable
    if (!auth.user?.id || !id) {
      showError('Erreur : informations manquantes');
      return;
    }
    
    // Vérifier que le projet appartient bien au client
    if (project?.client_id !== auth.user.id) {
      showError('Vous n\'êtes pas autorisé à refuser ce devis.');
      return;
    }
    
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) {
      showError('Devis introuvable');
      return;
    }
    
    // Vérifier que le devis peut être refusé
    if (quote.status === 'accepted') {
      showError('Ce devis a déjà été accepté et ne peut plus être refusé.');
      return;
    }
    
    if (quote.status === 'rejected') {
      showError('Ce devis a déjà été refusé.');
      return;
    }
    
    try {
      setActionLoading(true);
      const oldStatus = quote.status;
      
      // Update quote status avec raison de refus si fournie
      const updateData: any = { status: 'rejected' };
      if (rejectionReason && rejectionReason.trim()) {
        updateData.rejection_reason = rejectionReason.trim();
      }
      
      const { error: updateError } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', quoteId);
      
      if (updateError) {
        throw new Error(`Erreur mise à jour: ${updateError.message}`);
      }
      
      // Log action rejection
      try {
        await supabase.rpc('log_quote_action', {
          p_quote_id: quoteId,
          p_project_id: id || quote.project_id,
          p_user_id: auth.user.id,
          p_action: 'rejected',
          p_old_value: { status: oldStatus },
          p_new_value: { status: 'rejected', rejection_reason: rejectionReason || null }
        });
      } catch (logErr) {
        console.error('Error logging quote rejection:', logErr);
      }
      
      // Notifier l'artisan avec la raison si fournie
      if (quote.artisan_id && project?.title) {
        try {
          await notifyArtisanQuoteRejected(id, quote.artisan_id, project.title, rejectionReason);
        } catch (notifErr) {
          console.error('Error notifying artisan:', notifErr);
        }
      }
      
      success('Devis refusé avec succès. Vous pouvez continuer à consulter les autres devis.');
      await fetchDetails();
    } catch (err: any) {
      console.error('Error rejecting quote:', err);
      showError(`Erreur lors du refus: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(false);
    }
  };

  /** L'artisan clôture / abandonne son propre devis (pending, viewed ou rejected). */
  const handleAbandonQuote = async (quoteId: string) => {
    if (!id || !auth.user?.id) return;
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote || quote.artisan_id !== auth.user.id) {
      showError('Action non autorisée');
      return;
    }
    if (quote.status === 'accepted') {
      showError('Vous ne pouvez pas abandonner un devis accepté.');
      return;
    }
    if (quote.status === 'abandoned' || quote.status === 'expired') {
      showError('Ce devis est déjà clôturé.');
      return;
    }
    try {
      setActionLoading(true);
      const oldStatus = quote.status;
      const { error } = await supabase
        .from('quotes')
        .update({ status: 'abandoned' })
        .eq('id', quoteId)
        .eq('artisan_id', auth.user.id);
      if (error) throw error;
      try {
        await supabase.rpc('log_quote_action', {
          p_quote_id: quoteId,
          p_project_id: id,
          p_user_id: auth.user.id,
          p_action: 'status_changed',
          p_old_value: { status: oldStatus },
          p_new_value: { status: 'abandoned' },
        });
      } catch (logErr) {
        console.error('Error logging quote abandon:', logErr);
      }
      success('Votre devis a été clôturé. Ce projet ne figurera plus parmi vos réponses en cours.');
      await fetchDetails();
      if (project?.client_id) {
        try {
          await notifyClientArtisanAbandoned(
            id,
            project.client_id,
            project.title || 'Projet',
            quote.profiles?.full_name
          );
        } catch (notifErr) {
          console.error('Error notifying client of abandon:', notifErr);
        }
      }
    } catch (err: any) {
      console.error('Error abandoning quote:', err);
      showError(err.message || 'Erreur lors de la clôture du devis');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteProject = async () => {
    if (!id || !auth.user?.id || !project) return;
    try {
      // Le client confirme la fin des travaux et demande la clôture.
      // Le paiement vers l'artisan est déclenché par l'admin (voir AdminClosures).
      await supabase
        .from('projects')
        .update({
          client_confirmed_closure_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('client_id', auth.user.id);
      const accepted = quotes.find((q: any) => q.status === 'accepted');
      if (accepted?.artisan_id) {
        try {
          await notifyArtisanClientConfirmedClosure(id, accepted.artisan_id, project.title || 'Projet');
        } catch (_) { /* non bloquant */ }
      }
      success(
        "Demande de clôture enregistrée. La plateforme procédera au paiement de l'artisan après contrôle. Vous pourrez noter l'artisan une fois le projet clôturé."
      );
      await fetchDetails();
    } catch (err) {
      console.error('Error confirming closure:', err);
      showError("Erreur lors de l'enregistrement de la demande");
    }
  };

  /** Le client initie la demande de clôture (projet en cours ou paiement reçu). */
  const handleClientRequestClosure = async () => {
    if (!id || !auth.user?.id || !project || project.client_id !== auth.user.id) return;
    try {
      await supabase
        .from('projects')
        .update({
          status: 'completion_requested',
          client_confirmed_closure_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('client_id', auth.user.id);
      const accepted = quotes.find((q: any) => q.status === 'accepted');
      if (accepted?.artisan_id) {
        try {
          await notifyArtisanClientRequestedCompletion(id, accepted.artisan_id, project.title || 'Projet');
        } catch (_) { /* non bloquant */ }
      }
      success("Demande de clôture enregistrée. La plateforme procédera au paiement de l'artisan après contrôle. Vous pourrez noter l'artisan une fois le projet clôturé.");
      await fetchDetails();
    } catch (err) {
      console.error('Error requesting closure:', err);
      showError("Erreur lors de la demande de clôture");
    }
  };


  const handleCancelProject = async () => {
    if (!id || !auth.user?.id || project?.client_id !== auth.user.id) {
      showError('Action non autorisée');
      return;
    }
    
    // Vérifier si projet peut être annulé (pas de devis accepté, pas de paiement)
    if (escrow && escrow.status !== 'pending') {
      showError('Impossible d\'annuler : paiement déjà effectué. Veuillez demander un remboursement.');
      return;
    }
    
    const hasAcceptedQuote = quotes.some(q => q.status === 'accepted');
    if (hasAcceptedQuote) {
      showError('Impossible d\'annuler : un devis a déjà été accepté.');
      return;
    }
    
    // Afficher le modal de confirmation au lieu de window.confirm
    setShowCancelConfirm(true);
  };

  const confirmCancelProject = async () => {
    if (!id || !auth.user?.id || project?.client_id !== auth.user.id) {
      showError('Action non autorisée');
      setShowCancelConfirm(false);
      return;
    }
    
    setShowCancelConfirm(false);
    
    try {
      setActionLoading(true);
      
      // Vérifier que l'utilisateur est bien le client du projet
      if (!auth.user?.id || project?.client_id !== auth.user.id) {
        throw new Error('Vous n\'êtes pas autorisé à annuler ce projet.');
      }
      
      // Mettre à jour le statut du projet - SANS .single() pour éviter l'erreur
      console.log('[DEBUG] Cancelling project:', id, 'User:', auth.user.id);
      const { data: updateData, error: projectError } = await supabase
        .from('projects')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('client_id', auth.user.id) // Vérifier explicitement que c'est le bon client
        .select('id, status');
      
      console.log('[DEBUG] Update result - Data:', updateData);
      console.log('[DEBUG] Update result - Error:', projectError);
      
      if (projectError) {
        console.error('[DEBUG] Failed to update project:', projectError);
        throw new Error(`Erreur lors de la mise à jour: ${projectError.message}`);
      }
      
      // Vérifier que l'update a bien fonctionné
      if (!updateData || updateData.length === 0) {
        console.error('[DEBUG] No rows updated - RLS might be blocking or project not found');
        throw new Error('Impossible de mettre à jour le projet. Vérifiez que vous êtes bien le propriétaire du projet.');
      }
      
      const updatedProject = updateData[0];
      if (updatedProject.status !== 'cancelled') {
        console.warn('[DEBUG] Update might have failed - status is:', updatedProject.status);
        throw new Error('Le statut du projet n\'a pas été correctement mis à jour.');
      }
      
      // Rejeter tous les devis en attente
      const { data: pendingQuotes } = await supabase
        .from('quotes')
        .select('id, artisan_id')
        .eq('project_id', id)
        .in('status', ['pending', 'viewed']);
      
      if (pendingQuotes && pendingQuotes.length > 0) {
        await supabase
          .from('quotes')
          .update({ status: 'rejected' })
          .in('id', pendingQuotes.map(q => q.id));
      }
      
      // Log action (optionnel - en arrière-plan, ne bloque pas l'annulation)
      try {
        const logResult = supabase.rpc('log_project_action', {
          p_project_id: id,
          p_user_id: auth.user.id,
          p_action: 'cancelled',
          p_old_value: { status: project?.status },
          p_new_value: { status: 'cancelled' }
        });
        
        // Si c'est une Promise, attendre silencieusement
        if (logResult && typeof logResult.catch === 'function') {
          logResult.catch(() => {
            // Fonction RPC optionnelle - ignorer silencieusement si elle n'existe pas
            // L'annulation continue même si le log échoue
          });
        }
      } catch (logErr) {
        // Ignorer silencieusement - fonction optionnelle
        console.warn('Could not log project action:', logErr);
      }
      
      // Notifier les artisans ayant soumis un devis (type 'system' = dans l'enum, data.project_id pour le clic → fiche projet)
      if (pendingQuotes && pendingQuotes.length > 0) {
        for (const quote of pendingQuotes) {
          if (quote.artisan_id) {
            try {
              await supabase.from('notifications').insert({
                user_id: quote.artisan_id,
                type: 'system',
                title: 'Projet annulé',
                message: `Le projet "${project?.title}" a été annulé par le client.`,
                data: { project_id: id, kind: 'project_cancelled' }
              });
            } catch (notifErr) {
              console.error('Error notifying artisan:', notifErr);
            }
          }
        }
      }
      
      success('Projet annulé avec succès. Vous pouvez créer un nouveau projet si nécessaire.');
      
      // Mettre à jour l'état local immédiatement pour forcer le re-render
      setProject(prev => prev ? { ...prev, status: 'cancelled' } : null);
      
      // Attendre un peu pour que la base de données soit à jour
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Forcer un refresh complet des données AVANT de naviguer
      await fetchDetails();
      
      // Attendre encore un peu puis retourner au dashboard
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 800);
      
    } catch (err: any) {
      console.error('Error cancelling project:', err);
      showError(`Erreur: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportDispute = async () => {
    if (!id || !escrow || !project) return;
    try {
      await supabase
        .from('projects')
        .update({ status: 'disputed' })
        .eq('id', id);
      
      await supabase
        .from('escrows')
        .update({ status: 'frozen' })
        .eq('id', escrow.id);
      
      const title = project.title || 'Projet';
      const accepted = quotes.find((q: any) => q.status === 'accepted');
      const otherPartyId = project.client_id === auth.user?.id ? accepted?.artisan_id : project.client_id;
      if (otherPartyId) {
        try {
          await notifyOtherPartyDisputeRaised(id, title, otherPartyId);
        } catch (_) {
          /* non bloquant */
        }
      }
      
      fetchDetails();
      success("Un litige a été signalé. Le projet est en attente. Notre équipe vous contactera.");
    } catch (err) {
      showError("Erreur lors du signalement");
    }
  };

  // Artisan requests completion
  const handleRequestCompletion = async () => {
    if (!id) return;
    // Sécuriser le flux : on ne peut demander la clôture que si un devis a été accepté
    // (sinon le client ne pourra pas noter l'artisan correctement).
    if (!acceptedQuote) {
      showError(
        "Impossible de demander la clôture : aucun devis accepté n'est associé à ce projet."
      );
      return;
    }
    try {
      await supabase
        .from('projects')
        .update({ status: 'completion_requested' })
        .eq('id', id);
      
      // Notify client
      await notifyClientProjectCompleted(id, project.client_id, project.title);
      
      fetchDetails();
      success("Demande de clôture envoyée au client ! Le client doit confirmer la fin des travaux pour libérer le paiement final.");
    } catch (err) {
      showError("Erreur lors de la demande");
    }
  };

  if (loading) {
    return <LoadingOverlay />;
  }
  
  if (!project || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Projet introuvable</h2>
          <p className="text-gray-500 mb-6">{error || 'Ce projet n\'existe pas ou n\'est plus disponible.'}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-brand-500 text-white font-bold py-3 rounded-xl hover:bg-brand-600 transition-colors"
            >
              Retour au tableau de bord
            </button>
            <button
              onClick={() => fetchDetails()}
              className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isClient = project?.client_id === auth.user?.id;
  const isArtisan = profile?.role === 'artisan';
  const hasSubmittedQuote = quotes.some(q => q.artisan_id === auth.user?.id);
  const acceptedQuote = quotes.find(q => q.status === 'accepted');
  const hasAcceptedRevision = quoteRevisions.some((r: any) => r.status === 'accepted');
  const hasAcceptedRevisionForQuote = (quoteId: string) =>
    quoteRevisions.some((r: any) => r.quote_id === quoteId && r.status === 'accepted');
  // Statut affiché : si devis ou révision accepté(e) mais projet encore open/quote_received (cache client)
  const displayStatus =
    (acceptedQuote || hasAcceptedRevision) && ['open', 'quote_received'].includes(project?.status || '')
      ? 'quote_accepted'
      : (project?.status || '');

  // Phase suivi : travaux, clôture, notation (statut ou escrow held)
  const isPhaseSuivi =
    ['payment_received', 'in_progress', 'completion_requested', 'completed'].includes(project?.status || '') ||
    escrow?.status === 'held';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">{project.title}</h1>
          <p className="text-xs text-gray-400 font-mono">{project.project_number}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
          PROJECT_STATUS_LABELS[displayStatus]?.color || 'bg-gray-100 text-gray-600'
        }`}>
          {PROJECT_STATUS_LABELS[displayStatus]?.label || displayStatus}
        </span>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-32">
        {/* Escrow Banner - Afficher toujours si escrow existe */}
        {escrow && (
          <EscrowBanner 
            escrow={escrow} 
            isClient={isClient} 
            onRefresh={fetchDetails}
            onPaymentSuccess={
              isClient && id
                ? () => navigate(`/projects/${id}/thank-you`)
                : undefined
            }
          />
        )}

        {/* Montant du projet côté artisan (devis accepté = prix révisé le cas échéant) */}
        {isArtisan && acceptedQuote?.artisan_id === auth.user?.id && acceptedQuote?.amount != null && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
            <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">Montant du projet</p>
            <p className="text-2xl font-black text-green-900">
              {Number(acceptedQuote.amount).toLocaleString('fr-FR')} FCFA
            </p>
            <p className="text-xs text-green-700 mt-1">
              Ce montant est celui retenu pour ce projet{quoteRevisions.some((r: any) => r.status === 'accepted') ? ' (révision acceptée comprise)' : ''}.
            </p>
          </div>
        )}

        {/* Section "En attente de paiement" pour l'artisan (avec escrow actif) */}
        {isArtisan && acceptedQuote?.artisan_id === auth.user?.id && 
         escrow && escrow.status === 'pending' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="font-bold text-blue-900 text-sm">En attente du paiement du client</h3>
                <p className="text-xs text-blue-700 font-medium">
                  Une fois le paiement effectué, vous pourrez commencer les travaux.
                </p>
              </div>
            </div>
            <p className="text-sm text-blue-800 mb-2">
              Votre devis a été accepté ! Le client va procéder au paiement pour sécuriser les fonds.
            </p>
            <p className="text-xs text-blue-600 mb-4">
              Vous serez notifié dès que le paiement sera reçu et vous pourrez alors commencer les travaux.
            </p>
            <button
              type="button"
              onClick={() => navigate(`/projects/${id}/awaiting-payment`)}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Clock size={18} />
              Voir la page En attente de paiement
            </button>
          </div>
        )}
        
        {/* Section "En attente de paiement" pour l'artisan - mode bypass sans escrow */}
        {isArtisan &&
          acceptedQuote?.artisan_id === auth.user?.id &&
          !escrow &&
          (project?.status === 'quote_accepted' || project?.status === 'payment_pending') && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-blue-900 text-sm">En attente du paiement du client</h3>
                  <p className="text-xs text-blue-700 font-medium">
                    Pour des raisons de sécurité, ne commencez pas les travaux tant que le paiement n&apos;est pas confirmé.
                  </p>
                </div>
              </div>
              <p className="text-sm text-blue-800 mb-2">
                Votre devis a été accepté. Le client est en train de procéder au paiement sur la plateforme.
              </p>
              <p className="text-xs text-blue-600">
                Vous serez notifié dès que le paiement sera effectif et vous pourrez alors commencer les travaux.
              </p>
            </div>
          )}

        {/* Section Litige : projet gelé, seul l'admin peut débloquer */}
        {project.status === 'disputed' && (
          <section className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-red-800 text-base">Projet en litige</h3>
                <p className="text-sm text-red-700 mt-1">L&apos;escrow est gelé. Le projet est mis en attente.</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-red-200">
              <p className="text-sm font-medium text-red-800">
                Seul l&apos;administrateur de la plateforme peut débloquer le projet. Il contactera les deux parties pour résoudre le litige.
              </p>
              <p className="text-xs text-red-600 mt-2">En attendant, aucune action (paiement, clôture) n&apos;est possible.</p>
            </div>
          </section>
        )}

        {/* Expired Banner */}
        {project.status === 'expired' && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <Clock size={20} className="text-gray-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-gray-700 text-sm">Projet expiré</p>
              <p className="text-xs text-gray-600 mt-0.5">Ce projet a expiré après 6 jours sans devis accepté. Consultation en lecture seule.</p>
            </div>
          </div>
        )}
        
        {/* Cancelled Banner */}
        {project.status === 'cancelled' && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <X size={20} className="text-gray-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-gray-700 text-sm">Projet annulé</p>
              <p className="text-xs text-gray-600 mt-0.5">Ce projet a été annulé. Consultation en lecture seule.</p>
            </div>
          </div>
        )}

        {/* Signaler un litige : client ou artisan (post-paiement / en cours / clôture demandée) */}
        {project.status !== 'disputed' &&
         escrow &&
         isPhaseSuivi &&
         project.status !== 'completed' &&
         (isClient || (isArtisan && acceptedQuote?.artisan_id === auth.user?.id)) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
            <p className="text-sm font-medium text-amber-800 mb-2">En cas de différend avec l&apos;autre partie, vous pouvez signaler un litige.</p>
            <p className="text-xs text-amber-700 mb-3">Le projet sera mis en attente. Seul l&apos;administrateur pourra débloquer la situation.</p>
            <button
              onClick={handleReportDispute}
              className="px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-700 transition-colors flex items-center gap-2"
            >
              <AlertTriangle size={16} />
              Signaler un litige
            </button>
          </div>
        )}

        {/* Timeline Visuelle - HORIZONTALE (ancrage #suivi) */}
        <section id="suivi" className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <h3 className="font-bold text-gray-900 text-sm mb-3">Suivi du projet</h3>
          
          <div className="relative px-2">
            {/* Progress Line Horizontale */}
            <div className="absolute left-2 right-2 top-6 h-0.5 bg-gray-100" />
            <div 
              className="absolute left-2 top-6 h-0.5 bg-brand-500 transition-all duration-500"
              style={{ 
                width: `${(getTimelineProgress(displayStatus, quotes.length > 0, escrow?.status) / (TIMELINE_STEPS.length - 1)) * 100}%` 
              }}
            />
            
            {/* Steps - Horizontaux */}
            <div className="relative flex items-start justify-between gap-2">
              {TIMELINE_STEPS.map((step, index) => {
                const currentProgress = getTimelineProgress(displayStatus, quotes.length > 0, escrow?.status);
                const isCompleted = index <= currentProgress;
                const isCurrent = index === currentProgress;
                const Icon = step.icon;
                const isPaidStep = step.id === 'paid';
                const paymentOk = project.status === 'payment_received' || escrow?.status === 'held' || escrow?.status === 'advance_paid' || escrow?.status === 'released';
                const paidOkLabel = isPaidStep && isCurrent && paymentOk;
                const paidPendingLabel = isPaidStep && isCurrent && !paymentOk;
                
                return (
                  <div key={step.id} className="flex flex-col items-center flex-1 min-w-0">
                    {/* Icon */}
                    <div className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center transition-all mb-2 ${
                      isCompleted 
                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-200' 
                        : 'bg-gray-100 text-gray-400'
                    } ${isCurrent ? 'ring-4 ring-brand-100' : ''}`}>
                      <Icon size={18} strokeWidth={isCompleted ? 2.5 : 2} />
                    </div>
                    
                    {/* Label */}
                    <div className="text-center w-full">
                      <p className={`font-bold text-xs leading-tight ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {isCurrent && !paidOkLabel && !paidPendingLabel && (
                        <p className="text-[10px] text-brand-500 font-medium animate-pulse mt-0.5">
                          En cours
                        </p>
                      )}
                      {paidOkLabel && (
                        <p className="text-[10px] text-green-600 font-bold mt-0.5 flex items-center justify-center gap-1">
                          <CheckCircle size={12} />
                          Paiement OK
                        </p>
                      )}
                      {paidPendingLabel && (
                        <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                          En attente
                        </p>
                      )}
                      {isCompleted && !isCurrent && (
                        <CheckCircle size={14} className="text-green-500 mx-auto mt-1" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bouton Passer à l'étape suivante : action selon statut et rôle */}
          {acceptedQuote &&
           isPhaseSuivi &&
           (isClient || (isArtisan && acceptedQuote?.artisan_id === auth.user?.id)) && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              {/* Étape suivante = Demander la clôture (travaux terminés) */}
              {(project.status === 'payment_received' || project.status === 'in_progress' || escrow?.status === 'held') &&
               !['completion_requested', 'completed'].includes(project?.status || '') && (
                <button
                  type="button"
                  onClick={isClient ? handleClientRequestClosure : handleRequestCompletion}
                  disabled={actionLoading}
                  className="w-full py-3 px-4 bg-brand-500 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-0.5 hover:bg-brand-600 transition-colors disabled:opacity-60"
                >
                  <span className="flex items-center gap-2">
                    <ChevronRight size={18} />
                    Passer à l&apos;étape suivante
                  </span>
                  <span className="text-xs font-medium opacity-90">Travaux terminés – Demander la clôture</span>
                </button>
              )}
              {/* Étape suivante = Confirmer la fin des travaux (client, clôture déjà demandée) */}
              {project.status === 'completion_requested' && isClient && !project.client_confirmed_closure_at && (
                <button
                  type="button"
                  onClick={handleCompleteProject}
                  disabled={actionLoading}
                  className="w-full py-3 px-4 bg-brand-500 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-0.5 hover:bg-brand-600 transition-colors disabled:opacity-60"
                >
                  <span className="flex items-center gap-2">
                    <ChevronRight size={18} />
                    Passer à l&apos;étape suivante
                  </span>
                  <span className="text-xs font-medium opacity-90">Confirmer la fin des travaux</span>
                </button>
              )}
              {/* Étape suivante = Noter l'artisan (client, projet clôturé) */}
              {project.status === 'completed' && isClient && (
                <button
                  type="button"
                  onClick={() => setShowRatingModal(true)}
                  className="w-full py-3 px-4 bg-brand-500 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-0.5 hover:bg-brand-600 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ChevronRight size={18} />
                    Passer à l&apos;étape suivante
                  </span>
                  <span className="text-xs font-medium opacity-90">Noter l&apos;artisan</span>
                </button>
              )}
            </div>
          )}
        </section>

        {/* Project Info Card */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          {/* Header with category */}
          <div className="p-4 border-b border-gray-50 flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-brand-50 text-brand-600 text-[10px] font-bold rounded-lg uppercase">
              {project.categories?.name}
            </span>
            {project.is_urgent && (
              <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg uppercase">
                Urgent
              </span>
            )}
            {project.is_open === false && (
              <span className="px-3 py-1 bg-purple-50 text-purple-600 text-[10px] font-bold rounded-lg uppercase">
                Demande ciblée
              </span>
            )}
          </div>

          {/* Project Details */}
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">{project.title}</h2>
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              {project.location && (
                <div className="flex items-center gap-1">
                  <MapPin size={14} />
                  <span>{project.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{new Date(project.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
              {project.preferred_date && (
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>
                    Souhaité: {new Date(project.preferred_date).toLocaleDateString('fr-FR')}
                    {project.preferred_time_start && project.preferred_time_end && 
                      ` de ${project.preferred_time_start.slice(0, 5)} à ${project.preferred_time_end.slice(0, 5)}`
                    }
                  </span>
                </div>
              )}
            </div>

            {/* Criteria */}
            {project.is_open && (project.max_distance_km || project.min_rating) && (
              <div className="flex flex-wrap gap-2">
                {project.max_distance_km && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                    Max {project.max_distance_km} km
                  </span>
                )}
                {project.min_rating && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg flex items-center gap-1">
                    Min {project.min_rating} <Star size={10} className="text-yellow-400 fill-yellow-400" />
                  </span>
                )}
              </div>
            )}

            {/* Description écrite */}
            {project.description && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Description</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{project.description}</p>
              </div>
            )}

            {/* Audio Description */}
            {project.audio_description_url && (
              <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
                <button 
                  type="button"
                  onClick={() => {
                    const a = new Audio(project.audio_description_url);
                    a.play().catch(() => showError('Impossible de lire la description vocale.'));
                  }}
                  className="w-12 h-12 bg-brand-500 text-white rounded-full flex items-center justify-center shadow-lg flex-shrink-0"
                >
                  <Play fill="currentColor" size={20} />
                </button>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Description vocale</p>
                  <p className="text-xs text-gray-400">Appuyez pour écouter</p>
                </div>
              </div>
            )}

            {/* Video */}
            {project.video_url && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Video size={18} className="text-purple-600" />
                  </div>
                  <p className="font-bold text-gray-900 text-sm">Vidéo jointe</p>
                </div>
                <video 
                  src={project.video_url} 
                  controls 
                  className="w-full rounded-xl bg-black max-h-64"
                  playsInline
                />
                <a 
                  href={project.video_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-brand-500 underline"
                >
                  Ouvrir dans un nouvel onglet
                </a>
              </div>
            )}

            {/* Photos */}
            {photosUrls.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase">Photos</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {photosUrls.map((url: string, i: number) => (
                    <img 
                      key={i} 
                      src={url} 
                      alt={`Photo ${i + 1}`} 
                      className="w-20 h-20 rounded-xl object-cover flex-shrink-0 border-2 border-white shadow-sm cursor-pointer hover:opacity-90" 
                      onClick={() => window.open(url, '_blank')}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Property Details */}
            {project.property_details?.type && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Logement</p>
                <p className="text-sm text-gray-700 capitalize">
                  {project.property_details.type}
                  {project.property_details.floor && ` - Étage ${project.property_details.floor}`}
                </p>
                {project.property_details.accessNotes && (
                  <p className="text-xs text-gray-500 mt-1">{project.property_details.accessNotes}</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Quote Form for Artisans */}
        {showQuoteForm && isArtisan && !isClient && (
          <div className="mb-6">
            <QuoteForm
              projectId={id!}
              artisanId={auth.user!.id}
              isUrgent={project.is_urgent}
              onSuccess={() => {
                setShowQuoteForm(false);
                fetchDetails();
              }}
              onCancel={() => {
                setShowQuoteForm(false);
              }}
            />
          </div>
        )}

        {/* Quotes Section — id pour scroll depuis notif (#devis) */}
        <section id="section-devis">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">
              Devis
              {quotes.length > 0 && (
                <span className="ml-2 text-sm font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">
                  {quotes.length}
                </span>
              )}
            </h3>
            
            {/* Add Quote Button for Artisans */}
            {isArtisan && !isClient && 
             ['open', 'quote_received'].includes(displayStatus) && 
             project.status !== 'expired' && 
             project.status !== 'cancelled' && 
             !showQuoteForm && (
              <button
                onClick={() => setShowQuoteForm(true)}
                className="px-4 py-2 bg-brand-500 text-white text-sm font-bold rounded-xl"
              >
                {hasSubmittedQuote ? 'Modifier ou envoyer un nouveau devis' : 'Proposer un devis'}
              </button>
            )}
            
            {/* Message pour projets expirés/annulés */}
            {isArtisan && !isClient && 
             ['expired', 'cancelled'].includes(project.status || '') && (
              <p className="text-xs text-gray-500 italic">
                Ce projet n'accepte plus de nouveaux devis
              </p>
            )}
          </div>

          {/* Rejection Modal */}
          {rejectQuoteId && (() => {
            const rejectQuote = quotes.find(q => q.id === rejectQuoteId);
            return rejectQuote ? (
              <RejectionModal
                open={!!rejectQuote}
                onClose={() => setRejectQuoteId(null)}
                onConfirm={async (reason) => {
                  await handleRejectQuote(rejectQuoteId, reason);
                  setRejectQuoteId(null);
                }}
                quoteAmount={rejectQuote.amount || 0}
                artisanName={rejectQuote.profiles?.full_name || 'Artisan'}
              />
            ) : null;
          })()}

          {quotes.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
              <Mic size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm mb-4">Aucun devis pour le moment</p>
              {/* Bouton de rafraîchissement si l'utilisateur est artisan ou client */}
              {(isArtisan || isClient) && (
                <button
                  onClick={() => {
                    console.log('[DEBUG] Manual refresh requested');
                    fetchDetails();
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Rafraîchir ↻
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedQuotes).map(([artisanId, artisanQuotes]) => {
                if (artisanQuotes.length === 0) return null;
                
                return (
                  <div key={artisanId} className="space-y-3">
                    {/* En-tête avec nom de l'artisan (seulement si plusieurs devis) */}
                    {artisanQuotes.length > 1 && (
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {artisanQuotes[0].profiles?.avatar_url ? (
                            <img src={artisanQuotes[0].profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={14} className="text-gray-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm">
                            {artisanQuotes[0].profiles?.full_name || 'Artisan'}
                          </span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {artisanQuotes.length} devis
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Historique chronologique des devis */}
                    <div className={`space-y-3 ${artisanQuotes.length > 1 ? 'pl-4 border-l-2 border-gray-200' : ''}`}>
                      {artisanQuotes.map((quote, index) => {
                        const acceptedRev = quoteRevisions.find((r: any) => r.quote_id === quote.id && r.status === 'accepted');
                        const effectiveAmount = acceptedRev && (acceptedRev.suggested_price != null || acceptedRev.additional_fees != null)
                          ? (Number(acceptedRev.suggested_price ?? 0) + Number(acceptedRev.additional_fees ?? 0)) || Number(quote.amount ?? 0)
                          : Number(quote.amount ?? 0);
                        const displayQuoteStatus = hasAcceptedRevisionForQuote(quote.id) ? 'accepted' : quote.status;
                        const StatusIcon = QUOTE_STATUS_LABELS[displayQuoteStatus]?.icon || Clock;
                        const isExpanded = expandedQuoteId === quote.id;
                        
                        return (
                          <div 
                            id={`quote-${quote.id}`}
                            key={quote.id} 
                            className={`bg-white rounded-2xl border transition-all relative ${
                              displayQuoteStatus === 'accepted' ? 'border-green-200' :
                              displayQuoteStatus === 'rejected' ? 'border-gray-200 opacity-60' :
                              'border-gray-100'
                            }`}
                          >
                    {/* Quote Header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                            {quote.profiles?.avatar_url ? (
                              <img src={quote.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <User size={18} className="text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{quote.profiles?.full_name}</span>
                              {quote.profiles?.is_verified && (
                                <Shield size={14} className="text-green-500" />
                              )}
                            </div>
                            <p className="text-[9px] text-gray-400 font-mono">
                              Devis #{quote.quote_number || quote.id.slice(0, 8).toUpperCase()}
                            </p>
                            {/* Indicateur de révision */}
                            {index > 0 && (
                              <p className="text-[9px] text-yellow-600 font-medium mt-0.5">
                                Révision #{index + 1}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-brand-500">{effectiveAmount.toLocaleString('fr-FR')} FCFA</p>
                          {quote.urgent_surcharge_percent > 0 && (
                            <p className="text-[10px] text-yellow-600">+{quote.urgent_surcharge_percent}% urgence</p>
                          )}
                          {/* Date avec lien vers devis précédent */}
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(quote.created_at).toLocaleDateString('fr-FR', { 
                              day: 'numeric', 
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {index > 0 && (
                            <p className="text-[9px] text-yellow-600 mt-0.5">
                              ← Devis #{artisanQuotes[index - 1].quote_number || artisanQuotes[index - 1].id.slice(0, 8).toUpperCase()}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border ${
                        QUOTE_STATUS_LABELS[displayQuoteStatus]?.color || 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        <StatusIcon size={12} />
                        {QUOTE_STATUS_LABELS[displayQuoteStatus]?.label || displayQuoteStatus}
                      </div>

                      {/* Raison de refus - Affichée si le devis est rejeté avec raison */}
                      {displayQuoteStatus === 'rejected' && quote.rejection_reason && (
                        <div className="mt-3 bg-red-50 rounded-xl p-4 border border-red-200">
                          <div className="flex items-start gap-2">
                            <X size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs font-bold text-red-800 mb-1 uppercase">Raison du refus :</p>
                              <p className="text-sm text-red-900 leading-relaxed">{quote.rejection_reason}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Expand/Collapse — un seul enfant pour éviter erreur insertBefore */}
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setExpandedQuoteId(isExpanded ? null : quote.id);
                        }}
                        className="w-full mt-3 flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                      >
                        <span className="inline-flex items-center justify-center gap-1">
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {isExpanded ? 'Voir moins' : 'Voir détails'}
                        </span>
                      </button>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-gray-50 space-y-3 animate-in fade-in duration-200">
                        {/* Cost Breakdown */}
                        {(quote.labor_cost || quote.materials_cost) && (
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Détail des coûts</p>
                            <div className="space-y-1 text-sm">
                              {quote.labor_cost && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Main d'œuvre</span>
                                  <span className="font-bold">{quote.labor_cost.toLocaleString('fr-FR')} FCFA</span>
                                </div>
                              )}
                              {quote.materials_cost && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Matériaux</span>
                                  <span className="font-bold">{quote.materials_cost.toLocaleString('fr-FR')} FCFA</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Message */}
                        {quote.message && (
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Message</p>
                            <p className="text-sm text-gray-700">{quote.message}</p>
                          </div>
                        )}

                        {/* Audio Message */}
                        {quote.audio_message_url && (
                          <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                const a = new Audio(quote.audio_message_url);
                                a.play().catch(() => showError('Impossible de lire le message vocal.'));
                              }}
                              className="w-10 h-10 bg-brand-500 text-white rounded-full flex items-center justify-center"
                            >
                              <Play fill="currentColor" size={14} />
                            </button>
                            <div>
                              <p className="text-xs font-bold text-gray-500">Message vocal</p>
                            </div>
                          </div>
                        )}

                        {/* Proforma */}
                        {quote.proforma_url && (
                          <a 
                            href={quote.proforma_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-3 bg-blue-50 rounded-xl text-blue-600 hover:bg-blue-100 transition-colors"
                          >
                            <FileText size={18} />
                            <span className="text-sm font-bold">Voir la facture proforma</span>
                          </a>
                        )}

                        {/* Download PDF Quote */}
                        <button
                          type="button"
                          onClick={() => {
                            import('../lib/quotePdfGenerator').then(({ downloadQuotePDF }) => {
                              const quoteData = {
                                quote_number: quote.quote_number || 'N/A',
                                artisan_name: quote.profiles?.full_name || 'Artisan',
                                artisan_phone: quote.profiles?.phone || undefined,
                                artisan_email: quote.profiles?.email || undefined,
                                project_title: project?.title || 'Projet',
                                client_name: project?.profiles?.full_name || undefined,
                                amount: effectiveAmount,
                                labor_cost: quote.labor_cost ? Number(quote.labor_cost) : undefined,
                                materials_cost: quote.materials_cost ? Number(quote.materials_cost) : undefined,
                                urgent_surcharge_percent: quote.urgent_surcharge_percent || undefined,
                                urgent_surcharge: quote.urgent_surcharge_percent && effectiveAmount 
                                  ? effectiveAmount * (quote.urgent_surcharge_percent / 100) 
                                  : undefined,
                                message: quote.message || undefined,
                                estimated_duration: quote.estimated_duration || undefined,
                                proposed_date: quote.proposed_date || undefined,
                                proposed_time_start: quote.proposed_time_start || undefined,
                                proposed_time_end: quote.proposed_time_end || undefined,
                                validity_hours: quote.validity_hours || 48,
                                created_at: quote.created_at || new Date().toISOString(),
                              };
                              downloadQuotePDF(quoteData);
                            });
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors font-bold"
                        >
                          <FileText size={18} />
                          <span>Télécharger le devis en PDF</span>
                        </button>

                        {/* Duration & Schedule */}
                        {(quote.estimated_duration || quote.proposed_date) && (
                          <div className="flex flex-wrap gap-2 text-xs">
                            {quote.estimated_duration && (
                              <span className="px-2 py-1 bg-gray-100 rounded-lg text-gray-600">
                                Durée: {quote.estimated_duration}
                              </span>
                            )}
                            {quote.proposed_date && (
                              <span className="px-2 py-1 bg-gray-100 rounded-lg text-gray-600">
                                Proposé: {new Date(quote.proposed_date).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Client Actions - Visibles uniquement tant que le projet est en phase de devis
                        (avant acceptation définitive et démarrage des travaux) */}
                    {isClient 
                      // Le projet doit encore être dans une phase "pré-travaux"
                      && ['open', 'quote_received'].includes(displayStatus)
                      // Aucun devis ne doit être déjà accepté
                      && !quotes.some(q => q.status === 'accepted')
                      // Pas de révision déjà acceptée pour ce devis (accord conclu)
                      && !hasAcceptedRevisionForQuote(quote.id)
                      // Le devis courant doit encore être décidable
                      && ['pending', 'viewed'].includes(quote.status)
                      && !actionLoading && (
                      <div key={`actions-${quote.id}`} className="p-4 border-t border-gray-50 space-y-2">
                        <button 
                          onClick={() => handleAcceptQuote(quote)}
                          disabled={actionLoading}
                          className="w-full bg-green-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                          <CheckCircle size={18} aria-hidden="true" />
                          Accepter le devis
                            </>
                          )}
                        </button>
                        <button 
                          onClick={() => setRejectQuoteId(quote.id)}
                          disabled={actionLoading}
                          className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-xl border border-red-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Refuser ce devis"
                        >
                          <X size={16} aria-hidden="true" />
                          Refuser le devis
                        </button>
                      </div>
                    )}
                    
                    {/* Affichage du loading pendant l'action */}
                    {isClient && actionLoading && ['pending', 'viewed'].includes(quote.status) && (
                      <div key={`loading-${quote.id}`} className="p-4 border-t border-gray-50 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}

                    {/* Affichage raison de refus pour l'artisan */}
                    {isArtisan && quote.artisan_id === auth.user?.id && quote.status === 'rejected' && quote.rejection_reason && (
                      <div className="p-4 border-t border-gray-50 bg-blue-50 rounded-b-xl">
                        <p className="text-xs font-bold text-blue-800 mb-1 uppercase">Message du client :</p>
                        <p className="text-sm text-blue-900 mb-3">{quote.rejection_reason}</p>
                        <p className="text-xs text-blue-700 italic">
                          Vous pouvez soumettre un nouveau devis en tenant compte de ces commentaires.
                        </p>
                      </div>
                    )}

                    {/* Affichage des révisions en attente pour l'artisan */}
                    {isArtisan && quote.artisan_id === auth.user?.id && quoteRevisions.some(r => r.quote_id === quote.id && r.status === 'pending') && (
                      <div className="p-4 border-t border-gray-50 bg-yellow-50 rounded-b-xl">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs font-bold text-yellow-800 uppercase flex items-center gap-2">
                            <AlertTriangle size={14} />
                            Demande de révision en attente
                          </p>
                        </div>
                        {quoteRevisions
                          .filter(r => r.quote_id === quote.id && r.status === 'pending')
                          .map((revision) => (
                            <div key={revision.id} className="mb-3 last:mb-0">
                              <p className="text-sm text-yellow-900 mb-2">{revision.client_comments}</p>
                              <button
                                onClick={() => navigate(`/revisions/${revision.id}/respond`)}
                                className="w-full bg-yellow-600 text-white font-bold py-2 rounded-xl text-sm hover:bg-yellow-700 transition-colors"
                              >
                                Répondre à la révision
                              </button>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Bouton "Clôturer mon devis" pour l'artisan - à tout moment pour pending/viewed/rejected */}
                    {isArtisan && quote.artisan_id === auth.user?.id && ['pending', 'viewed', 'rejected'].includes(quote.status) && (
                      <div className="p-4 border-t border-gray-50">
                        <button
                          type="button"
                          onClick={() => setAbandonQuoteId(quote.id)}
                          disabled={actionLoading}
                          className="w-full bg-gray-100 text-gray-600 font-bold py-2.5 rounded-xl text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <X size={16} />
                          {actionLoading ? 'Clôture...' : 'Clôturer mon devis'}
                        </button>
                        <p className="text-xs text-gray-500 text-center mt-2">
                          Ce projet ne figurera plus parmi vos réponses en cours.
                        </p>
                      </div>
                    )}

                    {/* Bouton "Demander une révision" pour le client - Visible si devis accepté OU si devis en attente */}
                    {isClient 
                      && (quote.status === 'accepted' || quote.status === 'pending' || quote.status === 'viewed')
                      && ['open', 'quote_received', 'quote_accepted', 'payment_pending'].includes(displayStatus)
                      && !quotes.some(q => q.status === 'accepted' && q.id !== quote.id) // Pas d'autre devis accepté
                      && !quoteRevisions.some(r => r.quote_id === quote.id && r.status === 'pending')
                      && !hasAcceptedRevisionForQuote(quote.id) && (
                      <div className="p-4 border-t border-gray-50">
                        <button
                          onClick={() => navigate(`/projects/${id}/request-revision?quoteId=${quote.id}`)}
                          className="w-full bg-yellow-50 text-yellow-700 font-bold py-3 rounded-xl border border-yellow-200 flex items-center justify-center gap-2 hover:bg-yellow-100 transition-colors"
                        >
                          <AlertTriangle size={16} />
                          Demander une révision
                        </button>
                        <p className="text-xs text-gray-500 text-center mt-2">
                          {quote.status === 'accepted' 
                            ? 'Vous pouvez demander une modification du devis avant le début des travaux'
                            : 'Vous pouvez demander une modification avant d\'accepter le devis'}
                        </p>
                      </div>
                    )}

                    {/* Affichage du statut de révision si une révision existe */}
                    {isClient && quoteRevisions.some(r => r.quote_id === quote.id) && (
                      <div className="p-4 border-t border-gray-50">
                        {quoteRevisions
                          .filter(r => r.quote_id === quote.id)
                          .map((revision) => {
                            const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
                              pending: { label: 'En attente de réponse', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock },
                              accepted: { label: 'Révision acceptée', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
                              rejected: { label: 'Révision refusée', color: 'bg-red-50 text-red-700 border-red-200', icon: X },
                              modified: { label: 'Devis modifié', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: FileText },
                            };
                            const statusInfo = statusLabels[revision.status] || statusLabels.pending;
                            const StatusIcon = statusInfo.icon;
                            
                            const revAmount = revision.status === 'accepted' && (revision.suggested_price != null || revision.additional_fees != null)
                              ? (Number(revision.suggested_price ?? 0) + Number(revision.additional_fees ?? 0))
                              : null;
                            return (
                              <div key={revision.id} className="bg-gray-50 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <StatusIcon size={16} className={statusInfo.color.split(' ')[1]} />
                                    <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${statusInfo.color}`}>
                                      {statusInfo.label}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {new Date(revision.requested_at).toLocaleDateString('fr-FR')}
                                  </span>
                                </div>
                                {revision.client_comments && (
                                  <div>
                                    <p className="text-xs font-bold text-gray-700 mb-1">Votre demande :</p>
                                    <p className="text-sm text-gray-600">{revision.client_comments}</p>
                                  </div>
                                )}
                                {revision.artisan_response && (
                                  <div>
                                    <p className="text-xs font-bold text-gray-700 mb-1">Réponse de l&apos;artisan :</p>
                                    <p className="text-sm text-gray-600">{revision.artisan_response}</p>
                                  </div>
                                )}
                                {revision.status === 'accepted' && (
                                  <div>
                                    <p className="text-xs font-bold text-gray-700 mb-1">Montant convenu</p>
                                    <p className="text-sm font-bold text-green-700">
                                      {revAmount != null && revAmount > 0
                                        ? `${revAmount.toLocaleString('fr-FR')} FCFA`
                                        : (quote.amount != null ? `${Number(quote.amount).toLocaleString('fr-FR')} FCFA` : '—')}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Client Action: Annuler le projet */}
          {isClient && ['open', 'quote_received'].includes(displayStatus) && !quotes.some(q => q.status === 'accepted') && !hasAcceptedRevision && (
            <div className="bg-white rounded-2xl border border-red-200 p-4 mt-4">
              <button
                onClick={handleCancelProject}
                disabled={actionLoading}
                className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-xl border border-red-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-100 transition-colors"
              >
                {actionLoading ? (
                  <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <X size={18} />
                    Annuler le projet
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Vous pourrez annuler tant qu'aucun devis n'a été accepté
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Bottom Actions - CLIENT (Paiement) */}
      {isClient && (displayStatus === 'quote_accepted' || project.status === 'payment_pending') && 
       escrow && escrow.status === 'pending' && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-100 bg-white/95 backdrop-blur-md shadow-[0_-2px_20px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto px-4 pt-4 pb-5">
            <button
              onClick={() => navigate(`/projects/${id}/payment`)}
              className="w-full py-3.5 rounded-xl bg-brand-500 text-white font-semibold flex items-center justify-center gap-2.5 hover:bg-brand-600 active:scale-[0.99] transition-all duration-200"
            >
              <CreditCard size={18} strokeWidth={2} />
              Procéder au paiement
            </button>
          </div>
        </div>
      )}

      {/* Bottom Actions - CLIENT (Travaux en cours) */}
      {isClient &&
       (acceptedQuote || (escrow && ['held', 'advance_paid'].includes(escrow.status))) &&
       isPhaseSuivi &&
       !['completion_requested', 'completed'].includes(project?.status || '') && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-100 bg-white/95 backdrop-blur-md shadow-[0_-2px_20px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto px-4 pt-4 pb-5 space-y-2.5">
            <button
              onClick={() => navigate(`/projects/${id}/work`)}
              className="w-full py-3.5 rounded-xl bg-brand-500 text-white font-semibold flex items-center justify-center gap-2.5 hover:bg-brand-600 active:scale-[0.99] transition-all duration-200"
            >
              <Wrench size={18} strokeWidth={2} />
              Voir les travaux
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/completion`)}
              className="w-full py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-[0.99] transition-all duration-200"
            >
              <CheckCircle size={16} strokeWidth={2} />
              Finaliser le projet
            </button>
          </div>
        </div>
      )}

      {/* Bottom Actions - CLIENT (Clôture demandée) */}
      {isClient && project.status === 'completion_requested' && (acceptedQuote || escrow) && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-100 bg-white/95 backdrop-blur-md shadow-[0_-2px_20px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto px-4 pt-4 pb-5 space-y-2.5">
            <button
              onClick={() => navigate(`/projects/${id}/completion`)}
              className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2.5 hover:bg-emerald-700 active:scale-[0.99] transition-all duration-200"
            >
              <CheckCircle size={18} strokeWidth={2} />
              Finaliser le projet
            </button>
            <button
              onClick={() => navigate(`/chat/${id}`)}
              className="w-full py-3 rounded-xl border border-gray-200 bg-white text-gray-600 font-medium flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-[0.99] transition-all duration-200"
            >
              <MessageCircle size={16} strokeWidth={2} />
              Contacter l&apos;artisan
            </button>
          </div>
        </div>
      )}

      {/* Bottom Actions - CLIENT (Projet terminé) */}
      {isClient && project.status === 'completed' && (acceptedQuote || escrow) && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-100 bg-white/95 backdrop-blur-md shadow-[0_-2px_20px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto px-4 pt-4 pb-5">
            <button
              onClick={() => setShowRatingModal(true)}
              className="w-full py-3.5 rounded-xl bg-brand-500 text-white font-semibold flex items-center justify-center gap-2.5 hover:bg-brand-600 active:scale-[0.99] transition-all duration-200"
            >
              <Star size={18} strokeWidth={2} />
              Noter l&apos;artisan
            </button>
          </div>
        </div>
      )}

      {/* Bottom Actions - ARTISAN (Travaux en cours) */}
      {isArtisan &&
       (acceptedQuote?.artisan_id === auth.user?.id || (escrow && ['held', 'advance_paid'].includes(escrow.status))) &&
       isPhaseSuivi &&
       !['completion_requested', 'completed'].includes(project?.status || '') && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-100 bg-white/95 backdrop-blur-md shadow-[0_-2px_20px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto px-4 pt-4 pb-5">
            <button
              onClick={() => navigate(`/projects/${id}/work`)}
              className="w-full py-3.5 rounded-xl bg-brand-500 text-white font-semibold flex items-center justify-center gap-2.5 hover:bg-brand-600 active:scale-[0.99] transition-all duration-200"
            >
              <Wrench size={18} strokeWidth={2} />
              Voir les travaux
            </button>
          </div>
        </div>
      )}

      {/* En attente client - ARTISAN */}
      {isArtisan && (acceptedQuote?.artisan_id === auth.user?.id || escrow) && 
       project.status === 'completion_requested' && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-100 bg-white/95 backdrop-blur-md shadow-[0_-2px_20px_rgba(0,0,0,0.04)]">
          <div className="max-w-lg mx-auto px-4 pt-4 pb-5">
            <div className="rounded-xl bg-amber-50/80 border border-amber-200/60 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Clock size={18} className="text-amber-600" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-amber-900 text-sm">En attente du client</p>
                <p className="text-xs text-amber-700/80 mt-0.5">Il doit confirmer la fin des travaux.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Button - Disponible si un devis accepté existe et que le projet est dans un statut compatible */}
      {acceptedQuote && ['quote_received', 'quote_accepted', 'in_progress', 'completion_requested', 'completed', 'expired', 'cancelled'].includes(displayStatus) && (
        <button 
          onClick={() => navigate(`/chat/${id}`)}
          className="fixed bottom-28 right-4 w-14 h-14 bg-brand-500 text-white rounded-full shadow-lg flex items-center justify-center z-30 hover:bg-brand-600 transition-colors"
          title="Ouvrir le chat du projet"
        >
          <MessageCircle size={24} fill="currentColor" />
        </button>
      )}

      {/* Rating Modal - s'affiche automatiquement après clôture */}
      {showRatingModal && (() => {
        const acceptedQuote = quotes.find(q => q.status === 'accepted');
        if (!acceptedQuote || !project) return null;

        // Récupérer les infos de l'artisan depuis la relation
        const artisanProfile = acceptedQuote.profiles;
        
        return (
          <RatingModal
            isOpen={showRatingModal}
            onClose={() => {
              setShowRatingModal(false);
              navigate('/dashboard');
            }}
            projectId={id!}
            projectTitle={project.title}
            artisanId={acceptedQuote.artisan_id}
            artisanName={artisanProfile?.full_name || 'Artisan'}
            artisanAvatar={artisanProfile?.avatar_url}
            onSuccess={() => {
              setShowRatingModal(false);
              navigate('/dashboard');
            }}
          />
        );
      })()}

      {/* Modal de confirmation d'annulation */}
      <ConfirmModal
        open={showCancelConfirm}
        title="Annuler le projet"
        message="Êtes-vous sûr de vouloir annuler ce projet ? Cette action est irréversible et tous les devis en attente seront automatiquement rejetés."
        confirmText="Oui, annuler"
        cancelText="Non, garder le projet"
        variant="danger"
        onConfirm={confirmCancelProject}
        onCancel={() => setShowCancelConfirm(false)}
      />

      {/* Modal de confirmation clôture participation (artisan) */}
      <ConfirmModal
        open={!!abandonQuoteId}
        title="Clôturer ma participation"
        message="Êtes-vous sûr de vouloir clôturer votre participation à ce projet ? Aucun paiement ne sera effectué. Le client sera notifié."
        confirmText="Oui, clôturer"
        cancelText="Non, annuler"
        variant="danger"
        onConfirm={() => {
          const quoteId = abandonQuoteId;
          setAbandonQuoteId(null);
          if (quoteId) handleAbandonQuote(quoteId);
        }}
        onCancel={() => setAbandonQuoteId(null)}
      />

    </div>
  );
}
