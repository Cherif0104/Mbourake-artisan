import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Loader2, XCircle } from 'lucide-react';
import type { Escrow } from '../hooks/useEscrow';
import {
  BYPASS_MODE,
  PaymentResult,
  PAYMENT_METHODS,
  processPayment,
} from '../lib/paymentBypass';

interface PaymentModalProps {
  open: boolean;
  escrow: Escrow;
  initialMethodId?: string;
  onClose: () => void;
  onSuccess: (methodId: string, result: PaymentResult) => Promise<void>;
}

export function PaymentModal({
  open,
  escrow,
  initialMethodId,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [amount, setAmount] = useState<number>(Number(escrow.total_amount) || 0);
  const [methodId, setMethodId] = useState<string>(initialMethodId || PAYMENT_METHODS[0].id);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmount(Number(escrow.total_amount) || 0);
      setMethodId(initialMethodId || PAYMENT_METHODS[0].id);
      setResult(null);
      setErrorMessage(null);
      setPhoneNumber('');
    }
  }, [open, escrow, initialMethodId]);

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
      setErrorMessage('Saisissez un montant supérieur à 0');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const payment = await processPayment(amount, methodId, {
        projectId: escrow.project_id ?? undefined,
        escrowId: escrow.id,
        phoneNumber: phoneNumber || undefined,
      });

      setResult(payment);
      setErrorMessage(payment.success ? null : payment.message);

      if (payment.success) {
        await onSuccess(methodId, payment);
        onClose();
      }
    } catch (error) {
      setErrorMessage('Erreur lors du traitement du paiement');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-gray-500 tracking-[0.2em]">Paiement</p>
            <h3 className="text-2xl font-bold text-gray-900">Mode bypass</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle size={24} />
          </button>
        </div>

        {BYPASS_MODE.enabled && (
          <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-700">
            <p className="font-semibold">{BYPASS_MODE.message}</p>
            <p>{BYPASS_MODE.warning}</p>
          </div>
        )}

        <div className="mt-6 space-y-3">
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

        <div className="mt-5">
          <p className="text-xs font-bold uppercase text-gray-500 tracking-[0.3em]">Méthode</p>
          <div className="mt-2 flex flex-wrap gap-2">
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
                        // Fallback sur l'emoji si l'image ne charge pas
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
          {/* Afficher les méthodes sans logo dans une grille séparée si nécessaire */}
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

        <div className="mt-5 space-y-2">
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

        <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm space-y-2">
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

        {result && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
              result.success ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {result.success ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
            <span>{result.message}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600 transition hover:border-gray-300"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handlePay}
            disabled={loading}
            className="flex-1 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition disabled:opacity-60"
          >
            {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Simuler le paiement'}
          </button>
        </div>
      </div>
    </div>
  );
}
