import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '@shared';
import {
  calculateEscrow,
  initiateEscrow as initiateEscrowDb,
  confirmDeposit as confirmDepositDb,
  releaseAdvance as releaseAdvanceDb,
  releaseFullPayment as releaseFullPaymentDb,
  freezeEscrow as freezeEscrowDb,
  refundEscrow as refundEscrowDb,
  updateEscrowForNewAmount as updateEscrowForNewAmountDb,
} from '@shared';
import { notifyArtisanPaymentHeldWithBreakdown, notifyArtisanPaymentReceived } from '../lib/notificationService';

export type Escrow = Database['public']['Tables']['escrows']['Row'];
export type { EscrowCalculation } from '@shared';

export { calculateEscrow };

export function useEscrow() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateEscrow = useCallback(
    async (data: {
      project_id: string;
      total_amount: number;
      artisan_is_verified: boolean;
      urgent_surcharge_percent?: number;
      commission_percent?: number;
    }) => {
      setLoading(true);
      setError(null);
      try {
        return await initiateEscrowDb(supabase, {
          ...data,
          commission_percent: data.commission_percent ?? 10,
        });
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const confirmDeposit = useCallback(async (escrowId: string, paymentMethod: string) => {
    setLoading(true);
    try {
      const { data: escrowData } = await supabase
        .from('escrows')
        .select('*, projects(id, title, client_id)')
        .eq('id', escrowId)
        .single();

      await confirmDepositDb(supabase, escrowId, paymentMethod);

      if (escrowData?.project_id) {
        const { data: acceptedQuote } = await supabase
          .from('quotes')
          .select('artisan_id, amount')
          .eq('project_id', escrowData.project_id)
          .eq('status', 'accepted')
          .single();

        if (acceptedQuote?.artisan_id) {
          await notifyArtisanPaymentHeldWithBreakdown(
            escrowData.project_id,
            acceptedQuote.artisan_id,
            {
              total_amount: Number(escrowData.total_amount || 0),
              tva_amount: Number(escrowData.tva_amount || 0),
              commission_amount: Number(escrowData.commission_amount || 0),
              artisan_payout: Number(escrowData.artisan_payout || 0),
            },
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
      const { data: escrow } = await supabase
        .from('escrows')
        .select('advance_amount, project_id')
        .eq('id', escrowId)
        .single();

      await releaseAdvanceDb(supabase, escrowId);

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
            Number(escrow.advance_amount),
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
      await releaseFullPaymentDb(supabase, escrowId);
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
      await freezeEscrowDb(supabase, escrowId);
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
      await refundEscrowDb(supabase, escrowId);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateEscrowForNewAmount = useCallback(
    async (escrowId: string, newBaseAmount: number) => {
      setLoading(true);
      try {
        await updateEscrowForNewAmountDb(supabase, escrowId, newBaseAmount);
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

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
