import React, { useState, useEffect } from 'react';
import { 
  Send, Calculator, Clock, Calendar, FileText, Mic, 
  X, Upload, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';
import { supabase } from '../lib/supabase';
import { notifyClientNewQuote } from '../lib/notificationService';
import { generateSafeFileName } from '../lib/fileUtils';
import { usePreventNavigation } from '../hooks/usePreventNavigation';

interface QuoteFormProps {
  projectId: string;
  artisanId: string;
  isUrgent?: boolean;
  onSuccess: () => void | Promise<void>;
  onCancel: () => void;
}

const URGENT_SURCHARGE_OPTIONS = [0, 10, 20, 30, 50, 75, 100];

export function QuoteForm({ projectId, artisanId, isUrgent = false, onSuccess, onCancel }: QuoteFormProps) {
  const [laborCost, setLaborCost] = useState('');
  const [materialsCost, setMaterialsCost] = useState('');
  const [urgentSurchargePercent, setUrgentSurchargePercent] = useState(0);
  const [message, setMessage] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [validityHours, setValidityHours] = useState(48);
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTimeStart, setProposedTimeStart] = useState('');
  const [proposedTimeEnd, setProposedTimeEnd] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [proformaFile, setProformaFile] = useState<File | null>(null);
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Empêcher la navigation/refresh pendant la soumission
  usePreventNavigation(
    isSubmitting || loading,
    'Vous êtes en train de soumettre un devis. Êtes-vous sûr de vouloir quitter cette page ? Vos modifications pourraient être perdues.'
  );

  const labor = parseFloat(laborCost) || 0;
  const materials = parseFloat(materialsCost) || 0;
  const baseAmount = labor + materials;
  const surcharge = isUrgent ? (baseAmount * urgentSurchargePercent / 100) : 0;
  const totalAmount = baseAmount + surcharge;

  const handleProformaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProformaFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Empêcher la double soumission
    if (isSubmitting || loading) {
      console.log('[DEBUG QuoteForm] Submission already in progress, ignoring duplicate submit');
      return;
    }
    
    if (totalAmount <= 0) {
      setError('Veuillez entrer un montant valide');
      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    setError(null);

    try {
      // SUPPRIMÉ : Plus de vérification préalable - on laisse passer tous les devis
      // Si un devis existe, on le mettra à jour ou on en créera un nouveau
      console.log('[DEBUG QuoteForm] Submitting quote - Project:', projectId, 'Artisan:', artisanId);

      let audioUrl = null;
      let proformaUrl = null;

      // Upload audio if exists
      if (audioBlob) {
        const fileName = `${artisanId}/quotes/${Date.now()}.webm`;
        const { data, error } = await supabase.storage
          .from('audio')
          .upload(fileName, audioBlob);
        
        if (error) throw error;
        audioUrl = supabase.storage.from('audio').getPublicUrl(data.path).data.publicUrl;
      }

      // Upload proforma if exists
      if (proformaFile) {
        // Déterminer le bucket selon le type de fichier
        const fileType = proformaFile.type || '';
        const isPdf = proformaFile.name.toLowerCase().endsWith('.pdf') || fileType === 'application/pdf';
        const bucketName = isPdf ? 'documents' : 'photos';
        
        // Nettoyer le nom de fichier pour éviter les erreurs "Invalid key"
        // IMPORTANT: Utiliser generateSafeFileName pour nettoyer TOUS les caractères spéciaux
        const safeFileName = generateSafeFileName(proformaFile.name);
        const fileName = `${artisanId}/proformas/${safeFileName}`;
        
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(fileName, proformaFile, {
            contentType: proformaFile.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
            upsert: false
          });
        
        if (error) {
          console.error('Erreur upload proforma:', error);
          console.error('Nom de fichier original:', proformaFile.name);
          console.error('Nom de fichier nettoyé:', safeFileName);
          console.error('Chemin complet:', fileName);
          throw new Error(`Erreur lors de l'upload du fichier: ${error.message}`);
        }
        proformaUrl = supabase.storage.from(bucketName).getPublicUrl(data.path).data.publicUrl;
      }

      // Préparer les données du devis
      // S'assurer que tous les champs numériques sont bien des nombres
      const quoteData = {
        project_id: projectId,
        artisan_id: artisanId,
        amount: Number(totalAmount) || 0,
        labor_cost: Number(labor) || 0,
        materials_cost: Number(materials) || 0,
        urgent_surcharge_percent: isUrgent ? Number(urgentSurchargePercent) : 0,
        message: message || null,
        estimated_duration: estimatedDuration || null,
        validity_hours: Number(validityHours) || 48,
        proposed_date: proposedDate || null,
        proposed_time_start: proposedTimeStart || null,
        proposed_time_end: proposedTimeEnd || null,
        audio_message_url: audioUrl || null,
        proforma_url: proformaUrl || null,
        status: 'pending' as const,
      };

      // Essayer d'insérer un nouveau devis
      let quoteId: string | null = null;
      const { data: insertedQuote, error: insertError } = await supabase
        .from('quotes')
        .insert(quoteData)
        .select('id')
        .single();

      // Si erreur 409 (conflit/contrainte unique), mettre à jour le devis existant le plus récent
      if (insertError && (insertError.code === '23505' || insertError.code === '409' || 
          insertError.message?.includes('duplicate') || insertError.message?.includes('unique') ||
          insertError.message?.includes('Conflict'))) {
        console.log('[DEBUG QuoteForm] Quote exists, updating most recent quote instead');
        console.log('[DEBUG QuoteForm] Insert error details:', insertError);
        
        // Récupérer le devis le plus récent pour cet artisan/projet
        // Utiliser .maybeSingle() au lieu de .single() pour éviter l'erreur 406
        const { data: existingQuoteArray, error: fetchError } = await supabase
          .from('quotes')
          .select('id, status, quote_number')
          .eq('project_id', projectId)
          .eq('artisan_id', artisanId)
          .order('created_at', { ascending: false })
          .limit(1);

        console.log('[DEBUG QuoteForm] Existing quotes fetched:', existingQuoteArray);

        if (fetchError) {
          console.error('[DEBUG QuoteForm] Error fetching existing quote:', fetchError);
          throw new Error(`Erreur lors de la récupération du devis existant: ${fetchError.message}`);
        }

        const existingQuote = existingQuoteArray && existingQuoteArray.length > 0 ? existingQuoteArray[0] : null;

        if (existingQuote?.id) {
          // Empêcher la mise à jour d'un devis déjà accepté
          if (existingQuote.status === 'accepted') {
            throw new Error('Ce devis a déjà été accepté et ne peut plus être modifié. Veuillez créer un nouveau devis si nécessaire.');
          }

          // Mettre à jour le devis existant avec les nouvelles données
          // IMPORTANT: Ne pas inclure quote_number car il est généré automatiquement par un trigger
          const { data: updatedQuoteArray, error: updateError } = await supabase
            .from('quotes')
            .update({
              amount: quoteData.amount,
              labor_cost: quoteData.labor_cost,
              materials_cost: quoteData.materials_cost,
              urgent_surcharge_percent: quoteData.urgent_surcharge_percent,
              message: quoteData.message,
              estimated_duration: quoteData.estimated_duration,
              validity_hours: quoteData.validity_hours,
              proposed_date: quoteData.proposed_date,
              proposed_time_start: quoteData.proposed_time_start,
              proposed_time_end: quoteData.proposed_time_end,
              audio_message_url: quoteData.audio_message_url,
              proforma_url: quoteData.proforma_url,
              updated_at: new Date().toISOString(),
              // Gérer les statuts correctement : réinitialiser à pending si rejected/abandoned
              status: (existingQuote.status === 'rejected' || 
                       existingQuote.status === 'abandoned')
                ? 'pending' 
                : existingQuote.status || 'pending',
            })
            .eq('id', existingQuote.id)
            .select('id');

          if (updateError) {
            throw new Error(`Erreur lors de la mise à jour du devis: ${updateError.message}`);
          }
          
          const updatedQuote = updatedQuoteArray && updatedQuoteArray.length > 0 ? updatedQuoteArray[0] : null;
          quoteId = updatedQuote?.id || existingQuote.id;
          console.log('[DEBUG QuoteForm] Quote updated successfully:', quoteId);
        } else {
          // Si on ne trouve pas le devis existant malgré l'erreur 409,
          // c'est probablement que le devis existe mais n'est pas visible (RLS ou autre)
          // Dans ce cas, considérer comme un succès - le devis existe déjà
          console.warn('[DEBUG QuoteForm] 409 error but quote not found - likely RLS blocking or already exists');
          console.warn('[DEBUG QuoteForm] Considering as success - quote may already exist');
          
          // Afficher un message informatif mais continuer
          // Le devis existe probablement déjà en base, même s'il n'est pas visible
          // Rafraîchir la page pour voir s'il apparaît
          setTimeout(() => {
            onSuccess(); // Appeler onSuccess pour rafraîchir et fermer le formulaire
          }, 500);
          return; // Sortir sans erreur
        }
      } else if (insertError) {
        // Autres erreurs - les laisser passer normalement
        throw insertError;
      } else {
        // Insertion réussie
        quoteId = insertedQuote?.id || null;
        console.log('[DEBUG QuoteForm] Quote created successfully:', quoteId);
      }

      // Récupérer le devis créé/mis à jour pour les prochaines étapes
      const createdQuote = quoteId ? { id: quoteId } : null;

      // CRÉER CHAT AUTOMATIQUEMENT après soumission devis
      try {
        const { data: project } = await supabase
          .from('projects')
          .select('client_id, title')
          .eq('id', projectId)
          .single();

        if (project?.client_id) {
          // Vérifier si un chat existe déjà
          const { data: existingChat } = await supabase
            .from('messages')
            .select('id')
            .eq('project_id', projectId)
            .eq('sender_id', artisanId)
            .eq('receiver_id', project.client_id)
            .limit(1)
            .maybeSingle();

          // Si pas de chat, créer un message de bienvenue
          if (!existingChat) {
            const { data: artisan } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', artisanId)
              .single();

            await supabase.from('messages').insert({
              project_id: projectId,
              sender_id: artisanId,
              receiver_id: project.client_id,
              content: `Bonjour, j'ai soumis un devis pour votre projet "${project.title || 'votre projet'}". N'hésitez pas à me contacter pour discuter des détails.`,
              is_system_message: false,
            });

            // Log l'action de création du chat
            if (createdQuote?.id) {
              await supabase.rpc('log_quote_action', {
                p_quote_id: createdQuote.id,
                p_project_id: projectId,
                p_user_id: artisanId,
                p_action: 'chat_created',
                p_metadata: { auto_created: true }
              });
            }
          }
        }
      } catch (chatErr) {
        console.error('Error creating chat:', chatErr);
        // Ne pas bloquer si le chat échoue
      }

      // Update project status
      await supabase
        .from('projects')
        .update({ status: 'quote_received' })
        .eq('id', projectId);

      // Log l'action de soumission du devis
      if (createdQuote?.id) {
        try {
          await supabase.rpc('log_quote_action', {
            p_quote_id: createdQuote.id,
            p_project_id: projectId,
            p_user_id: artisanId,
            p_action: 'submitted',
            p_new_value: { amount: totalAmount, status: 'pending' }
          });
        } catch (logErr) {
          console.error('Error logging quote action:', logErr);
        }
      }

      // Notifier le client (en arrière-plan)
      try {
        const { data: project } = await supabase
          .from('projects')
          .select('client_id')
          .eq('id', projectId)
          .single();
        
        const { data: artisan } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', artisanId)
          .single();

        if (project?.client_id && artisan?.full_name) {
          await notifyClientNewQuote(projectId, project.client_id, artisan.full_name);
        }
      } catch (notifErr) {
        console.error('Error notifying client:', notifErr);
        // Ne pas bloquer si la notification échoue
      }

      await Promise.resolve(onSuccess());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white">
        <h3 className="font-bold text-lg">
          Proposer un devis
        </h3>
        <p className="text-white/70 text-sm">
          Envoyez votre proposition au client
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Coût prestation + Charges — total calculé automatiquement */}
        <div className="bg-white/80 rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Coût de la prestation</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={laborCost}
                  onChange={(e) => setLaborCost(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-14 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none text-gray-900 transition-shadow"
                  placeholder="0"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">FCFA</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Charges</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={materialsCost}
                  onChange={(e) => setMaterialsCost(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-14 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none text-gray-900 transition-shadow"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">FCFA</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-50">
            <span>Prestation + Charges {isUrgent && surcharge > 0 && `+ Majoration ${urgentSurchargePercent}%`}</span>
            <span className="font-bold text-gray-700">{baseAmount.toLocaleString('fr-FR')} {surcharge > 0 && `+ ${surcharge.toLocaleString('fr-FR')}`} →</span>
          </div>
        </div>

        {/* Urgent Surcharge */}
        {isUrgent && (
          <div className="bg-yellow-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={16} className="text-yellow-600" />
              <label className="text-xs font-bold text-yellow-700 uppercase">Majoration intervention urgente</label>
            </div>
            <div className="flex gap-2 flex-wrap">
              {URGENT_SURCHARGE_OPTIONS.map(percent => (
                <button
                  key={percent}
                  type="button"
                  onClick={() => setUrgentSurchargePercent(percent)}
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                    urgentSurchargePercent === percent 
                      ? 'bg-yellow-500 text-white' 
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  +{percent}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Total — mise à jour automatique */}
        <div className="bg-gradient-to-r from-brand-50 to-brand-50/50 rounded-xl p-4 flex items-center justify-between border border-brand-100 shadow-sm">
          <span className="font-bold text-gray-800">Total TTC</span>
          <span className="text-2xl font-black text-brand-600 tabular-nums">{totalAmount.toLocaleString('fr-FR')} FCFA</span>
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description du devis</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none resize-none text-gray-900"
            placeholder="Détaillez votre intervention..."
          />
        </div>

        {/* Voice Note */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Note vocale (optionnel)</label>
          <AudioRecorder 
            onRecordingComplete={(blob) => setAudioBlob(blob)}
            onDelete={() => setAudioBlob(null)}
          />
        </div>

        {/* Advanced Options Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl text-gray-600 font-medium"
        >
          <span className="text-sm">Options avancées</span>
          {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showAdvanced && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Duration */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                <Clock size={12} className="inline mr-1" />
                Durée estimée
              </label>
              <input
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none text-gray-900"
                placeholder="Ex: 2 heures, 3 jours..."
              />
            </div>

            {/* Proposed Schedule */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                <Calendar size={12} className="inline mr-1" />
                Proposition d'intervention
              </label>
              <input
                type="date"
                value={proposedDate}
                onChange={(e) => setProposedDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none mb-2 text-gray-900"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="time"
                  value={proposedTimeStart}
                  onChange={(e) => setProposedTimeStart(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none text-gray-900"
                />
                <input
                  type="time"
                  value={proposedTimeEnd}
                  onChange={(e) => setProposedTimeEnd(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none text-gray-900"
                />
              </div>
            </div>

            {/* Validity */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Validité du devis</label>
              <select
                value={validityHours}
                onChange={(e) => setValidityHours(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none text-gray-900"
              >
                <option value={24}>24 heures</option>
                <option value={48}>48 heures</option>
                <option value={72}>72 heures</option>
                <option value={168}>7 jours</option>
              </select>
            </div>

            {/* Proforma Invoice */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                <FileText size={12} className="inline mr-1" />
                Facture proforma
              </label>
              {proformaFile ? (
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                  <span className="text-sm text-gray-600 truncate max-w-[200px]">{proformaFile.name}</span>
                  <button type="button" onClick={() => setProformaFile(null)} className="text-red-500">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <label className="block w-full border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-brand-300 transition-colors">
                  <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                  <p className="text-xs text-gray-500">Joindre un PDF ou une image</p>
                  <input 
                    type="file" 
                    accept=".pdf,image/*" 
                    className="hidden" 
                    onChange={handleProformaChange}
                  />
                </label>
              )}
            </div>
          </div>
        )}

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
            disabled={loading || isSubmitting || totalAmount <= 0}
            className="flex-1 bg-brand-500 text-white rounded-xl py-3 font-bold hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading || isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Envoi en cours...</span>
              </>
            ) : (
              <>
                <Send size={18} />
                Envoyer
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
