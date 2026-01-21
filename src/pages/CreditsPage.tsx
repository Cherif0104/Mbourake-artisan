import React, { useEffect, useState, useMemo } from 'react';
import { CreditCard, Loader2, ShieldCheck, AlertTriangle, Check, Info, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabase';
import {
  BYPASS_MODE,
  PaymentResult,
  PAYMENT_METHODS,
  processPayment,
} from '../lib/paymentBypass';
import { SkeletonScreen } from '../components/SkeletonScreen';
import { HomeButton } from '../components/HomeButton';
import { useToastContext } from '../contexts/ToastContext';

type Wallet = {
  artisan_id: string;
  balance: number;
};

const CREDIT_PACKS = [
  { id: 'pack_5', label: 'Pack Découverte', credits: 5, price: 2500 },
  { id: 'pack_10', label: 'Pack Pro', credits: 10, price: 4500 },
  { id: 'pack_25', label: 'Pack Premium', credits: 25, price: 10000 },
];

export function CreditsPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { success, error: showError } = useToastContext();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<string>(PAYMENT_METHODS[0].id);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const isArtisan = profile?.role === 'artisan';

  // Redirection UNIQUEMENT si pas d'utilisateur authentifié - Dans un useEffect pour éviter l'erreur React
  useEffect(() => {
    // IMPORTANT : Ne rediriger QUE si vraiment pas d'utilisateur authentifié après le chargement complet
    // Ne PAS rediriger si l'utilisateur est authentifié mais que le profil est en cours de chargement ou null
    if (!auth.loading && !auth.user) {
      // Si pas d'utilisateur authentifié du tout après le chargement complet, rediriger vers onboarding
      navigate('/onboard?mode=signup');
    }
    // Ne PAS rediriger si auth.user existe mais profile est null (profil peut être en cours de création)
  }, [auth.user, auth.loading, navigate]);

  useEffect(() => {
    const fetchWallet = async () => {
      if (!auth.user || !isArtisan) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error: err } = await supabase
        .from<Wallet>('artisan_credit_wallets')
        .select('*')
        .eq('artisan_id', auth.user.id)
        .maybeSingle();

      if (err) {
        console.error('Error fetching credit wallet:', err);
      } else {
        setWallet(data ?? { artisan_id: auth.user.id, balance: 0 });
      }

      setLoading(false);
    };

    if (!profileLoading && auth.user && isArtisan) {
      fetchWallet();
    }
  }, [auth.user, profileLoading, isArtisan]);

  const selectedMethod = useMemo(
    () => PAYMENT_METHODS.find((m) => m.id === selectedMethodId) || PAYMENT_METHODS[0],
    [selectedMethodId]
  );

  const selectedPack = useMemo(
    () => CREDIT_PACKS.find((p) => p.id === selectedPackId),
    [selectedPackId]
  );

  const totalWithFees = useMemo(() => {
    if (!selectedPack) return 0;
    const fees = Math.round(selectedPack.price * (selectedMethod?.fees || 0) / 100);
    return selectedPack.price + fees;
  }, [selectedPack, selectedMethod]);

  const handlePurchase = async () => {
    if (!auth.user || !isArtisan) return;
    const pack = CREDIT_PACKS.find((p) => p.id === selectedPackId);
    if (!pack) {
      setPaymentError('Veuillez choisir un pack de crédits.');
      return;
    }

    setPaymentLoading(true);
    setPaymentError(null);
    setPaymentResult(null);

    try {
      // 1) Simuler le paiement (bypass)
      const payment = await processPayment(pack.price, selectedMethodId, {
        userId: auth.user.id,
        phoneNumber: phoneNumber || undefined,
      });

      setPaymentResult(payment);
      setPaymentError(payment.success ? null : payment.message);

      if (payment.success) {
        // 2) Créer les crédits via la RPC purchase_credits
        const { data, error: rpcError } = await supabase.rpc<number>('purchase_credits', {
          p_artisan_id: auth.user.id,
          p_credits: pack.credits,
          p_payment_ref: payment.reference,
          p_metadata: {
            method: payment.method,
            amount: payment.amount,
            total_charged: payment.totalCharged,
          },
        });

        if (rpcError) {
          console.error('purchase_credits error:', rpcError);
          setPaymentError("Le paiement a été validé mais l'ajout de crédits a échoué. Contactez le support.");
          setPaymentLoading(false);
          return;
        }

        // 3) Mettre à jour le state local avec le nouveau solde
        setWallet((prev) =>
          prev
            ? { ...prev, balance: data ?? prev.balance }
            : { artisan_id: auth.user!.id, balance: data ?? pack.credits }
        );

        success(`${pack.credits} crédits ajoutés avec succès !`);
        
        // Rediriger vers le dashboard après un délai
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (e: any) {
      console.error('Unexpected error during credit purchase:', e);
      setPaymentError(e?.message || "Une erreur est survenue lors de l'achat de crédits.");
    } finally {
      setPaymentLoading(false);
    }
  };

  // Afficher le skeleton pendant le chargement
  if (auth.loading || profileLoading || loading) {
    return <SkeletonScreen />;
  }

  // Si pas d'utilisateur après chargement complet, afficher null (redirection gérée dans useEffect)
  if (!auth.user) {
    return null;
  }

  // Si pas de profil après chargement complet mais utilisateur authentifié, afficher message
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={28} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profil en cours de création</h1>
          <p className="text-gray-600 mb-6">
            Votre profil est en cours de création. Veuillez patienter ou retourner au tableau de bord.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  // Si pas artisan, afficher message d'erreur
  if (!isArtisan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={28} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Espace réservé aux artisans</h1>
          <p className="text-gray-600 mb-6">
            Les crédits sont utilisés pour accepter des projets en tant qu'artisan. Connectez-vous avec un compte
            artisan pour accéder à cette page.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header - Modernisé comme ProjectPaymentPage */}
      <header className="sticky top-0 z-20 px-5 py-4 bg-white/80 backdrop-blur-lg border-b border-gray-100/50 flex items-center gap-4 shadow-sm">
        <HomeButton />
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-lg text-gray-900 truncate">Recharger mon portefeuille</h1>
          <p className="text-xs text-gray-400 font-mono">Crédits artisan</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 pb-36">
        {/* Balance Summary - Modernisé comme ProjectPaymentPage */}
        <div className="bg-white rounded-3xl p-6 mb-6 border border-gray-100 shadow-lg shadow-gray-100/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-black text-xl text-gray-900">Solde actuel</h2>
              <p className="text-xs text-gray-500 mt-1 font-medium">Portefeuille de crédits</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/40">
              <CreditCard size={26} />
            </div>
          </div>
          <div className="mt-5">
            <p className="text-4xl font-black text-gray-900">
              {wallet?.balance ?? 0} <span className="text-base font-bold text-gray-600">crédits</span>
            </p>
            <p className="text-xs text-gray-600 mt-3 font-medium">
              10 crédits consommés par projet accepté. Les crédits ne sont pas remboursables.
            </p>
          </div>
        </div>

        {/* Security Badge - Modernisé comme ProjectPaymentPage */}
        <div className="bg-brand-50 border-2 border-brand-200 rounded-3xl p-5 mb-6 flex items-start gap-4 shadow-sm">
          <ShieldCheck size={26} className="text-brand-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-black text-sm text-brand-900 mb-1.5">Paiement sécurisé</p>
            <p className="text-xs text-brand-700 leading-relaxed font-medium">
              Votre paiement est traité de manière sécurisée. Les crédits sont ajoutés immédiatement après confirmation du paiement.
            </p>
          </div>
        </div>

        {/* Pack Selection - Modernisé comme ProjectPaymentPage */}
        <div className="bg-white rounded-3xl p-6 mb-6 border border-gray-100 shadow-lg shadow-gray-100/50">
          <h3 className="font-black text-xl text-gray-900 mb-5">Choisissez un pack</h3>
          
          <div className="space-y-3">
            {CREDIT_PACKS.map((pack) => (
              <button
                key={pack.id}
                onClick={() => setSelectedPackId(pack.id)}
                className={`w-full text-left rounded-3xl border-2 p-5 flex items-center justify-between transition-all hover:shadow-md ${
                  selectedPackId === pack.id
                    ? 'border-brand-500 bg-brand-50 shadow-lg shadow-brand-200/50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div>
                  <p className="text-base font-black text-gray-900 mb-1">{pack.label}</p>
                  <p className="text-sm text-gray-600 font-medium">
                    {pack.credits} crédits • {pack.price.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                {selectedPackId === pack.id && (
                  <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center shadow-md">
                    <Check size={16} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Bypass Mode Warning */}
        {BYPASS_MODE.enabled && (
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-700 mb-6">
            <p className="font-semibold">{BYPASS_MODE.message}</p>
            <p>{BYPASS_MODE.warning}</p>
          </div>
        )}

        {/* Payment Form - Modernisé comme ProjectPaymentPage */}
        {selectedPackId && (
          <div className="bg-white rounded-3xl p-6 mb-6 border border-gray-100 shadow-lg shadow-gray-100/50">
            <h3 className="font-black text-xl text-gray-900 mb-5">Mode de paiement</h3>

            {/* Méthodes de paiement */}
            <div className="mb-5">
              <p className="text-xs font-bold uppercase text-gray-500 tracking-[0.3em] mb-3">Méthode</p>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.filter(m => m.logo).map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethodId(method.id)}
                    className={`flex-1 min-w-[120px] rounded-2xl border-2 px-4 py-4 text-center transition ${
                      selectedMethodId === method.id
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
                      onClick={() => setSelectedMethodId(method.id)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        selectedMethodId === method.id
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

            {/* Récapitulatif - Modernisé comme ProjectPaymentPage */}
            <div className="rounded-3xl border-2 border-gray-200 bg-gray-50 p-5 text-sm space-y-3 mb-5 shadow-sm">
              <div className="flex justify-between text-gray-600 font-medium">
                <span>Pack sélectionné</span>
                <span className="font-bold">{selectedPack?.credits} crédits • {selectedPack?.price.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-gray-600 font-medium">
                <span>Frais ({selectedMethod?.fees ?? 0}%)</span>
                <span className="font-bold">{Math.round((selectedPack?.price || 0) * ((selectedMethod?.fees ?? 0) / 100)).toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="border-t-2 border-gray-300 pt-3 flex justify-between font-black text-gray-900">
                <span className="text-base">Total</span>
                <span className="text-lg">{totalWithFees.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <p className="text-xs text-gray-500 font-medium pt-2 border-t border-gray-200">
                Méthode sélectionnée : <strong className="text-gray-700">{selectedMethod?.name}</strong>
              </p>
            </div>

            {/* Résultat du paiement - Modernisé comme ProjectPaymentPage */}
            {paymentResult && (
              <div
                className={`mb-5 flex items-center gap-3 rounded-3xl border-2 px-5 py-4 text-sm font-medium ${
                  paymentResult.success ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-700'
                }`}
              >
                {paymentResult.success ? <CheckCircle size={22} className="flex-shrink-0" /> : <AlertTriangle size={22} className="flex-shrink-0" />}
                <span>{paymentResult.message}</span>
              </div>
            )}

            {paymentError && (
              <div className="mb-5 flex items-center gap-3 rounded-3xl border-2 border-red-300 bg-red-50 px-5 py-4 text-sm text-red-700 font-medium">
                <AlertTriangle size={20} className="flex-shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Bouton de paiement - Modernisé comme ProjectPaymentPage */}
            <button
              type="button"
              onClick={handlePurchase}
              disabled={paymentLoading || !selectedPackId}
              className="w-full rounded-3xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-5 text-sm font-black uppercase tracking-[0.2em] text-white transition-all disabled:opacity-60 flex items-center justify-center gap-3 shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 active:scale-[0.98]"
            >
              {paymentLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Traitement...</span>
                </>
              ) : (
                <span>Simuler le paiement</span>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
