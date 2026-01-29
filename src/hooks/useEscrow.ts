import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';
import { notifyArtisanPaymentHeldWithBreakdown, notifyArtisanPaymentReceived } from '../lib/notificationService';

export type Escrow = Database['public']['Tables']['escrows']['Row'];

// Constants for escrow calculations
const TVA_RATE = 0.18; // 18% TVA in Senegal
const DEFAULT_COMMISSION_RATE = 0.10; // 10% default commission
const VERIFIED_ADVANCE_RATE = 0.50; // 50% advance for verified artisans
const UNVERIFIED_ADVANCE_RATE = 0; // No advance for unverified

export interface EscrowCalculation {
  baseAmount: number;
  urgentSurcharge: number;
  totalAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  tvaAmount: number;
  artisanPayout: number;
  advancePercent: number;
  advanceAmount: number;
  remainingAmount: number;
}

export function calculateEscrow(
  baseAmount: number,
  urgentSurchargePercent: number = 0,
  commissionPercent: number = 10,
  isVerified: boolean = false
): EscrowCalculation {
  // Calculate surcharge
  const urgentSurcharge = baseAmount * (urgentSurchargePercent / 100);
  const totalAmount = baseAmount + urgentSurcharge;
  
  // Calculate commission on total
  const commissionAmount = totalAmount * (commissionPercent / 100);
  
  // Calculate TVA on commission
  const tvaAmount = commissionAmount * TVA_RATE;
  
  // Artisan receives total minus commission and TVA
  const artisanPayout = totalAmount - commissionAmount - tvaAmount;
  
  // Advance calculation
  const advancePercent = isVerified ? VERIFIED_ADVANCE_RATE * 100 : UNVERIFIED_ADVANCE_RATE * 100;
  const advanceAmount = isVerified ? artisanPayout * VERIFIED_ADVANCE_RATE : 0;
  const remainingAmount = artisanPayout - advanceAmount;

  return {
    baseAmount,
    urgentSurcharge,
    totalAmount,
    commissionPercent,
    commissionAmount,
    tvaAmount,
    artisanPayout,
    advancePercent,
    advanceAmount,
    remainingAmount,
  };
}

