import React, { useState } from 'react';
import { 
  ShieldCheck, CreditCard, AlertTriangle, Check, Clock, 
  Wallet, ArrowRight, ChevronDown, ChevronUp, Lock, Unlock
} from 'lucide-react';
import { useEscrow, type Escrow } from '../hooks/useEscrow';
import { BYPASS_MODE, PAYMENT_METHODS } from '../lib/paymentBypass';
import { PaymentModal } from './PaymentModal';

interface EscrowBannerProps {
  escrow: Escrow;
  isClient: boolean;
  onRefresh: () => void;
}

const ESCROW_STATUS_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string;
  borderColor: string;
  icon: any;
}> = {
  pending: { 
    label: 'En attente de paiement', 
    color: 'text-yellow-700', 
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: Clock 
  },
  held: { 
    label: 'Fonds sécurisés', 
    color: 'text-green-700', 
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: Lock 
  },
  advance_paid: { 
    label: 'Avance versée', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Wallet 
  },
  released: { 
    label: 'Paiement effectué', 
    color: 'text-green-700', 
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: Check 
  },
  frozen: { 
    label: 'Fonds gelés (litige)', 
    color: 'text-red-700', 
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: AlertTriangle 
  },
  refunded: { 
    label: 'Remboursé', 
    color: 'text-gray-700', 
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: Unlock 
  },
};

