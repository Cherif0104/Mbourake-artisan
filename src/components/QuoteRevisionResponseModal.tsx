import React, { useState } from 'react';
import { X, CheckCircle, XCircle, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';
import { QuoteForm } from './QuoteForm';

interface QuoteRevisionResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  revision: any;
  quote: any;
  project: any;
  onSuccess: () => void;
}

export function QuoteRevisionResponseModal({
  isOpen,
  onClose,
  revision,
  quote,
  project,
  onSuccess
}: QuoteRevisionResponseModalProps) {
  const [action, setAction] = useState<'accept' | 'reject' | 'modify' | null>(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const { success, error: showError } = useToastContext();

  if (!isOpen || !revision || !quote) return null;

  const handleAccept = async () => {
    if (!response.trim()) {
      showError('Veuillez ajouter un commentaire');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('quote_revisions')
        .update({
          status: 'accepted',
          artisan_response: response.trim(),
          responded_at: new Date().toISOString()
        })
        .eq('id', revision.id);

      if (error) throw error;

      // Notifier le client
      if (project?.client_id) {
        const { notifyClientRevisionResponded } = await import('../lib/notificationService');
        const { data: artisanProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', quote.artisan_id)
          .single();

        await notifyClientRevisionResponded(
          project.id,
          quote.id,
          project.client_id,
          artisanProfile?.full_name || 'L\'artisan',
          'accepted',
          revision.id
        );
      }

      success('Révision acceptée. Le client sera notifié.');
      onSuccess();
      onClose();
    } catch (err: any) {
      showError(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!response.trim()) {
      showError('Veuillez expliquer pourquoi vous refusez');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('quote_revisions')
        .update({
          status: 'rejected',
          artisan_response: response.trim(),
          responded_at: new Date().toISOString()
        })
        .eq('id', revision.id);

      if (error) throw error;

      success('Révision refusée. Le client sera notifié.');
      onSuccess();
      onClose();
    } catch (err: any) {
      showError(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleModifyQuoteSuccess = async (newQuoteId: string) => {
    try {
      const { error } = await supabase
        .from('quote_revisions')
        .update({
          status: 'modified',
          modified_quote_id: newQuoteId,
          artisan_response: response.trim() || 'Devis modifié selon votre demande',
          responded_at: new Date().toISOString()
        })
        .eq('id', revision.id);

      if (error) throw error;

      // Notifier le client
      if (project?.client_id) {
        const { notifyClientRevisionResponded } = await import('../lib/notificationService');
        const { data: artisanProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', quote.artisan_id)
          .single();

        await notifyClientRevisionResponded(
          project.id,
          quote.id,
          project.client_id,
          artisanProfile?.full_name || 'L\'artisan',
          'modified',
          revision.id
        );
      }

      success('Nouveau devis créé. Le client sera notifié.');
      setShowQuoteForm(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      showError(`Erreur: ${err.message}`);
    }
  };

  if (showQuoteForm) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
            <h3 className="text-lg font-black text-gray-900">Modifier le devis</h3>
            <button
              onClick={() => setShowQuoteForm(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-4">
            <QuoteForm
              projectId={project.id}
              artisanId={quote.artisan_id}
              onSuccess={(newQuote) => {
                handleModifyQuoteSuccess(newQuote.id);
              }}
              onCancel={() => setShowQuoteForm(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="text-yellow-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Répondre à la révision</h3>
              <p className="text-xs text-gray-500">Choisissez votre action</p>
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
        <div className="p-6 space-y-4">
          {/* Info box */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <p className="text-xs font-bold text-blue-800 mb-2">Demande du client :</p>
            <p className="text-sm text-blue-900">{revision.client_comments}</p>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-blue-700">
                <span className="font-bold">Devis actuel :</span>{' '}
                {quote.amount?.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          </div>

          {/* Action buttons */}
          {!action && (
            <div className="space-y-2">
              <button
                onClick={() => setAction('accept')}
                className="w-full bg-green-50 text-green-700 font-bold py-3 rounded-xl border-2 border-green-200 flex items-center justify-center gap-2 hover:bg-green-100 transition-colors"
              >
                <CheckCircle size={18} />
                Accepter la révision
              </button>
              <button
                onClick={() => setAction('reject')}
                className="w-full bg-red-50 text-red-700 font-bold py-3 rounded-xl border-2 border-red-200 flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
              >
                <XCircle size={18} />
                Refuser la révision
              </button>
              <button
                onClick={() => setAction('modify')}
                className="w-full bg-brand-50 text-brand-700 font-bold py-3 rounded-xl border-2 border-brand-200 flex items-center justify-center gap-2 hover:bg-brand-100 transition-colors"
              >
                <FileText size={18} />
                Modifier le devis
              </button>
            </div>
          )}

          {/* Response form */}
          {action && action !== 'modify' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {action === 'accept' ? 'Votre réponse' : 'Raison du refus'} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder={
                    action === 'accept'
                      ? 'Expliquez comment vous allez procéder...'
                      : 'Expliquez pourquoi vous refusez cette révision...'
                  }
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none text-sm"
                  disabled={loading}
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAction(null);
                    setResponse('');
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={action === 'accept' ? handleAccept : handleReject}
                  disabled={loading || !response.trim()}
                  className={`flex-1 px-4 py-3 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    action === 'accept'
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {action === 'accept' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      Confirmer
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Modify action */}
          {action === 'modify' && (
            <div className="space-y-4">
              <div className="bg-brand-50 rounded-xl p-4 border border-brand-200">
                <p className="text-sm text-brand-900 mb-3">
                  Vous allez créer un nouveau devis modifié. Le client pourra ensuite accepter ou refuser ce nouveau devis.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAction(null);
                      setResponse('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => setShowQuoteForm(true)}
                    className="flex-1 px-4 py-2 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <FileText size={16} />
                    Créer le nouveau devis
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