export function useEscrow() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateEscrow = useCallback(async (data: {
    project_id: string;
    total_amount: number;
    artisan_is_verified: boolean;
    urgent_surcharge_percent?: number;
    commission_percent?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const urgentSurchargePercent = data.urgent_surcharge_percent || 0;
      const commissionPercent = data.commission_percent || DEFAULT_COMMISSION_RATE * 100;
      
      // Calculate all escrow values
      const calculation = calculateEscrow(
        data.total_amount,
        urgentSurchargePercent,
        commissionPercent,
        data.artisan_is_verified
      );

      const { data: escrow, error: err } = await supabase
        .from('escrows')
        .insert({
          project_id: data.project_id,
          total_amount: calculation.totalAmount,
          base_amount: calculation.baseAmount,
          urgent_surcharge: calculation.urgentSurcharge,
          commission_percent: calculation.commissionPercent,
          commission_amount: calculation.commissionAmount,
          tva_amount: calculation.tvaAmount,
          artisan_payout: calculation.artisanPayout,
          advance_percent: calculation.advancePercent,
          advance_amount: calculation.advanceAmount,
          advance_paid: 0,
          status: 'pending',
        })
        .select()
        .single();

      if (err) throw err;
      return escrow;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmDeposit = useCallback(async (escrowId: string, paymentMethod: string) => {
    setLoading(true);
    try {
      // Récupérer l'escrow avec le projet pour les notifications
      const { data: escrowData } = await supabase
        .from('escrows')
        .select('*, projects(id, title, client_id)')
        .eq('id', escrowId)
        .single();

      const { error: err } = await supabase
        .from('escrows')
        .update({ 
          status: 'held',
          payment_method: paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowId);
      
      if (err) throw err;
      
      // Mettre le projet en "payment_received" : les fonds sont sécurisés,
      // l'artisan devra accepter les conditions avant le démarrage effectif des travaux.
      if (escrowData?.project_id) {
        const { error: projectErr } = await supabase
          .from('projects')
          .update({ status: 'payment_received' })
          .eq('id', escrowData.project_id);
        if (projectErr) {
          console.error('[useEscrow] Erreur mise à jour statut projet payment_received:', projectErr);
          throw new Error(projectErr.message || 'Impossible de passer le projet en phase travaux.');
        }
      }

      // Notifier l'artisan (récupérer l'artisan_id depuis le devis accepté)
      if (escrowData?.project_id) {
        const { data: acceptedQuote } = await supabase
          .from('quotes')
          .select('artisan_id, amount')
          .eq('project_id', escrowData.project_id)
          .eq('status', 'accepted')
          .single();

        if (acceptedQuote?.artisan_id) {
          // Notifier l'artisan avec détail CGV / reliquat (TVA, commission 10-15%)
          await notifyArtisanPaymentHeldWithBreakdown(
            escrowData.project_id,
            acceptedQuote.artisan_id,
            {
              total_amount: Number(escrowData.total_amount || 0),
              tva_amount: Number(escrowData.tva_amount || 0),
              commission_amount: Number(escrowData.commission_amount || 0),
              artisan_payout: Number(escrowData.artisan_payout || 0),
            }
          );
        }
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const releaseAdvance = useCallback(async (escrowId: string) => {
    setLoading(true);
    try {
      // Fetch current escrow with project info
      const { data: escrow } = await supabase
        .from('escrows')
        .select('advance_amount, project_id, projects(id, title)')
        .eq('id', escrowId)
        .single();

      const { error: err } = await supabase
        .from('escrows')
        .update({ 
          is_advance_paid: true,
          advance_paid: escrow?.advance_amount || 0,
          status: 'advance_paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowId);

      if (err) throw err;

      // Notifier l'artisan de l'avance versée
      if (escrow?.project_id) {
        const { data: acceptedQuote } = await supabase
          .from('quotes')
          .select('artisan_id')
          .eq('project_id', escrow.project_id)
          .eq('status', 'accepted')
          .single();

        if (acceptedQuote?.artisan_id && escrow.advance_amount) {
          await notifyArtisanPaymentReceived(
            escrow.project_id,
            acceptedQuote.artisan_id,
            Number(escrow.advance_amount)
          );
        }
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const releaseFullPayment = useCallback(async (escrowId: string) => {
    setLoading(true);
    try {
      const { error: err } = await supabase
        .from('escrows')
        .update({ 
          status: 'released',
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowId);

      if (err) throw err;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const freezeEscrow = useCallback(async (escrowId: string) => {
    setLoading(true);
    try {
      const { error: err } = await supabase
        .from('escrows')
        .update({ 
          status: 'frozen',
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowId);

      if (err) throw err;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refundEscrow = useCallback(async (escrowId: string) => {
    setLoading(true);
    try {
      const { error: err } = await supabase
        .from('escrows')
        .update({ 
          status: 'refunded',
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowId);

      if (err) throw err;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Met à jour l'escrow avec un nouveau montant de base (ex. révision acceptée ou devis modifié). Recalcule commission, TVA, artisan_payout, advance. */
  const updateEscrowForNewAmount = useCallback(async (escrowId: string, newBaseAmount: number) => {
    setLoading(true);
    try {
      const { data: escrow, error: fetchErr } = await supabase
        .from('escrows')
        .select('id, commission_percent, advance_percent, advance_amount, status')
        .eq('id', escrowId)
        .single();

      if (fetchErr || !escrow) throw fetchErr || new Error('Escrow introuvable');
      if (escrow.status !== 'pending' && escrow.status !== 'held') {
        throw new Error('Impossible de modifier le montant : l\'escrow n\'est plus en attente.');
      }

      const commissionPercent = Number(escrow.commission_percent) || 10;
      const isVerified = (Number(escrow.advance_percent) || 0) > 0;
      const calculation = calculateEscrow(newBaseAmount, 0, commissionPercent, isVerified);

      const { error: updateErr } = await supabase
        .from('escrows')
        .update({
          total_amount: calculation.totalAmount,
          base_amount: calculation.baseAmount,
          urgent_surcharge: calculation.urgentSurcharge,
          commission_amount: calculation.commissionAmount,
          tva_amount: calculation.tvaAmount,
          artisan_payout: calculation.artisanPayout,
          advance_amount: calculation.advanceAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', escrowId);

      if (updateErr) throw updateErr;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    initiateEscrow,
    confirmDeposit,
    releaseAdvance,
    releaseFullPayment,
    freezeEscrow,
    refundEscrow,
    updateEscrowForNewAmount,
    calculateEscrow,
  };
}
