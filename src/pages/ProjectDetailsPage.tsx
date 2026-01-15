import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, Calendar, Play, MessageCircle, CheckCircle, X, 
  RotateCcw, Star, ThumbsUp, Hash, Clock, AlertTriangle, FileText,
  Mic, User, Video, ChevronDown, ChevronUp, Shield, Circle, CreditCard,
  Wrench, Award
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useEscrow } from '../hooks/useEscrow';
import { EscrowBanner } from '../components/EscrowBanner';
import { QuoteForm } from '../components/QuoteForm';
import { RevisionRequest } from '../components/RevisionRequest';
import { supabase } from '../lib/supabase';
import { 
  notifyArtisanQuoteAccepted, 
  notifyArtisanQuoteRejected, 
  notifyArtisanRevisionRequested,
  notifyClientProjectCompleted 
} from '../lib/notificationService';
import { generateQuotePDF } from '../lib/quotePdfGenerator';

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
  revision_requested: { label: 'Révision demandée', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: RotateCcw },
  revised: { label: 'Révisé', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: RotateCcw },
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
      if (escrowStatus === 'held') return 3;
      return 2;
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
  const auth = useAuth();
  const { profile } = useProfile();
  const { initiateEscrow } = useEscrow();
  
  const [project, setProject] = useState<any>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [escrow, setEscrow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI States
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [revisionQuoteId, setRevisionQuoteId] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);

  const fetchDetails = async () => {
    if (!id) return;
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

    // Fetch quotes with artisan profiles
      const { data: qData, error: qError } = await supabase
      .from('quotes')
      .select('*, profiles(*)')
      .eq('project_id', id)
      .order('created_at', { ascending: false });

      if (qError) {
        console.error('Error fetching quotes:', qError);
      }
    setQuotes(qData || []);

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

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleAcceptQuote = async (quote: any) => {
    if (!id) return;
    try {
      // Update quote status
      await supabase
        .from('quotes')
        .update({ status: 'accepted' })
        .eq('id', quote.id);
      
      // Reject other quotes
      await supabase
        .from('quotes')
        .update({ status: 'rejected' })
        .eq('project_id', id)
        .neq('id', quote.id);
      
      // Update project status
      await supabase
        .from('projects')
        .update({ status: 'quote_accepted' })
        .eq('id', id);

      // Initiate escrow
      await initiateEscrow({
        project_id: id,
        total_amount: quote.amount,
        artisan_is_verified: quote.profiles?.is_verified ?? false,
      });

      // Notifier l'artisan
      if (quote.artisan_id && project?.title) {
        await notifyArtisanQuoteAccepted(id, quote.artisan_id, project.title);
      }
      
      fetchDetails();
    } catch (err) {
      alert("Erreur lors de l'acceptation");
    }
  };

  const handleRejectQuote = async (quoteId: string) => {
    try {
      const quote = quotes.find(q => q.id === quoteId);
      await supabase
        .from('quotes')
        .update({ status: 'rejected' })
        .eq('id', quoteId);
      
      // Notifier l'artisan
      if (quote?.artisan_id && project?.title) {
        await notifyArtisanQuoteRejected(id!, quote.artisan_id, project.title);
      }
      
      fetchDetails();
    } catch (err) {
      alert("Erreur lors du refus");
    }
  };

  const handleCompleteProject = async () => {
    if (!id || !auth.user?.id) return;
    try {
      // Mettre à jour le statut du projet
      await supabase
        .from('projects')
        .update({ status: 'completed' })
        .eq('id', id);
      
      // Créer une demande de remboursement (au lieu de rembourser directement)
      if (escrow) {
        await supabase
          .from('escrows')
          .update({ 
            refund_requested_at: new Date().toISOString(),
            refund_status: 'pending',
            refund_requested_by: auth.user.id,
            status: 'held' // Garder en "held" jusqu'à validation admin
          })
          .eq('id', escrow.id);
      }
      
      // Notifier l'admin qu'un remboursement est demandé
      // (cette notification sera gérée dans AdminEscrows)
      
      setShowRatingModal(true);
    } catch (err) {
      console.error('Error completing project:', err);
      alert("Erreur lors de la clôture");
    }
  };

  const handleSubmitRating = async () => {
    if (!id || !project) return;
    try {
      const acceptedQuote = quotes.find(q => q.status === 'accepted');
      if (acceptedQuote) {
        await supabase.from('reviews').insert({
          project_id: id,
          client_id: auth.user?.id,
          artisan_id: acceptedQuote.artisan_id,
          rating,
          comment: review,
        });
      }
      setShowRatingModal(false);
      navigate('/dashboard');
    } catch (err) {
      alert("Erreur lors de l'envoi de l'avis");
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
      alert("Un litige a été signalé. Notre équipe vous contactera.");
    } catch (err) {
      alert("Erreur lors du signalement");
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
      alert("Demande de clôture envoyée au client !");
    } catch (err) {
      alert("Erreur lors de la demande");
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

  const isClient = project.client_id === auth.user?.id;
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
        {/* Escrow Banner */}
        {escrow && (
          <EscrowBanner 
            escrow={escrow} 
            isClient={isClient} 
            onRefresh={fetchDetails} 
          />
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

        {/* Timeline Visuelle */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h3 className="font-bold text-gray-900 text-sm mb-4">Suivi du projet</h3>
          
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-100" />
            <div 
              className="absolute left-6 top-0 w-0.5 bg-brand-500 transition-all duration-500"
              style={{ 
                height: `${(getTimelineProgress(project.status, quotes.length > 0, escrow?.status) / (TIMELINE_STEPS.length - 1)) * 100}%` 
              }}
            />
            
            {/* Steps */}
            <div className="relative space-y-4">
              {TIMELINE_STEPS.map((step, index) => {
                const currentProgress = getTimelineProgress(project.status, quotes.length > 0, escrow?.status);
                const isCompleted = index <= currentProgress;
                const isCurrent = index === currentProgress;
                const Icon = step.icon;
                
                return (
                  <div key={step.id} className="flex items-center gap-4">
                    <div className={`relative z-10 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      isCompleted 
                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-200' 
                        : 'bg-gray-100 text-gray-400'
                    } ${isCurrent ? 'ring-4 ring-brand-100' : ''}`}>
                      <Icon size={20} strokeWidth={isCompleted ? 2.5 : 2} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-bold text-sm ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-brand-500 font-medium animate-pulse">
                          En cours...
                        </p>
                      )}
                    </div>
                    {isCompleted && !isCurrent && (
                      <CheckCircle size={18} className="text-green-500" />
                    )}
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
        {showQuoteForm && isArtisan && !isClient && !hasSubmittedQuote && (
          <div className="mb-6">
            <QuoteForm
              projectId={id!}
              artisanId={auth.user!.id}
              isUrgent={project.is_urgent}
              onSuccess={() => {
                setShowQuoteForm(false);
                fetchDetails();
              }}
              onCancel={() => setShowQuoteForm(false)}
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
            {isArtisan && !isClient && !hasSubmittedQuote && 
             ['open', 'quote_received'].includes(project.status || '') && 
             project.status !== 'expired' && 
             project.status !== 'cancelled' && 
             !showQuoteForm && (
              <button
                onClick={() => setShowQuoteForm(true)}
                className="px-4 py-2 bg-brand-500 text-white text-sm font-bold rounded-xl"
              >
                Proposer un devis
              </button>
            )}
            
            {/* Message pour projets expirés/annulés */}
            {isArtisan && !isClient && !hasSubmittedQuote && 
             ['expired', 'cancelled'].includes(project.status || '') && (
              <p className="text-xs text-gray-500 italic">
                Ce projet n'accepte plus de nouveaux devis
              </p>
            )}
          </div>

          {/* Revision Request Modal */}
          {revisionQuoteId && (() => {
            const revisionQuote = quotes.find(q => q.id === revisionQuoteId);
            return revisionQuote ? (
            <div className="mb-4">
              <RevisionRequest
                quoteId={revisionQuoteId}
                  currentAmount={revisionQuote.amount || 0}
                  projectId={id!}
                  artisanId={revisionQuote.artisan_id!}
                  projectTitle={project?.title || ''}
                onSuccess={() => {
                  setRevisionQuoteId(null);
                  fetchDetails();
                }}
                onCancel={() => setRevisionQuoteId(null)}
              />
            </div>
            ) : null;
          })()}

          {quotes.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
              <Mic size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">Aucun devis pour le moment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map((quote) => {
                const StatusIcon = QUOTE_STATUS_LABELS[quote.status]?.icon || Clock;
                const isExpanded = expandedQuoteId === quote.id;
                
                return (
                  <div 
                    key={quote.id} 
                    className={`bg-white rounded-2xl border transition-all ${
                      quote.status === 'accepted' ? 'border-green-200' :
                      quote.status === 'revision_requested' ? 'border-yellow-200' :
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
                            <p className="text-[9px] text-gray-400 font-mono">{quote.quote_number}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-brand-500">{quote.amount?.toLocaleString('fr-FR')} FCFA</p>
                          {quote.urgent_surcharge_percent > 0 && (
                            <p className="text-[10px] text-yellow-600">+{quote.urgent_surcharge_percent}% urgence</p>
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

                      {/* Revision Reason */}
                      {quote.status === 'revision_requested' && quote.revision_reason && (
                        <div className="mt-3 bg-yellow-50 rounded-xl p-3">
                          <p className="text-xs font-bold text-yellow-700 uppercase mb-1">Raison de la révision</p>
                          <p className="text-sm text-yellow-800">{quote.revision_reason}</p>
                          {quote.client_suggested_price && (
                            <p className="text-sm text-yellow-700 font-bold mt-1">
                              Prix suggéré: {quote.client_suggested_price.toLocaleString('fr-FR')} FCFA
                            </p>
                          )}
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
                            generateQuotePDF(quoteData);
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

                    {/* Client Actions */}
                    {isClient && ['open', 'quote_received'].includes(project.status) && quote.status === 'pending' && (
                      <div className="p-4 border-t border-gray-50 space-y-2">
                        <button 
                          onClick={() => handleAcceptQuote(quote)}
                          className="w-full bg-green-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={18} />
                          Accepter ce devis
                        </button>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setRevisionQuoteId(quote.id)}
                            className="flex-1 bg-yellow-50 text-yellow-700 font-bold py-3 rounded-xl border border-yellow-200 flex items-center justify-center gap-2"
                          >
                            <RotateCcw size={16} />
                            Révision
                          </button>
                          <button 
                            onClick={() => handleRejectQuote(quote.id)}
                            className="flex-1 bg-red-50 text-red-600 font-bold py-3 rounded-xl border border-red-200 flex items-center justify-center gap-2"
                          >
                            <X size={16} />
                            Refuser
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Artisan Actions for Revision Request */}
                    {isArtisan && quote.artisan_id === auth.user?.id && quote.status === 'revision_requested' && (
                      <div className="p-4 border-t border-gray-50 space-y-2">
                        <button 
                          onClick={() => setShowQuoteForm(true)}
                          className="w-full bg-brand-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                        >
                          <RotateCcw size={18} />
                          Soumettre un nouveau devis
                        </button>
                        <button 
                          onClick={async () => {
                            await supabase.from('quotes').update({ status: 'abandoned' }).eq('id', quote.id);
                            fetchDetails();
                          }}
                          className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-xl"
                        >
                          Abandonner
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Bottom Actions - CLIENT */}
      {isClient && project.status === 'quote_accepted' && escrow?.status === 'held' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20 space-y-2">
          <button
            onClick={handleCompleteProject}
            className="w-full bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
          >
            <ThumbsUp size={20} />
            Confirmer la fin des travaux
          </button>
          <button
            onClick={handleReportDispute}
            className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-red-200"
          >
            <AlertTriangle size={18} />
            Signaler un litige
          </button>
        </div>
      )}

      {/* Bottom Actions - CLIENT (Completion Requested) */}
      {isClient && project.status === 'completion_requested' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20 space-y-2">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-2 flex items-center gap-2">
            <Clock size={16} className="text-blue-500" />
            <p className="text-sm text-blue-700 font-medium">L'artisan a terminé les travaux et attend votre confirmation.</p>
          </div>
          <button
            onClick={handleCompleteProject}
            className="w-full bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
          >
            <ThumbsUp size={20} />
            Confirmer et valider
          </button>
          <button
            onClick={handleReportDispute}
            className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-red-200"
          >
            <AlertTriangle size={18} />
            Signaler un problème
          </button>
        </div>
      )}

      {/* Bottom Actions - ARTISAN (Request Completion) */}
      {isArtisan && acceptedQuote?.artisan_id === auth.user?.id && 
       ['quote_accepted', 'in_progress'].includes(project.status) && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20 space-y-2">
          <button
            onClick={handleRequestCompletion}
            className="w-full bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Travaux terminés - Demander clôture
          </button>
          <button
            onClick={handleReportDispute}
            className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-red-200"
          >
            <AlertTriangle size={18} />
            Signaler un litige
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
    </div>
  );
}
