import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle, AlertTriangle, Star, User, Shield, 
  MessageCircle, Award, Send, FileText, Wrench
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEscrow } from '../hooks/useEscrow';
import { useToastContext } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { notifyArtisanPaymentReceived } from '../lib/notificationService';
import { SkeletonScreen } from '../components/SkeletonScreen';
import { HomeButton } from '../components/HomeButton';

export function ProjectCompletionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const { releaseFullPayment } = useEscrow();
  const { success, error: showError } = useToastContext();
  
  const [project, setProject] = useState<any>(null);
  const [escrow, setEscrow] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [artisan, setArtisan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isArtisanAssigned, setIsArtisanAssigned] = useState(false);
  
  // Rating state (étoiles vides au départ, le client choisit)
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

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

        // Fetch escrow
        const { data: eData } = await supabase
          .from('escrows')
          .select('*')
          .eq('project_id', id)
          .maybeSingle();
        setEscrow(eData || null);

        // Fetch accepted quote (sans join pour éviter RLS / FK)
        let qData: any = null;
        const { data: qRow, error: qErr } = await supabase
          .from('quotes')
          .select('id, artisan_id, amount, status, created_at')
          .eq('project_id', id)
          .eq('status', 'accepted')
          .maybeSingle();

        if (!qErr && qRow) {
          qData = qRow;
          setQuote(qRow);
          if (qRow.artisan_id) {
            const { data: art } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', qRow.artisan_id)
              .maybeSingle();
            setArtisan(art || null);
          }
        }

        // Fallback : devis accepté via révision (quote peut ne pas avoir status 'accepted' selon RLS)
        if (!qData) {
          const { data: revRow } = await supabase
            .from('quote_revisions')
            .select('quote_id')
            .eq('project_id', id)
            .eq('status', 'accepted')
            .order('responded_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (revRow?.quote_id) {
            const { data: qById } = await supabase
              .from('quotes')
              .select('id, artisan_id, amount, status, created_at')
              .eq('id', revRow.quote_id)
              .maybeSingle();
            if (qById) {
              qData = qById;
              setQuote(qById);
              if (qById.artisan_id) {
                const { data: art } = await supabase
                  .from('profiles')
                  .select('id, full_name, avatar_url')
                  .eq('id', qById.artisan_id)
                  .maybeSingle();
                setArtisan(art || null);
              }
            }
          }
        }

        // Accès : client OU artisan assigné (alignement côté artisan)
        const clientFlag = pData.client_id === auth.user.id;
        const artisanFlag = qData?.artisan_id === auth.user.id;
        setIsClient(clientFlag);
        setIsArtisanAssigned(artisanFlag);
        if (!clientFlag && !artisanFlag) {
          showError('Vous n\'êtes pas autorisé à accéder à cette page.');
          navigate(`/projects/${id}`);
          return;
        }

        // Check if already completed (pour affichage client ou artisan)
        if (pData.status === 'completed') {
          setCompleted(true);
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

  const handleCompleteAndRate = async () => {
    if (!id || !auth.user?.id) {
      showError('Session invalide. Rechargez la page.');
      return;
    }
    if (!quote?.artisan_id) {
      showError('Devis accepté introuvable. Rechargez la page ou contactez le support.');
      return;
    }
    if (rating < 1 || rating > 5) {
      showError('Veuillez sélectionner une note entre 1 et 5 étoiles');
      return;
    }

    try {
      setActionLoading(true);
      
      // 1. Save rating
      const { error: reviewError } = await supabase
        .from('reviews')
        .insert({
          project_id: id,
          artisan_id: quote.artisan_id,
          client_id: auth.user.id,
          rating,
          comment: comment.trim() || null,
        });

      if (reviewError) {
        console.error('Review error:', reviewError);
        // Continue even if review fails (might already exist)
      }

      // 2. Release payment if escrow exists
      if (escrow?.id) {
        try {
          await releaseFullPayment(escrow.id);
        } catch (paymentErr) {
          console.error('Payment release error:', paymentErr);
          // Continue even if payment release fails
        }
      }
      
      // 3. Update project status
      const { error: updateError } = await supabase
        .from('projects')
        .update({ status: 'completed' })
        .eq('id', id);

      if (updateError) throw updateError;

      // 4. Notify artisan
      if (quote?.artisan_id && project?.title) {
        try {
          await notifyArtisanPaymentReceived(
            id,
            quote.artisan_id,
            Number(escrow?.artisan_payout || 0)
          );

          // Also notify about the rating
          await supabase.from('notifications').insert({
            user_id: quote.artisan_id,
            type: 'system',
            title: 'Nouvelle note reçue',
            message: `Vous avez reçu une note de ${rating}/5 pour le projet "${project.title}".`,
            data: { project_id: id, rating }
          });
        } catch (notifErr) {
          console.error('Notification error:', notifErr);
        }
      }

      setCompleted(true);
      success('Projet terminé avec succès ! Merci pour votre avis.');
      
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

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Projet non trouvé</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold mt-4"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  // Success state after completion
  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-20 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
          <HomeButton />
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 truncate">Projet terminé</h1>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-12 text-center">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
            <Award size={48} className="text-white" />
          </div>
          
          <h2 className="text-2xl font-black text-gray-900 mb-3">Félicitations !</h2>
          <p className="text-gray-600 mb-8 max-w-sm mx-auto">
            Le projet a été clôturé avec succès. Le paiement a été versé à l'artisan.
            Merci pour votre confiance !
          </p>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-brand-500 text-white font-bold py-4 rounded-2xl hover:bg-brand-600 transition-colors"
            >
              Retour au tableau de bord
            </button>
            <button
              onClick={() => navigate(`/projects/${id}`)}
              className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Voir le projet
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Vue lecture seule pour l'artisan assigné (pas le client)
  if (isArtisanAssigned && !isClient) {
    const isProjectCompleted = project.status === 'completed';
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-20 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
          <HomeButton />
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 truncate">
              {isProjectCompleted ? 'Projet terminé' : 'Clôture demandée'}
            </h1>
            <p className="text-xs text-gray-400 font-mono">{project.project_number}</p>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-8">
          <section className="bg-white rounded-2xl p-5 mb-6 border border-gray-100">
            <h2 className="font-bold text-lg text-gray-900 mb-4">{project.title}</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-700">
                {isProjectCompleted
                  ? 'Le client a clôturé le projet. Le paiement vous a été versé.'
                  : 'En attente de la confirmation du client pour clôturer le projet.'}
              </p>
            </div>
          </section>

          <div className="space-y-3">
            <button
              onClick={() => navigate(`/projects/${id}/work`)}
              className="w-full bg-brand-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-brand-600 transition-colors"
            >
              <Wrench size={18} />
              Voir les travaux
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Retour au tableau de bord
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
        <HomeButton />
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">Clôturer le projet</h1>
          <p className="text-xs text-gray-400 font-mono">{project.project_number}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-40">
        {/* Project Summary */}
        <section className="bg-white rounded-2xl p-5 mb-6 border border-gray-100">
          <h2 className="font-bold text-lg text-gray-900 mb-4">{project.title}</h2>
          
          {artisan && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {artisan.avatar_url ? (
                  <img src={artisan.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900">{artisan.full_name || 'Artisan'}</p>
                <p className="text-xs text-gray-500">Artisan</p>
              </div>
            </div>
          )}

          {escrow && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-green-600" />
                <span className="text-xs font-bold text-green-800">Paiement à libérer</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">Montant total</span>
                <span className="font-black text-green-900 text-lg">
                  {Number(escrow.total_amount || 0).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Rating Section */}
        <section className="bg-white rounded-2xl p-5 mb-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Star size={20} className="text-yellow-500" />
            <h3 className="font-bold text-gray-900">Noter l'artisan</h3>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Votre avis aide les autres clients à choisir le bon artisan.
          </p>

          {/* Star Rating */}
          <div className="flex justify-center gap-3 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="focus:outline-none transform transition-all hover:scale-110 active:scale-95"
              >
                <Star
                  size={40}
                  className={
                    star <= rating
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }
                />
              </button>
            ))}
          </div>
          
          <p className="text-center text-sm text-gray-500 mb-4">
            {rating === 0
              ? 'Sélectionnez une note entre 1 et 5 étoiles'
              : rating === 5
                ? 'Excellent !'
                : rating === 4
                  ? 'Très bien'
                  : rating === 3
                    ? 'Bien'
                    : rating === 2
                      ? 'Moyen'
                      : 'À améliorer'}
          </p>

          {/* Commentaire (optionnel) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Votre commentaire <span className="text-gray-400 font-normal text-xs ml-1">(optionnel)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Décrivez votre expérience avec cet artisan..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none text-sm"
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {comment.length} / 500 caractères
            </p>
          </div>
        </section>

        {/* Info */}
        <section className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
          <p className="text-xs text-blue-800 leading-relaxed">
            <strong>En clôturant ce projet :</strong>
            <br />• Le paiement sera immédiatement versé à l'artisan
            <br />• Votre avis sera visible sur son profil
            <br />• Cette action est définitive
          </p>
        </section>
      </main>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20 space-y-3">
        <div className="min-h-0 shrink-0" key="quote-warning">
          {!quote?.artisan_id ? (
            <p className="text-center text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl py-2 px-3">
              Devis accepté introuvable. Rechargez la page ou retournez au projet.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleCompleteAndRate().catch((err) => {
              console.error('Clôture / notation:', err);
              showError(err?.message ?? 'Une erreur est survenue. Réessayez.');
            });
          }}
          disabled={actionLoading || rating < 1}
          className="w-full bg-green-500 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2.5 hover:bg-green-600 active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {actionLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <CheckCircle size={18} strokeWidth={2} />
              Clôturer et envoyer mon avis
            </>
          )}
        </button>
        
        <button
          type="button"
          onClick={() => navigate(`/projects/${id}#devis`)}
          className="w-full py-2.5 rounded-xl text-gray-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-50 hover:text-gray-800 transition-colors"
        >
          <FileText size={16} strokeWidth={2} />
          Voir le projet et les devis
        </button>
        <button
          type="button"
          onClick={() => navigate(`/chat/${id}`)}
          className="w-full py-2.5 rounded-xl text-gray-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-50 hover:text-gray-800 transition-colors"
        >
          <MessageCircle size={16} strokeWidth={2} />
          Contacter l'artisan
        </button>
      </div>
    </div>
  );
}
