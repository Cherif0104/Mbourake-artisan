import React, { useState } from 'react';
import { RotateCcw, AlertCircle, X, Mic } from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';
import { supabase } from '../lib/supabase';
import { notifyArtisanRevisionRequested } from '../lib/notificationService';

interface RevisionRequestProps {
  quoteId: string;
  currentAmount: number;
  projectId: string;
  artisanId: string;
  projectTitle: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function RevisionRequest({ quoteId, currentAmount, projectId, artisanId, projectTitle, onSuccess, onCancel }: RevisionRequestProps) {
  const [reason, setReason] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Veuillez indiquer une raison');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let audioUrl = null;

      // Upload audio if exists
      if (audioBlob) {
        const fileName = `revisions/${quoteId}/${Date.now()}.webm`;
        const { data, error } = await supabase.storage
          .from('audio')
          .upload(fileName, audioBlob);
        
        if (error) throw error;
        audioUrl = supabase.storage.from('audio').getPublicUrl(data.path).data.publicUrl;
      }

      // Update quote with revision request
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          status: 'revision_requested',
          revision_reason: reason,
          client_suggested_price: suggestedPrice ? parseFloat(suggestedPrice) : null,
          client_audio_url: audioUrl,
          revision_count: supabase.rpc('increment_revision_count', { quote_id: quoteId }),
        })
        .eq('id', quoteId);

      if (updateError) {
        // Fallback if RPC doesn't exist
        const { data: quote } = await supabase
          .from('quotes')
          .select('revision_count')
          .eq('id', quoteId)
          .single();
        
        await supabase
          .from('quotes')
          .update({
            status: 'revision_requested',
            revision_reason: reason,
            client_suggested_price: suggestedPrice ? parseFloat(suggestedPrice) : null,
            client_audio_url: audioUrl,
            revision_count: (quote?.revision_count || 0) + 1,
          })
          .eq('id', quoteId);
      }

      // Notifier l'artisan
      await notifyArtisanRevisionRequested(projectId, artisanId, projectTitle);

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-yellow-200 overflow-hidden">
      <div className="p-4 bg-yellow-50 border-b border-yellow-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCcw size={20} className="text-yellow-600" />
          <h3 className="font-bold text-yellow-800">Demander une révision</h3>
        </div>
        <button onClick={onCancel} className="text-yellow-600 hover:text-yellow-800">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Current Amount Display */}
        <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">Montant actuel</span>
          <span className="font-bold text-gray-900">{currentAmount.toLocaleString('fr-FR')} FCFA</span>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            Raison de la demande *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-yellow-500 focus:outline-none resize-none"
            placeholder="Expliquez pourquoi vous demandez une révision..."
          />
        </div>

        {/* Suggested Price (Optional) */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            Prix suggéré (optionnel)
          </label>
          <div className="relative">
            <input
              type="number"
              value={suggestedPrice}
              onChange={(e) => setSuggestedPrice(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-16 focus:border-yellow-500 focus:outline-none"
              placeholder="Votre budget maximum"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">FCFA</span>
          </div>
        </div>

        {/* Voice Note */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
            <Mic size={12} className="inline mr-1" />
            Message vocal (optionnel)
          </label>
          <AudioRecorder
            onRecordingComplete={(blob) => setAudioBlob(blob)}
            onDelete={() => setAudioBlob(null)}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 font-bold hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading || !reason.trim()}
            className="flex-1 bg-yellow-500 text-white rounded-xl py-3 font-bold hover:bg-yellow-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <RotateCcw size={18} />
                Envoyer
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
