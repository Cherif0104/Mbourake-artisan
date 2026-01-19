import React, { useState } from 'react';
import { X, AlertCircle, Mic } from 'lucide-react';

interface RejectionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  quoteAmount: number;
  artisanName: string;
}

export function RejectionModal({ 
  open, 
  onClose, 
  onConfirm, 
  quoteAmount, 
  artisanName 
}: RejectionModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm(reason.trim() || undefined);
      setReason('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleRejectWithoutReason = async () => {
    setLoading(true);
    try {
      await onConfirm(undefined);
      setReason('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl animate-in fade-in duration-200">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <X size={20} className="text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Refuser le devis</h3>
              <p className="text-xs text-gray-500">De {artisanName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            <X size={16} className="text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">Montant du devis</span>
            <span className="font-bold text-gray-900">
              {quoteAmount.toLocaleString('fr-FR')} FCFA
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
              Raison du refus (optionnel)
            </label>
            <p className="text-xs text-gray-600 mb-2">
              Vous pouvez expliquer pourquoi vous refusez ce devis. Cela aidera l'artisan à mieux comprendre vos besoins.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={500}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-red-500 focus:outline-none resize-none text-sm"
              placeholder="Exemple: Le prix est trop élevé, les délais ne correspondent pas, etc."
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {reason.length}/500 caractères
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleRejectWithoutReason}
              disabled={loading}
              className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Refuser sans raison
            </button>
            <button
              type="submit"
              disabled={loading || (reason.trim().length > 0 && reason.trim().length < 10)}
              className="flex-1 bg-red-500 text-white rounded-xl py-3 font-bold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Refuser
                  {reason.trim() && ' avec raison'}
                </>
              )}
            </button>
          </div>

          {reason.trim().length > 0 && reason.trim().length < 10 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700">
                Si vous souhaitez fournir une raison, elle doit contenir au moins 10 caractères.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
