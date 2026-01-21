import React, { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';

interface QuoteRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteId: string;
  projectId: string;
  quoteAmount: number;
  onSuccess: () => void;
}

export function QuoteRevisionModal({
  isOpen,
  onClose,
  quoteId,
  projectId,
  quoteAmount,
  onSuccess
}: QuoteRevisionModalProps) {
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useToastContext();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comments.trim()) {
      showError('Veuillez expliquer pourquoi vous demandez une révision');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError('Vous devez être connecté');
        return;
      }

      // Créer la demande de révision
      const { error: revisionError } = await supabase
        .from('quote_revisions')
        .insert({
          quote_id: quoteId,
          project_id: projectId,
          requested_by: user.id,
          client_comments: comments.trim(),
          status: 'pending'
        });

      if (revisionError) throw revisionError;

      success('Demande de révision envoyée avec succès');
      setComments('');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error requesting revision:', err);
      showError(`Erreur: ${err.message || 'Impossible de créer la demande de révision'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="text-yellow-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Demander une révision</h3>
              <p className="text-xs text-gray-500">Expliquez ce que vous souhaitez modifier</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info box */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-blue-800 mb-1">Devis actuel</p>
                <p className="text-lg font-black text-blue-900">
                  {quoteAmount.toLocaleString('fr-FR')} FCFA
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  L'artisan recevra votre demande et pourra accepter, refuser ou modifier le devis.
                </p>
              </div>
            </div>
          </div>

          {/* Comments field */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Vos commentaires <span className="text-red-500">*</span>
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Expliquez ce que vous souhaitez modifier dans le devis (prix, matériaux, délais, etc.)..."
              rows={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none text-sm"
              disabled={loading}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {comments.length} / 500 caractères
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !comments.trim()}
              className="flex-1 px-4 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={16} />
                  Envoyer la demande
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
