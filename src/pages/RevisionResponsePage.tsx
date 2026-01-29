import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, FileText, AlertCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useEscrow } from '../hooks/useEscrow';
import { QuoteForm } from '../components/QuoteForm';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { HomeButton } from '../components/HomeButton';

export function RevisionResponsePage() {
  const { revisionId } = useParams<{ revisionId: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const { profile } = useProfile();
  const { success, error: showError } = useToastContext();
  const { updateEscrowForNewAmount, initiateEscrow } = useEscrow();

  const [revision, setRevision] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'accept' | 'reject' | 'modify' | null>(null);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  useEffect(() => {
    if (!auth.user || !profile || profile.role !== 'artisan' || !revisionId) {
      if (!revisionId) {
        showError('Révision introuvable');
        navigate('/revisions');
      } else if (!auth.loading && auth.user && profile && profile.role !== 'artisan') {
        navigate('/dashboard');
      }
      setLoading(false);
      return;
    }

    const fetchRevision = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('quote_revisions')
          .select(`
            *,
            quotes!quote_revisions_quote_id_fkey(id, amount, quote_number, status, artisan_id),
            projects!quote_revisions_project_id_fkey(id, title, project_number, client_id)
          `)
          .eq('id', revisionId)
          .single();

        if (error || !data) {
          showError('Révision introuvable');
          navigate('/revisions');
          return;
        }

        const q = data.quotes;
        const p = data.projects;
        if (!q || !p) {
          showError('Données incomplètes');
          navigate('/revisions');
          return;
        }

        if (q.artisan_id !== auth.user?.id) {
          showError('Vous n\'êtes pas l\'artisan concerné par cette révision');
          navigate('/revisions');
          return;
        }

        if (data.status !== 'pending') {
          success('Cette révision a déjà été traitée.');
          navigate('/revisions');
          return;
        }

        setRevision(data);
        setQuote(q);
        setProject(p);
      } catch (err: any) {
        showError(err.message || 'Erreur de chargement');
        navigate('/revisions');
      } finally {
        setLoading(false);
      }
    };

    fetchRevision();
  }, [auth.user, auth.loading, profile, revisionId]);

  const notifyClientAndRedirect = async (outcome: 'accepted' | 'rejected' | 'modified', redirectTo?: string) => {
    if (!project?.client_id || !revision || !quote) return;
    try {
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
        artisanProfile?.full_name || "L'artisan",
        outcome,
        revision.id
      );
    } catch (err) {
      console.error('[RevisionResponsePage] Notification:', err);
    }
    navigate(redirectTo ?? '/revisions');
  };

  const handleAccept = async () => {
    if (!revision || !quote) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('quote_revisions')
        .update({
          status: 'accepted',
          artisan_response: response.trim() || null,
          responded_at: new Date().toISOString(),
        })
        .eq('id', revision.id);
      if (error) throw error;

      const base = revision.suggested_price != null && Number(revision.suggested_price) > 0
        ? Number(revision.suggested_price)
        : null;
      const fees = revision.additional_fees != null && Number(revision.additional_fees) > 0
        ? Number(revision.additional_fees)
        : 0;
      const newAmount = base != null ? base + fees : null;
      const amountToUse = newAmount != null ? newAmount : Math.max(0, Number(quote.amount ?? 0));

      const quoteUpdate = newAmount != null
        ? { amount: newAmount, status: 'accepted' as const }
        : { status: 'accepted' as const };
      const { error: quoteError } = await supabase
        .from('quotes')
        .update(quoteUpdate)
        .eq('id', quote.id);
      if (quoteError) {
        console.error('Erreur mise à jour devis après acceptation révision:', quoteError);
        showError('Révision enregistrée mais erreur sur le devis.');
        setSubmitting(false);
        return;
      }

      const { data: others } = await supabase
        .from('quotes')
        .select('id')
        .eq('project_id', project.id)
        .neq('id', quote.id)
        .in('status', ['pending', 'viewed']);
      if (others?.length) {
        await supabase.from('quotes').update({ status: 'rejected' }).in('id', others.map((o: { id: string }) => o.id));
      }

      /* Projet mis à jour via trigger DB (set_project_quote_accepted_on_revision_accepted)
         car l'artisan n'a pas les droits UPDATE sur projects. */

      const { data: escrow } = await supabase
        .from('escrows')
        .select('id, status')
        .eq('project_id', project.id)
        .maybeSingle();
      if (escrow && (escrow.status === 'pending' || escrow.status === 'held')) {
        try {
          await updateEscrowForNewAmount(escrow.id, amountToUse);
        } catch (e) {
          console.error('Erreur mise à jour escrow après révision acceptée:', e);
        }
      } else if (!escrow && amountToUse > 0) {
        const { data: art } = await supabase
          .from('artisans')
          .select('is_verified')
          .eq('id', quote.artisan_id)
          .maybeSingle();
        try {
          await initiateEscrow({
            project_id: project.id,
            total_amount: amountToUse,
            artisan_is_verified: !!art?.is_verified,
          });
        } catch (e) {
          console.error('Erreur création escrow après révision acceptée:', e);
        }
      }

      success(newAmount != null
        ? 'Révision acceptée. Le montant affiché sur le projet est désormais celui convenu.'
        : 'Révision acceptée. Accord conclu ; vous pouvez procéder au paiement.');
      await notifyClientAndRedirect('accepted', `/projects/${project.id}`);
    } catch (err: any) {
      showError(err.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!revision) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('quote_revisions')
        .update({
          status: 'rejected',
          artisan_response: response.trim() || null,
          responded_at: new Date().toISOString(),
        })
        .eq('id', revision.id);
      if (error) throw error;
      success('Révision refusée. Le client sera notifié.');
      await notifyClientAndRedirect('rejected');
    } catch (err: any) {
      showError(err.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleModifyQuoteSuccess = async () => {
    if (!revision || !project || !quote) return;
    setSubmitting(true);
    try {
      const { data: latestQuotes } = await supabase
        .from('quotes')
        .select('id, amount')
        .eq('project_id', project.id)
        .eq('artisan_id', quote.artisan_id)
        .order('created_at', { ascending: false })
        .limit(1);

      const newQuote = latestQuotes?.[0];
      if (!newQuote?.id) {
        showError('Impossible de récupérer le nouveau devis');
        return;
      }

      const { error } = await supabase
        .from('quote_revisions')
        .update({
          status: 'modified',
          modified_quote_id: newQuote.id,
          artisan_response: response.trim() || null,
          responded_at: new Date().toISOString(),
        })
        .eq('id', revision.id);

      if (error) throw error;

      const newAmount = Number(newQuote.amount) || 0;
      if (newAmount <= 0) {
        success('Nouveau devis créé. Le client sera notifié.');
        await notifyClientAndRedirect('modified');
        return;
      }

      const oldAccepted = quote.status === 'accepted';

      if (oldAccepted) {
        await supabase.from('quotes').update({ status: 'viewed' }).eq('id', quote.id);
      }
      await supabase.from('quotes').update({ status: 'accepted' }).eq('id', newQuote.id);

      const { data: escrow } = await supabase
        .from('escrows')
        .select('id, status')
        .eq('project_id', project.id)
        .maybeSingle();

      if (escrow && (escrow.status === 'pending' || escrow.status === 'held')) {
        try {
          await updateEscrowForNewAmount(escrow.id, newAmount);
        } catch (e) {
          console.error('Erreur mise à jour escrow après devis modifié:', e);
          showError('Devis modifié mais erreur sur l\'escrow. Contacter le support.');
        }
      } else {
        const { data: art } = await supabase
          .from('artisans')
          .select('is_verified')
          .eq('id', quote.artisan_id)
          .maybeSingle();
        try {
          await initiateEscrow({
            project_id: project.id,
            total_amount: newAmount,
            artisan_is_verified: !!art?.is_verified,
          });
          await supabase
            .from('projects')
            .update({ status: 'quote_accepted' })
            .eq('id', project.id);
        } catch (e) {
          console.error('Erreur création escrow après devis modifié:', e);
          showError('Devis modifié mais erreur création escrow. Le client devra accepter le devis sur le projet.');
        }
      }

      success('Nouveau devis créé. C\'est ce devis qui fera l\'objet du paiement.');
      await notifyClientAndRedirect('modified');
    } catch (err: any) {
      showError(err?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingOverlay />;
  if (!revision || !quote || !project) return null;

  if (showQuoteForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-gray-100">
          <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-4">
            <button
              onClick={() => setShowQuoteForm(false)}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-black text-gray-900">Modifier le devis</h1>
              <p className="text-xs text-gray-500">Créez un nouveau devis pour le client</p>
            </div>
            <HomeButton />
          </div>
        </header>
        <main className="max-w-lg mx-auto px-5 py-6">
          <QuoteForm
            projectId={project.id}
            artisanId={quote.artisan_id}
            onSuccess={handleModifyQuoteSuccess}
            onCancel={() => setShowQuoteForm(false)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-gray-100">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/revisions')}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-gray-900">Répondre à la révision</h1>
            <p className="text-xs text-gray-500">Choisissez votre action</p>
          </div>
          <HomeButton />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 space-y-4">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-xs font-bold text-blue-800 mb-2">Demande du client :</p>
          <p className="text-sm text-blue-900">{revision.client_comments}</p>
          {revision.suggested_price != null && Number(revision.suggested_price) > 0 && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg border-2 border-green-200">
              <p className="text-xs font-bold text-green-800 mb-1">Prix proposé par le client (sera appliqué si vous acceptez)</p>
              <p className="text-xl font-black text-green-900">
                {Number(revision.suggested_price).toLocaleString('fr-FR')} FCFA
              </p>
              <p className="text-xs text-green-700 mt-1">
                Devis actuel : {(quote.amount || 0).toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          )}
          {(!revision.suggested_price || Number(revision.suggested_price) <= 0) && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-blue-700">
                <span className="font-bold">Devis actuel :</span>{' '}
                {(quote.amount || 0).toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          )}
        </div>

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

        {action && action !== 'modify' && (
          <div className="space-y-4">
            {action === 'accept' && revision.suggested_price != null && Number(revision.suggested_price) > 0 && (
              <p className="text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2 border border-green-200">
                En confirmant, le montant du devis sera mis à jour à <strong>{Number(revision.suggested_price).toLocaleString('fr-FR')} FCFA</strong> pour ce projet.
              </p>
            )}
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
                disabled={submitting}
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setAction(null); setResponse(''); }}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={action === 'accept' ? handleAccept : handleReject}
                disabled={submitting || !response.trim()}
                className={`flex-1 px-4 py-3 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  action === 'accept' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {submitting ? (
                    <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />
                  ) : (
                    <>
                      {action === 'accept' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      Confirmer
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        )}

        {action === 'modify' && (
          <div className="space-y-4">
            <div className="bg-brand-50 rounded-xl p-4 border border-brand-200">
              <p className="text-sm text-brand-900 mb-3">
                Vous allez créer un nouveau devis modifié. Le client pourra ensuite accepter ou refuser ce nouveau devis.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setAction(null); setResponse(''); }}
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
      </main>
    </div>
  );
}
