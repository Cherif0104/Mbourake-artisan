import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertTriangle, Star, MessageSquare, ThumbsUp, User, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useEscrow } from '../hooks/useEscrow';
import { useToastContext } from '../contexts/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { supabase } from '../lib/supabase';
import { notifyClientProjectCompleted, notifyArtisanPaymentReceived } from '../lib/notificationService';
import { SkeletonScreen } from '../components/SkeletonScreen';
import { HomeButton } from '../components/HomeButton';

export function ProjectCompletionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const { profile } = useProfile();
  const { releaseFullPayment } = useEscrow();
  const { success, error: showError } = useToastContext();
  
  const [project, setProject] = useState<any>(null);
  const [escrow, setEscrow] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [artisan, setArtisan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    if (!id || !auth.user) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch project
        const { data: pData, error: pError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (pError) throw pError;
        setProject(pData);

        // Verify client ownership
        if (pData.client_id !== auth.user.id) {
          showError('Vous n\'êtes pas autorisé à accéder à cette page.');
          navigate(`/projects/${id}`);
          return;
        }

        // Fetch escrow
        const { data: eData } = await supabase
          .from('escrows')
          .select('*')
          .eq('project_id', id)
          .maybeSingle();
        setEscrow(eData || null);

        // Fetch accepted quote with artisan profile
        const { data: qData } = await supabase
          .from('quotes')
          .select('*, profiles!quotes_artisan_id_fkey(*)')
          .eq('project_id', id)
          .eq('status', 'accepted')
          .single();

        if (qData) {
          setQuote(qData);
          setArtisan(qData.profiles);
        }

      } catch (err: any) {
        console.error('Error fetching completion data:', err);
        showError(`Erreur: ${err.message || 'Erreur inconnue'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, auth.user, navigate, showError]);

  const handleRequestCompletion = async () => {
    if (!id || !auth.user?.id) return;
    
    try {
      setActionLoading(true);
      
      // Update project status to completion_requested
      const { error: updateError } = await supabase
        .from('projects')
        .update({ status: 'completion_requested' })
        .eq('id', id);

      if (updateError) throw updateError;

      // Notify artisan
      if (quote?.artisan_id && project?.title) {
        await notifyClientProjectCompleted(id, quote.artisan_id, project.title);
      }

      success('Demande de clôture envoyée ! L\'artisan sera notifié.');
      
      // Redirect back to project
      setTimeout(() => {
        navigate(`/projects/${id}`);
      }, 1500);
      
    } catch (err: any) {
      console.error('Error requesting completion:', err);
      showError(`Erreur: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(false);
      setShowConfirmModal(false);
    }
  };

  const handleCompleteProject = async () => {
    if (!id || !auth.user?.id || !escrow?.id) return;
    
    try {
      setActionLoading(true);
      
      // Release payment
      await releaseFullPayment(escrow.id);
      
      // Update project status
      const { error: updateError } = await supabase
        .from('projects')
        .update({ status: 'completed' })
        .eq('id', id);

      if (updateError) throw updateError;

      // Create review if provided
      if (rating > 0 && quote?.artisan_id) {
        const { error: reviewError } = await supabase
          .from('reviews')
          .insert({
            project_id: id,
            artisan_id: quote.artisan_id,
            client_id: auth.user.id,
            rating,
            comment: review || null,
          });

        if (reviewError) {
          console.error('Error creating review:', reviewError);
        }
      }

      // Notify artisan
      if (quote?.artisan_id && project?.title) {
        await notifyArtisanPaymentReceived(
          id,
          quote.artisan_id,
          Number(escrow.artisan_payout || 0)
        );
      }

      success('Projet terminé avec succès ! Le paiement a été libéré.');
      
      // Show review form or redirect
      if (!showReviewForm && rating === 0) {
        setShowReviewForm(true);
      } else {
        setTimeout(() => {
          navigate(`/projects/${id}`);
        }, 1500);
      }
      
    } catch (err: any) {
      console.error('Error completing project:', err);
      showError(`Erreur: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <SkeletonScreen />;
  }

  if (!project || !escrow) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Données non trouvées</h2>
          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold mt-4"
          >
            Retour au projet
          </button>
        </div>
      </div>
    );
  }

  const isCompletionRequested = project.status === 'completion_requested';
  const canComplete = project.status === 'in_progress' || isCompletionRequested;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
        <HomeButton />
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">Clôture du projet</h1>
          <p className="text-xs text-gray-400 font-mono">{project.project_number}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-32">
        {/* Project Summary */}
        <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100">
          <h2 className="font-bold text-lg text-gray-900 mb-4">{project.title}</h2>
          
          {artisan && (
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {artisan.avatar_url ? (
                  <img src={artisan.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900">{artisan.full_name || 'Artisan'}</p>
                <p className="text-xs text-gray-500">Artisan sélectionné</p>
              </div>
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-700 font-medium">Montant payé</span>
              <span className="font-bold text-green-900">
                {Number(escrow.total_amount || 0).toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>
        </div>

        {/* Status */}
        {isCompletionRequested && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock size={20} className="text-yellow-600" />
              <h3 className="font-bold text-sm text-yellow-900">En attente de confirmation</h3>
            </div>
            <p className="text-xs text-yellow-700 leading-relaxed">
              L'artisan a été notifié de votre demande de clôture. Vous pouvez confirmer la clôture dès que vous êtes satisfait.
            </p>
          </div>
        )}

        {/* Review Form */}
        {showReviewForm && (
          <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Donnez votre avis</h3>
            
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Note</label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      size={36}
                      className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                Commentaire (optionnel)
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={4}
                maxLength={500}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none resize-none text-sm"
                placeholder="Partagez votre expérience..."
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {review.length}/500 caractères
              </p>
            </div>

            <button
              onClick={handleCompleteProject}
              disabled={actionLoading}
              className="w-full bg-brand-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? 'Traitement...' : 'Envoyer l\'avis et terminer'}
            </button>
          </div>
        )}

        {/* Actions */}
        {canComplete && !showReviewForm && (
          <div className="space-y-3">
            {isCompletionRequested ? (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={actionLoading}
                className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
              >
                <CheckCircle size={20} />
                {actionLoading ? 'Traitement...' : 'Confirmer la clôture'}
              </button>
            ) : (
              <button
                onClick={() => handleRequestCompletion()}
                disabled={actionLoading}
                className="w-full bg-brand-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-600 transition-colors"
              >
                <ThumbsUp size={20} />
                {actionLoading ? 'Traitement...' : 'Demander la clôture'}
              </button>
            )}
            
            <button
              onClick={() => navigate(`/chat/${id}`)}
              className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
            >
              <MessageSquare size={18} />
              Contacter l'artisan
            </button>
          </div>
        )}
      </main>

      {/* Confirm Modal */}
      <ConfirmModal
        open={showConfirmModal}
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={handleCompleteProject}
        title="Confirmer la clôture"
        message="Êtes-vous sûr de vouloir clôturer ce projet ? Le paiement sera libéré à l'artisan."
        confirmText="Oui, clôturer"
        cancelText="Annuler"
      />
    </div>
  );
}
