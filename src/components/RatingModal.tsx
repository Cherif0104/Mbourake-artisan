import React, { useState, useEffect } from 'react';
import { X, Star, Send, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  artisanId: string;
  artisanName: string;
  artisanAvatar?: string;
  onSuccess: () => void;
  /** Si true, le commentaire est obligatoire et le bouton "Plus tard" est masqué (flux clôture client). */
  requireComment?: boolean;
}

export function RatingModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  artisanId,
  artisanName,
  artisanAvatar,
  onSuccess,
  requireComment = false,
}: RatingModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);
  const { success, error: showError } = useToastContext();

  // Vérifier si une review existe déjà
  useEffect(() => {
    if (!isOpen || !projectId) return;

    const checkExistingReview = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: existing } = await supabase
          .from('reviews')
          .select('id')
          .eq('project_id', projectId)
          .eq('client_id', user.id)
          .eq('artisan_id', artisanId)
          .maybeSingle();

        if (existing) {
          setHasExistingReview(true);
        }
      } catch (err) {
        console.error('Error checking existing review:', err);
      }
    };

    checkExistingReview();
  }, [isOpen, projectId, artisanId]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setRating(5);
      setComment('');
      setHasExistingReview(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating < 1 || rating > 5) {
      showError('Veuillez sélectionner une note entre 1 et 5 étoiles');
      return;
    }
    if (requireComment && !comment.trim()) {
      showError('Veuillez rédiger un commentaire. Votre avis sera visible sur le profil de l\'artisan.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError('Vous devez être connecté');
        return;
      }

      // Vérifier à nouveau si une review existe
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('project_id', projectId)
        .eq('client_id', user.id)
        .eq('artisan_id', artisanId)
        .maybeSingle();

      if (existing) {
        // Mettre à jour la review existante
        const { error: updateError } = await supabase
          .from('reviews')
          .update({
            rating,
            comment: comment.trim() || null,
            created_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Créer une nouvelle review
        const { error: insertError } = await supabase
          .from('reviews')
          .insert({
            project_id: projectId,
            artisan_id: artisanId,
            client_id: user.id,
            rating,
            comment: comment.trim() || null,
          });

        if (insertError) throw insertError;
      }

      // Notifier l'artisan
      try {
        await supabase.from('notifications').insert({
          user_id: artisanId,
          type: 'system',
          title: 'Nouvelle note reçue',
          message: `Vous avez reçu une note de ${rating}/5 pour le projet "${projectTitle}".${comment ? ' Commentaire: ' + comment.substring(0, 100) : ''}`,
          data: { project_id: projectId, rating }
        });
      } catch (notifErr) {
        console.error('Error notifying artisan:', notifErr);
        // Ne pas bloquer si la notification échoue
      }

      success('Merci pour votre avis !');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error submitting rating:', err);
      showError(`Erreur: ${err.message || 'Impossible d\'enregistrer votre avis'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Star className="text-yellow-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Noter l'artisan</h3>
              <p className="text-xs text-gray-500">Partagez votre expérience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            disabled={loading}
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Artisan Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                {artisanAvatar ? (
                  <img src={artisanAvatar} alt={artisanName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-lg text-gray-400">{artisanName[0]?.toUpperCase()}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-gray-900 truncate">{artisanName}</p>
                <p className="text-xs text-gray-500 truncate">{projectTitle}</p>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Votre note <span className="text-red-500">*</span>
            </label>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="focus:outline-none transform transition-all hover:scale-110 active:scale-95"
                  disabled={loading}
                >
                  <Star
                    size={40}
                    className={
                      star <= rating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300 fill-gray-300'
                    }
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">
              {rating === 5 && 'Excellent !'}
              {rating === 4 && 'Très bien'}
              {rating === 3 && 'Bien'}
              {rating === 2 && 'Moyen'}
              {rating === 1 && 'À améliorer'}
            </p>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Votre commentaire {requireComment ? <span className="text-red-500">*</span> : '(optionnel)'}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Partagez votre expérience avec cet artisan..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none text-sm"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {comment.length} / 500 caractères
            </p>
          </div>

          {/* Info */}
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                Votre note et votre commentaire seront visibles publiquement sur le profil de l'artisan et aideront les autres clients.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {!requireComment && (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Plus tard
              </button>
            )}
            <button
              type="submit"
              disabled={loading || rating < 1 || (requireComment && !comment.trim())}
              className={`${requireComment ? 'w-full' : 'flex-1'} px-4 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={16} />
                  Envoyer l'avis
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
