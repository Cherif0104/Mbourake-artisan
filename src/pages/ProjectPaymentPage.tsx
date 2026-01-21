import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, CreditCard, AlertTriangle, Check, Info, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useEscrow } from '../hooks/useEscrow';
import { useToastContext } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { SkeletonScreen } from '../components/SkeletonScreen';
import { HomeButton } from '../components/HomeButton';
import {
  BYPASS_MODE,
  PaymentResult,
  PAYMENT_METHODS,
  processPayment,
} from '../lib/paymentBypass';

export function ProjectPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const { profile } = useProfile();
  const { confirmDeposit, loading: escrowLoading } = useEscrow();
  const { success, error: showError } = useToastContext();
  
  const [project, setProject] = useState<any>(null);
  const [escrow, setEscrow] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // États pour le formulaire de paiement (intégré directement)
  const [amount, setAmount] = useState<number>(0);
  const [methodId, setMethodId] = useState<string>(PAYMENT_METHODS[0].id);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

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
        const { data: eData, error: eError } = await supabase
          .from('escrows')
          .select('*')
          .eq('project_id', id)
          .maybeSingle();

        if (eError) throw eError;
        
        if (!eData) {
          showError('Aucun escrow trouvé pour ce projet.');
          navigate(`/projects/${id}`);
          return;
        }
        setEscrow(eData);
        setAmount(Number(eData.total_amount) || 0);

        // Fetch accepted quote
        const { data: qData, error: qError } = await supabase
          .from('quotes')
          .select('*, profiles!quotes_artisan_id_fkey(id, full_name, avatar_url)')
          .eq('project_id', id)
          .eq('status', 'accepted')
          .single();

        if (!qError && qData) {
          setQuote(qData);
        }

      } catch (err: any) {
        console.error('Error fetching payment data:', err);
        showError(`Erreur: ${err.message || 'Erreur inconnue'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, auth.user, navigate, showError]);

  const selectedMethod = useMemo(
    () => PAYMENT_METHODS.find((m) => m.id === methodId) || PAYMENT_METHODS[0],
    [methodId]
  );

  const totalWithFees = useMemo(() => {
    const fees = Math.round(amount * (selectedMethod?.fees || 0) / 100);
    return amount + fees;
  }, [amount, selectedMethod]);

  const handlePay = async () => {
    if (amount <= 0) {
      setPaymentError('Saisissez un montant supérieur à 0');
      return;
    }
    if (!escrow?.id) return;

    setPaymentLoading(true);
    setPaymentError(null);
    setPaymentResult(null);
    
    try {
      const payment = await processPayment(amount, methodId, {
        projectId: escrow.project_id ?? undefined,
        escrowId: escrow.id,
        phoneNumber: phoneNumber || undefined,
      });

      setPaymentResult(payment);
      setPaymentError(payment.success ? null : payment.message);

      if (payment.success) {
        // Confirmer le dépôt dans l'escrow
        await confirmDeposit(escrow.id, methodId);
        success('Paiement confirmé avec succès ! L\'artisan a été notifié.');
        
        // Rediriger vers la page de travaux en cours après un délai
        setTimeout(() => {
          navigate(`/projects/${id}/work`);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      setPaymentError('Erreur lors du traitement du paiement');
    } finally {
      setPaymentLoading(false);
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
          <p className="text-gray-600 mb-6">Impossible de charger les informations de paiement.</p>
          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold"
          >
            Retour au projet
          </button>
        </div>
      </div>
    );
  }

  const isPaid = escrow.status === 'held' || escrow.status === 'advance_paid' || escrow.status === 'released';
  const isPending = escrow.status === 'pending';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
        <HomeButton />
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">Paiement sécurisé</h1>
          <p className="text-xs text-gray-400 font-mono">{project.project_number}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-32">
        {/* Project Summary */}
        <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100">
          <h2 className="font-bold text-lg text-gray-900 mb-3">{project.title}</h2>
          {quote && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                {quote.profiles?.avatar_url ? (
                  <img src={quote.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 font-bold">
                    {quote.profiles?.full_name?.charAt(0) || 'A'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900">
                  {quote.profiles?.full_name || 'Artisan'}
                </p>
                <p className="text-xs text-gray-500">Artisan sélectionné</p>
              </div>
            </div>
          )}
        </div>

        {/* Security Badge */}
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <ShieldCheck size={24} className="text-brand-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-sm text-brand-900 mb-1">Paiement sécurisé</p>
            <p className="text-xs text-brand-700 leading-relaxed">
              Votre paiement est protégé par notre système d'escrow. Les fonds seront libérés uniquement après validation des travaux.
            </p>
          </div>
        </div>

        {/* Payment Status */}
        {isPaid && (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 mb-6 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-white" />
            </div>
            <h3 className="font-bold text-lg text-green-900 mb-2">Paiement effectué !</h3>
            <p className="text-sm text-green-700 mb-4">
              Votre paiement a été confirmé. L'artisan a été notifié et peut maintenant commencer les travaux.
            </p>
            <button
              onClick={() => navigate(`/projects/${id}/work`)}
              className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
            >
              Voir les travaux en cours
            </button>
          </div>
        )}

        {isPending && (
          <>
            {/* Payment Details */}
            <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100">
              <h3 className="font-bold text-lg text-gray-900 mb-4">Détails du paiement</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Montant du devis</span>
                  <span className="font-bold text-gray-900">
                    {Number(escrow.base_amount || 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                
                {Number(escrow.urgent_surcharge || 0) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Majoration urgence</span>
                    <span className="font-bold text-gray-900">
                      +{Number(escrow.urgent_surcharge || 0).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total à payer</span>
                  <span className="font-black text-xl text-brand-600">
                    {Number(escrow.total_amount || 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-200">
              <h4 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
                <Info size={16} className="text-gray-500" />
                Répartition des fonds
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Paiement artisan</span>
                  <span className="font-bold text-gray-900">
                    {Number(escrow.artisan_payout || 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Commission plateforme (10%)</span>
                  <span className="font-bold text-gray-900">
                    {Number(escrow.commission_amount || 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">TVA (18%)</span>
                  <span className="font-bold text-gray-900">
                    {Number(escrow.tva_amount || 0).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>
            </div>

            {/* Bypass Mode Warning */}
            {BYPASS_MODE.enabled && (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-700 mb-6">
                <p className="font-semibold">{BYPASS_MODE.message}</p>
                <p>{BYPASS_MODE.warning}</p>
              </div>
            )}

            {/* Payment Form - Intégré directement dans la page */}
            <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-100">
              <h3 className="font-bold text-lg text-gray-900 mb-4">Mode de paiement</h3>

              {/* Montant */}
              <div className="mb-5 space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500">Montant à sécuriser</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    value={amount}
                    onChange={(event) => setAmount(Number(event.target.value))}
                    className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-lg font-bold text-gray-900 focus:border-brand-500 focus:outline-none"
                  />
                  <span className="text-xs font-black text-gray-500">FCFA</span>
                </div>
              </div>

              {/* Méthodes de paiement */}
              <div className="mb-5">
                <p className="text-xs font-bold uppercase text-gray-500 tracking-[0.3em] mb-3">Méthode</p>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.filter(m => m.logo).map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setMethodId(method.id)}
                      className={`flex-1 min-w-[120px] rounded-2xl border-2 px-4 py-4 text-center transition ${
                        methodId === method.id
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center mb-2 h-14 min-h-[56px]">
                        {method.logo ? (
                          <img 
                            src={method.logo} 
                            alt={method.name}
                            className="max-h-14 max-w-full object-contain w-auto h-auto"
                            style={{ maxHeight: '56px', maxWidth: '100%' }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const parent = target.parentElement;
                              if (parent) {
                                target.style.display = 'none';
                                const fallback = document.createElement('div');
                                fallback.className = 'text-2xl';
                                fallback.textContent = method.icon;
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <div className="text-2xl">{method.icon}</div>
                        )}
                      </div>
                      <div className="text-xs font-bold uppercase">{method.name}</div>
                    </button>
                  ))}
                </div>
                {PAYMENT_METHODS.filter(m => !m.logo && m.available).length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.filter(m => !m.logo && m.available).map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setMethodId(method.id)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          methodId === method.id
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-xl mb-2">{method.icon}</div>
                        <div className="text-sm font-bold">{method.name}</div>
                        <p className="text-xs text-gray-500">{method.description}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Numéro de téléphone */}
              <div className="mb-5 space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500">Numéro du payeur</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="ex: 77xxxxxx"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
                />
                <p className="text-[10px] text-gray-400">
                  Optionnel, permet de contextualiser la transaction côté opérateur.
                </p>
              </div>

              {/* Récapitulatif */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm space-y-2 mb-5">
                <div className="flex justify-between text-gray-500">
                  <span>Frais ({selectedMethod?.fees ?? 0}%)</span>
                  <span>{Math.round(amount * ((selectedMethod?.fees ?? 0) / 100)).toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span>{totalWithFees.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Méthode sélectionnée : <strong>{selectedMethod?.name}</strong>
                </p>
              </div>

              {/* Résultat du paiement */}
              {paymentResult && (
                <div
                  className={`mb-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
                    paymentResult.success ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {paymentResult.success ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                  <span>{paymentResult.message}</span>
                </div>
              )}

              {paymentError && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle size={18} />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Bouton de paiement */}
              <button
                type="button"
                onClick={handlePay}
                disabled={paymentLoading || escrowLoading}
                className="w-full rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-4 text-sm font-bold uppercase tracking-[0.2em] text-white transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {paymentLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Traitement...</span>
                  </>
                ) : (
                  <span>Simuler le paiement</span>
                )}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