export function EscrowBanner({ escrow, isClient, onRefresh }: EscrowBannerProps) {
  const { confirmDeposit, releaseAdvance, loading } = useEscrow();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string>('wave');

  const statusConfig = ESCROW_STATUS_CONFIG[escrow.status || 'pending'] || ESCROW_STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  const handleOpenPayment = () => setShowPaymentModal(true);

  const handlePaymentSuccess = async (methodId: string) => {
    await confirmDeposit(escrow.id, methodId);
    onRefresh();
  };

  const handleReleaseAdvance = async () => {
    await releaseAdvance(escrow.id);
    onRefresh();
  };

  // Calculate displayed values
  const totalAmount = escrow.total_amount || 0;
  const baseAmount = escrow.base_amount || totalAmount;
  const urgentSurcharge = escrow.urgent_surcharge || 0;
  const commissionAmount = escrow.commission_amount || 0;
  const tvaAmount = escrow.tva_amount || 0;
  const artisanPayout = escrow.artisan_payout || 0;
  const advanceAmount = escrow.advance_amount || 0;
  const advancePaid = escrow.advance_paid || 0;
  const remainingPayout = artisanPayout - advancePaid;

  return (
    <div className={`rounded-2xl p-5 border-2 mb-6 ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            escrow.status === 'frozen' ? 'bg-red-500' : 
            escrow.status === 'held' ? 'bg-green-500' :
            'bg-brand-500'
          } text-white`}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Garantie Mbourake</h3>
            <div className={`flex items-center gap-1 text-xs font-bold ${statusConfig.color}`}>
              <StatusIcon size={12} />
              {statusConfig.label}
            </div>
          </div>
        </div>
        
      {escrow.transaction_number && (
          <span className="text-[9px] font-mono text-gray-400 bg-white px-2 py-1 rounded">
            {escrow.transaction_number}
          </span>
        )}
      </div>

      {/* Amount Display */}
      <div className="bg-white rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 font-medium">Montant total</span>
          <span className="text-xl font-black text-gray-900">{totalAmount.toLocaleString('fr-FR')} FCFA</span>
        </div>
        
        {/* Toggle Details */}
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 pt-2 border-t border-gray-100"
        >
          {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showDetails ? 'Masquer' : 'Voir le détail'}
        </button>
        
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-sm animate-in fade-in duration-200">
            <div className="flex justify-between">
              <span className="text-gray-500">Montant de base</span>
              <span className="font-bold">{baseAmount.toLocaleString('fr-FR')} FCFA</span>
            </div>
            {urgentSurcharge > 0 && (
              <div className="flex justify-between text-yellow-600">
                <span>Majoration urgence</span>
                <span className="font-bold">+{urgentSurcharge.toLocaleString('fr-FR')} FCFA</span>
              </div>
            )}
            <div className="flex justify-between text-gray-400">
              <span>Commission ({escrow.commission_percent || 10}%)</span>
              <span>-{commissionAmount.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>TVA (18%)</span>
              <span>-{tvaAmount.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between text-green-600 font-bold pt-2 border-t border-gray-100">
              <span>Paiement artisan</span>
              <span>{artisanPayout.toLocaleString('fr-FR')} FCFA</span>
            </div>
            {advanceAmount > 0 && (
              <>
                <div className="flex justify-between text-blue-600">
                  <span>Avance ({escrow.advance_percent || 50}%)</span>
                  <span className="font-bold">{advanceAmount.toLocaleString('fr-FR')} FCFA</span>
                </div>
                {advancePaid > 0 && (
                  <div className="flex justify-between text-green-500">
                    <span>Avance versée</span>
                    <span className="font-bold">-{advancePaid.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>Reste à verser</span>
                  <span>{remainingPayout.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Client: Pay Now */}
      {isClient && escrow.status === 'pending' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-xs text-gray-600 text-center font-medium">
              Moyens de paiement temporaires
            </p>
            {BYPASS_MODE.enabled && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-[10px] font-bold text-yellow-700">
                {BYPASS_MODE.message}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {PAYMENT_METHODS.filter(m => ['wave', 'orange_money', 'card'].includes(m.id) && m.logo).map((method) => {
              const methodKey = method.id === 'orange_money' ? 'orange' : method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(methodKey)}
                  className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                    selectedPayment === methodKey
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center mb-1 h-10 min-h-[40px]">
                    {method.logo ? (
                      <img 
                        src={method.logo} 
                        alt={method.name}
                        className="max-h-10 max-w-full object-contain"
                        style={{ maxHeight: '40px', maxWidth: '100%' }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const parent = target.parentElement;
                          if (parent) {
                            target.style.display = 'none';
                            const fallback = document.createElement('span');
                            fallback.className = 'text-xl block';
                            fallback.textContent = method.icon;
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <span className="text-xl block">{method.icon}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 uppercase block">
                    {method.id === 'orange_money' ? 'Orange' : method.name.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            onClick={handleOpenPayment}
            className="w-full bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
          >
            <CreditCard size={20} />
            Payer {totalAmount.toLocaleString('fr-FR')} FCFA
          </button>
        </div>
      )}

      <PaymentModal
        open={showPaymentModal}
        escrow={escrow}
        initialMethodId={selectedPayment}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
      />

      {/* Artisan: Request Advance */}
      {!isClient && escrow.status === 'held' && advanceAmount > 0 && !escrow.is_advance_paid && (
        <div className="bg-white rounded-xl p-4 space-y-3">
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900">Avance disponible</p>
            <p className="text-2xl font-black text-brand-500">{advanceAmount.toLocaleString('fr-FR')} FCFA</p>
            <p className="text-xs text-gray-400">{escrow.advance_percent || 50}% du paiement total</p>
          </div>
          <button 
            onClick={handleReleaseAdvance}
            disabled={loading}
            className="w-full bg-brand-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Wallet size={18} />
                Recevoir mon avance
              </>
            )}
          </button>
        </div>
      )}

      {/* Status: Advance Paid */}
      {escrow.status === 'advance_paid' && (
        <div className="bg-white rounded-xl p-4 text-center">
          <Check size={24} className="text-green-500 mx-auto mb-2" />
          <p className="font-bold text-gray-900 text-sm">Avance versée</p>
          <p className="text-xs text-gray-500">
            Le reste ({remainingPayout.toLocaleString('fr-FR')} FCFA) sera versé à la fin du projet
          </p>
        </div>
      )}

      {/* Status: Funds Held */}
      {escrow.status === 'held' && (advanceAmount === 0 || escrow.is_advance_paid) && (
        <div className="bg-white rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-center gap-2 text-green-700 font-bold text-sm mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
            Fonds sécurisés dans l'escrow
          </div>
          <p className="text-xs text-gray-600 text-center leading-relaxed">
            Le montant a été retenu pour garantir l'exécution du projet.
            Une fois que le projet sera conclu et validé par le client,
            le montant sera automatiquement reversé sur votre compte.
          </p>
        </div>
      )}

      {/* Status: Released */}
      {escrow.status === 'released' && (
        <div className="bg-white rounded-xl p-4 text-center">
          <Check size={24} className="text-green-500 mx-auto mb-2" />
          <p className="font-bold text-green-600 text-sm">Paiement complet effectué</p>
        </div>
      )}

      {/* Status: Frozen */}
      {escrow.status === 'frozen' && (
        <div className="bg-white rounded-xl p-4 text-center">
          <AlertTriangle size={24} className="text-red-500 mx-auto mb-2" />
          <p className="font-bold text-red-600 text-sm">Fonds gelés</p>
          <p className="text-xs text-gray-500">Un litige est en cours de résolution</p>
        </div>
      )}
    </div>
  );
}
