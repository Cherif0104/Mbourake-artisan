import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { HomeButton } from '../components/HomeButton';

export function RequestRevisionPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get('quoteId');
  const auth = useAuth();
  const { success, error: showError } = useToastContext();

  const [project, setProject] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState('');
  const [additionalFees, setAdditionalFees] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!auth.user || !projectId || !quoteId) {
      if (!projectId || !quoteId) {
        showError('Lien invalide : projet ou devis manquant');
        navigate('/dashboard');
      }
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, client_id, title')
          .eq('id', projectId)
          .single();

        if (projectError || !projectData) {
          showError('Projet introuvable');
          navigate('/dashboard');
          return;
        }

        if (projectData.client_id !== auth.user?.id) {
          showError('Vous n\'êtes pas le client de ce projet');
          navigate(`/projects/${projectId}`);
          return;
        }

        const { data: quoteData, error: quoteError } = await supabase
          .from('quotes')
          .select('id, amount, project_id')
          .eq('id', quoteId)
          .single();

        if (quoteError || !quoteData || quoteData.project_id !== projectId) {
          showError('Devis introuvable ou n\'appartient pas à ce projet');
          navigate(`/projects/${projectId}`);
          return;
        }

        setProject(projectData);
        setQuote(quoteData);
      } catch (err: any) {
        showError(err.message || 'Erreur de chargement');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [auth.user, projectId, quoteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.user || !projectId || !quoteId || !project || !quote) return;

    setSubmitting(true);
    try {
      const price = suggestedPrice.trim() ? Math.max(0, Number(suggestedPrice)) : null;
      const fees = additionalFees.trim() ? Math.max(0, Number(additionalFees)) : null;
      const payload: Record<string, unknown> = {
        quote_id: quoteId,
        project_id: projectId,
        requested_by: auth.user.id,
        client_comments: comments.trim() || null,
        status: 'pending' as const,
      };
      if (price != null && !Number.isNaN(price)) payload.suggested_price = price;
      if (fees != null && !Number.isNaN(fees)) payload.additional_fees = fees;

      const { data: revisionData, error: revisionError } = await supabase
        .from('quote_revisions')
        .insert(payload)
        .select('id, quote_id, project_id, requested_by, status, created_at')
        .single();

      if (revisionError) {
        console.error('[RequestRevisionPage] Insert quote_revisions:', revisionError.code, revisionError.message, revisionError.details);
        throw revisionError;
      }

      const { data: quoteRow } = await supabase
        .from('quotes')
        .select('artisan_id')
        .eq('id', quoteId)
        .single();

      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', auth.user.id)
        .single();

      if (quoteRow?.artisan_id && revisionData) {
        try {
          const { notifyArtisanRevisionRequested } = await import('../lib/notificationService');
          await notifyArtisanRevisionRequested(
            projectId,
            quoteId,
            quoteRow.artisan_id,
            clientProfile?.full_name || 'Un client',
            revisionData.id
          );
        } catch (notifErr) {
          console.error('[RequestRevisionPage] Notification:', notifErr);
        }
      }

      success('Demande de révision envoyée avec succès');
      navigate(`/projects/${projectId}`);
    } catch (err: any) {
      console.error('[RequestRevisionPage] Error requesting revision:', err);
      const msg = err?.message || err?.error_description || 'Impossible de créer la demande de révision';
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingOverlay />;
  if (!project || !quote) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-gray-100">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-gray-900">Demander une révision</h1>
            <p className="text-xs text-gray-500">Expliquez ce que vous souhaitez modifier</p>
          </div>
          <HomeButton />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-blue-800 mb-1">Devis actuel</p>
                <p className="text-lg font-black text-blue-900">
                  {(quote.amount || 0).toLocaleString('fr-FR')} FCFA
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  L'artisan recevra votre demande et pourra accepter, refuser ou modifier le devis.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Prix suggéré <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={100}
                value={suggestedPrice}
                onChange={(e) => setSuggestedPrice(e.target.value)}
                placeholder="Ex. 150000"
                className="w-full px-4 py-3 pr-16 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                disabled={submitting}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">FCFA</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Montant que vous proposez à l&apos;artisan</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Frais additionnels <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={100}
                value={additionalFees}
                onChange={(e) => setAdditionalFees(e.target.value)}
                placeholder="Ex. 5000"
                className="w-full px-4 py-3 pr-16 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                disabled={submitting}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">FCFA</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Frais éventuels (déplacement, matériel, etc.)</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Commentaire <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Expliquez ce que vous souhaitez modifier (prix, matériaux, délais...)"
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none text-sm"
              disabled={submitting}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">{comments.length} / 500</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(`/projects/${projectId}`)}
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span className="inline-flex items-center justify-center w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <Send size={16} aria-hidden />
                  <span>Envoyer la demande</span>
                </span>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
