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
import { supabase } from '../lib/supabase';
import { 
  notifyArtisanQuoteAccepted, 
  notifyArtisanQuoteRejected, 
  notifyClientProjectCompleted,
  notifyArtisanPaymentReceived,
  ensureProjectChatExists
} from '../lib/notificationService';
import { SkeletonScreen, LoadingSpinner } from '../components/SkeletonScreen';

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
      // Si un escrow existe (même en pending), on est à l'étape "Payé"
      if (escrowStatus) {
        return escrowStatus === 'held' || escrowStatus === 'advance_paid' || escrowStatus === 'released' ? 3 : 2;
      }
      return 2;
    case 'payment_pending':
      // Si le statut est payment_pending, on est à l'étape "Payé" (en attente de paiement)
      return 3;
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
  const { initiateEscrow, releaseFullPayment } = useEscrow();
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
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  // Ref pour éviter les recharges intempestifs
  const fetchDetailsRef = useRef(false);

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
    } catch (err: any) {
      console.error('Unexpected error in fetchDetails:', err);
      setError(`Erreur inattendue: ${err.message || 'Erreur inconnue'}`);
      setProject(null);
    } finally {
    setLoading(false);
    }
  };

  // Optimiser le useEffect pour éviter les recharges intempestifs
  useEffect(() => {
    // Réinitialiser les refs quand l'ID change
    fetchDetailsRef.current = false;
    
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

  // Grouper les quotes par artisan pour l'historique chronologique
  const groupedQuotes = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    quotes.forEach(quote => {
      const key = quote.artisan_id || 'unknown';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(quote);
    });
    
    // Trier chaque groupe par date de création (chronologique)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => 
        new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );
    });
    
    return groups;
  }, [quotes]);


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
      
      // Update quote status avec vérification d'erreur
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

      // Initiate escrow seulement si aucun escrow n'existe déjà
      if (!existingEscrow) {
        try {
          // Essayer de créer l'escrow via la fonction normale
          const escrowResult = await initiateEscrow({
            project_id: id,
            total_amount: quote.amount,
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
              p_new_value: { total_amount: quote.amount, status: 'pending' }
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
                p_total_amount: quote.amount,
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
      
      // Rediriger vers la page de paiement au lieu de rafraîchir ici
      // Cela évite les problèmes de rendu React et offre une meilleure UX mobile
      setTimeout(() => {
        if (id) {
          navigate(`/projects/${id}/payment`);
        }
      }, 800);
      
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

  const handleCompleteProject = async () => {
    if (!id || !auth.user?.id) return;
    try {
      const oldStatus = project?.status;
      
      // Mettre à jour le statut du projet
      await supabase
        .from('projects')
        .update({ status: 'completed' })
        .eq('id', id);
      
      // Log changement statut projet
      try {
        await supabase.rpc('log_project_action', {
          p_project_id: id,
          p_user_id: auth.user.id,
          p_action: 'status_changed',
          p_old_value: { status: oldStatus },
          p_new_value: { status: 'completed' }
        });
      } catch (logErr) {
        console.error('Error logging project completion:', logErr);
      }
      
      // Libérer le paiement final à l'artisan (clôture normale du projet)
      if (escrow && acceptedQuote?.artisan_id) {
        const oldEscrowStatus = escrow.status;
        
        // Libérer le paiement final
        await releaseFullPayment(escrow.id);
        
        // Log libération paiement
        try {
          await supabase.rpc('log_escrow_action', {
            p_escrow_id: escrow.id,
            p_user_id: auth.user.id,
            p_action: 'released',
            p_old_value: { status: oldEscrowStatus },
            p_new_value: { status: 'released' }
          });
        } catch (logErr) {
          console.error('Error logging payment release:', logErr);
        }

        // Notifier l'artisan du paiement final libéré
        try {
          const remainingAmount = (escrow.artisan_payout || 0) - (escrow.advance_paid || 0);
          if (remainingAmount > 0) {
            await notifyArtisanPaymentReceived(
              id!,
              acceptedQuote.artisan_id,
              remainingAmount
            );
          }
        } catch (notifErr) {
          console.error('Error notifying artisan:', notifErr);
        }
      }
      
      setShowRatingModal(true);
    } catch (err) {
      console.error('Error completing project:', err);
      showError("Erreur lors de la clôture");
    }
  };

  const handleSubmitRating = async () => {
    if (!id || !project || !auth.user?.id) return;
    try {
      const acceptedQuote = quotes.find(q => q.status === 'accepted');
      if (acceptedQuote) {
        const { data: newReview, error: reviewError } = await supabase.from('reviews').insert({
          project_id: id,
          client_id: auth.user.id,
          artisan_id: acceptedQuote.artisan_id,
          rating,
          comment: review || null,
        }).select().single();

        if (reviewError) throw reviewError;

        // Log action notation (le trigger SQL va générer la facture automatiquement)
        try {
          await supabase.rpc('log_project_action', {
            p_project_id: id,
            p_user_id: auth.user.id,
            p_action: 'review_submitted',
            p_new_value: { rating, has_comment: !!review },
            p_metadata: { review_id: newReview?.id, artisan_id: acceptedQuote.artisan_id }
          });
        } catch (logErr) {
          console.error('Error logging review submission:', logErr);
        }

        // Notifier l'artisan qu'il a reçu une note
        try {
          await supabase.from('notifications').insert({
            user_id: acceptedQuote.artisan_id,
            type: 'system',
            title: 'Nouvelle note reçue',
            message: `Vous avez reçu une note de ${rating}/5 pour le projet "${project.title}".${review ? ' Commentaire: ' + review.substring(0, 100) : ''}`,
            data: { project_id: id, review_id: newReview?.id, rating }
          });
        } catch (notifErr) {
          console.error('Error notifying artisan of review:', notifErr);
        }
      }
      setShowRatingModal(false);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error submitting rating:', err);
      showError("Erreur lors de l'envoi de l'avis");
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
      
      // Notifier les artisans ayant soumis un devis
      if (pendingQuotes && pendingQuotes.length > 0) {
        for (const quote of pendingQuotes) {
          if (quote.artisan_id) {
            try {
              await supabase.from('notifications').insert({
                user_id: quote.artisan_id,
                type: 'project_cancelled',
                title: 'Projet annulé',
                message: `Le projet "${project?.title}" a été annulé par le client.`,
                data: { project_id: id }
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
    if (!id || !escrow) return;
    try {
      await supabase
        .from('projects')
        .update({ status: 'disputed' })
        .eq('id', id);
      
      await supabase
        .from('escrows')
        .update({ status: 'frozen' })
        .eq('id', escrow.id);
      
      fetchDetails();
      success("Un litige a été signalé. Notre équipe vous contactera.");
    } catch (err) {
      showError("Erreur lors du signalement");
    }
  };

  // Artisan requests completion
  const handleRequestCompletion = async () => {
    if (!id) return;
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
          PROJECT_STATUS_LABELS[project.status]?.color || 'bg-gray-100 text-gray-600'
        }`}>
          {PROJECT_STATUS_LABELS[project.status]?.label || project.status}
        </span>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-32">
        {/* Escrow Banner - Afficher toujours si escrow existe */}
        {escrow && (
          <EscrowBanner 
            escrow={escrow} 
            isClient={isClient} 
            onRefresh={fetchDetails} 
          />
        )}
        
        {/* Section "En attente de paiement" pour l'artisan */}
        {isArtisan && acceptedQuote?.artisan_id === auth.user?.id && 
         escrow && escrow.status === 'pending' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="font-bold text-blue-900 text-sm">En attente du paiement du client</h3>
                <p className="text-xs text-blue-700 font-medium">Une fois le paiement effectué, vous pourrez commencer les travaux</p>
              </div>
            </div>
            <p className="text-sm text-blue-800 mb-2">
              Votre devis a été accepté ! Le client va procéder au paiement pour sécuriser les fonds.
            </p>
            <p className="text-xs text-blue-600">
              Vous serez notifié dès que le paiement sera reçu et vous pourrez alors commencer les travaux.
            </p>
          </div>
        )}
        
        {/* Message de paiement en attente si statut est payment_pending mais pas d'escrow (mode bypass) */}
        {project?.status === 'payment_pending' && !escrow && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center text-white">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Paiement en attente</h3>
                <p className="text-xs text-yellow-700 font-medium">Mode bypass activé</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              Le devis a été accepté. Le système de paiement est temporairement en mode bypass.
            </p>
            <p className="text-xs text-gray-600">
              Le paiement peut être effectué manuellement par l'administrateur.
            </p>
          </div>
        )}

        {/* Dispute Banner */}
        {project.status === 'disputed' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-red-700 text-sm">Projet en litige</p>
              <p className="text-xs text-red-600 mt-0.5">L'escrow est gelé. Notre équipe va intervenir.</p>
            </div>
          </div>
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

        {/* Timeline Visuelle - HORIZONTALE */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <h3 className="font-bold text-gray-900 text-sm mb-3">Suivi du projet</h3>
          
          <div className="relative px-2">
            {/* Progress Line Horizontale */}
            <div className="absolute left-2 right-2 top-6 h-0.5 bg-gray-100" />
            <div 
              className="absolute left-2 top-6 h-0.5 bg-brand-500 transition-all duration-500"
              style={{ 
                width: `${(getTimelineProgress(project.status, quotes.length > 0, escrow?.status) / (TIMELINE_STEPS.length - 1)) * 100}%` 
              }}
            />
            
            {/* Steps - Horizontaux */}
            <div className="relative flex items-start justify-between gap-2">
              {TIMELINE_STEPS.map((step, index) => {
                const currentProgress = getTimelineProgress(project.status, quotes.length > 0, escrow?.status);
                const isCompleted = index <= currentProgress;
                const isCurrent = index === currentProgress;
                const Icon = step.icon;
                
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
                      {isCurrent && (
                        <p className="text-[10px] text-brand-500 font-medium animate-pulse mt-0.5">
                          En cours
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

            {/* Audio Description */}
            {project.audio_description_url && (
              <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
                <button 
                  onClick={() => new Audio(project.audio_description_url).play()}
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
              <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Video size={20} className="text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">Vidéo jointe</p>
                  <a 
                    href={project.video_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-brand-500 underline"
                  >
                    Voir la vidéo
                  </a>
                </div>
              </div>
            )}

            {/* Photos */}
            {project.photos_urls && project.photos_urls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {project.photos_urls.map((url: string, i: number) => (
                  <img 
                    key={i} 
                    src={url} 
                    alt={`Photo ${i + 1}`} 
                    className="w-20 h-20 rounded-xl object-cover flex-shrink-0 border-2 border-white shadow-sm" 
                  />
                ))}
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

        {/* Quotes Section */}
        <section>
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
             ['open', 'quote_received'].includes(project.status || '') && 
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
                        const StatusIcon = QUOTE_STATUS_LABELS[quote.status]?.icon || Clock;
                        const isExpanded = expandedQuoteId === quote.id;
                        
                        return (
                          <div 
                            id={`quote-${quote.id}`}
                            key={quote.id} 
                            className={`bg-white rounded-2xl border transition-all relative ${
                              quote.status === 'accepted' ? 'border-green-200' :
                              quote.status === 'rejected' ? 'border-gray-200 opacity-60' :
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
                          <p className="text-lg font-black text-brand-500">{quote.amount?.toLocaleString('fr-FR')} FCFA</p>
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
                        QUOTE_STATUS_LABELS[quote.status]?.color || 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        <StatusIcon size={12} />
                        {QUOTE_STATUS_LABELS[quote.status]?.label || quote.status}
                      </div>

                      {/* Raison de refus - Affichée si le devis est rejeté avec raison */}
                      {quote.status === 'rejected' && quote.rejection_reason && (
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

                      {/* Expand/Collapse */}
                      <button 
                        onClick={() => setExpandedQuoteId(isExpanded ? null : quote.id)}
                        className="w-full mt-3 flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded ? 'Voir moins' : 'Voir détails'}
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
                              onClick={() => new Audio(quote.audio_message_url).play()}
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
                          onClick={() => {
                            import('../lib/quotePdfGenerator').then(({ downloadQuotePDF }) => {
                              const quoteData = {
                                quote_number: quote.quote_number || 'N/A',
                                artisan_name: quote.profiles?.full_name || 'Artisan',
                                artisan_phone: quote.profiles?.phone || undefined,
                                artisan_email: quote.profiles?.email || undefined,
                                project_title: project?.title || 'Projet',
                                client_name: project?.profiles?.full_name || undefined,
                                amount: Number(quote.amount || 0),
                                labor_cost: quote.labor_cost ? Number(quote.labor_cost) : undefined,
                                materials_cost: quote.materials_cost ? Number(quote.materials_cost) : undefined,
                                urgent_surcharge_percent: quote.urgent_surcharge_percent || undefined,
                                urgent_surcharge: quote.urgent_surcharge_percent && quote.amount 
                                  ? Number(quote.amount) * (quote.urgent_surcharge_percent / 100) 
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

                    {/* Client Actions - Visibles tant qu'aucun devis n'est accepté ET que le projet n'est pas en stage de paiement */}
                    {isClient && !quotes.some(q => q.status === 'accepted') && project?.status !== 'payment_pending' && project?.status !== 'in_progress' && project?.status !== 'completion_requested' && project?.status !== 'completed' && ['pending', 'viewed'].includes(quote.status) && !actionLoading && (
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
          {isClient && ['open', 'quote_received'].includes(project.status) && !quotes.some(q => q.status === 'accepted') && (
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

      {/* Bottom Actions - CLIENT (Escrow pending - Pay now) */}
      {isClient && (project.status === 'quote_accepted' || project.status === 'payment_pending') && 
       escrow && escrow.status === 'pending' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20 space-y-2">
          <button
            onClick={() => navigate(`/projects/${id}/payment`)}
            className="w-full bg-brand-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-brand-600 transition-colors"
          >
            <CreditCard size={20} />
            Procéder au paiement
          </button>
        </div>
      )}

      {/* Bottom Actions - CLIENT (Escrow held - Work page) */}
      {isClient && (project.status === 'in_progress' || project.status === 'completion_requested') && 
       escrow && (escrow.status === 'held' || escrow.status === 'advance_paid') && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20 space-y-2">
          <button
            onClick={() => navigate(`/projects/${id}/work`)}
            className="w-full bg-brand-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-brand-600 transition-colors"
          >
            <Wrench size={20} />
            Voir les travaux en cours
          </button>
          {project.status === 'completion_requested' && (
            <button
              onClick={() => navigate(`/projects/${id}/completion`)}
              className="w-full bg-green-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
            >
              <CheckCircle size={18} />
              Finaliser le projet
            </button>
          )}
        </div>
      )}

      {/* Bottom Actions - CLIENT (Completion Requested) */}
      {isClient && project.status === 'completion_requested' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20 space-y-2">
          <button
            onClick={() => navigate(`/projects/${id}/completion`)}
            className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-green-600 transition-colors"
          >
            <CheckCircle size={20} />
            Finaliser le projet
          </button>
          <button
            onClick={() => navigate(`/chat/${id}`)}
            className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
          >
            <MessageCircle size={18} />
            Contacter l'artisan
          </button>
        </div>
      )}

      {/* Bottom Actions - ARTISAN (Work page) */}
      {isArtisan && acceptedQuote?.artisan_id === auth.user?.id && 
       project.status === 'in_progress' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20 space-y-2">
          <button
            onClick={() => navigate(`/projects/${id}/work`)}
            className="w-full bg-brand-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-brand-600 transition-colors"
          >
            <Wrench size={20} />
            Voir les travaux en cours
          </button>
        </div>
      )}

      {/* Waiting for client - ARTISAN */}
      {isArtisan && acceptedQuote?.artisan_id === auth.user?.id && 
       project.status === 'completion_requested' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
            <Clock size={20} className="text-yellow-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-yellow-800 text-sm">En attente du client</p>
              <p className="text-xs text-yellow-600">Le client doit confirmer la fin des travaux pour libérer le paiement.</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Button - Disponible si devis accepté, même pour projets expirés */}
      {acceptedQuote && ['quote_accepted', 'in_progress', 'completion_requested', 'completed', 'expired', 'cancelled'].includes(project.status || '') && (
        <button 
          onClick={() => navigate(`/chat/${id}`)}
          className="fixed bottom-28 right-4 w-14 h-14 bg-brand-500 text-white rounded-full shadow-lg flex items-center justify-center z-30 hover:bg-brand-600 transition-colors"
          title="Ouvrir le chat du projet"
        >
          <MessageCircle size={24} fill="currentColor" />
        </button>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Projet Terminé !</h3>
              <p className="text-sm text-gray-500">Évaluez ce service</p>
            </div>
            
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)}>
                  <Star size={36} className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                </button>
              ))}
            </div>
            
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Partagez votre expérience..."
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl mb-4 min-h-20 focus:outline-none focus:border-brand-500"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  navigate('/dashboard');
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl"
              >
                Plus tard
              </button>
              <button
                onClick={handleSubmitRating}
                className="flex-1 py-3 bg-brand-500 text-white font-bold rounded-xl"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
