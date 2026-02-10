import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import { calculateEscrow } from './escrowService';

export type EscrowRow = Database['public']['Tables']['escrows']['Row'];
type Client = SupabaseClient<Database>;

const DEFAULT_COMMISSION_RATE = 10;

export async function initiateEscrow(
  client: Client,
  data: {
    project_id: string;
    total_amount: number;
    artisan_is_verified: boolean;
    urgent_surcharge_percent?: number;
    commission_percent?: number;
  },
): Promise<EscrowRow> {
  const urgentSurchargePercent = data.urgent_surcharge_percent ?? 0;
  const commissionPercent = data.commission_percent ?? DEFAULT_COMMISSION_RATE;
  const calculation = calculateEscrow(
    data.total_amount,
    urgentSurchargePercent,
    commissionPercent,
    data.artisan_is_verified,
  );

  const { data: escrow, error } = await client
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
  if (error) throw error;
  return escrow;
}

export async function confirmDeposit(
  client: Client,
  escrowId: string,
  paymentMethod: string,
): Promise<void> {
  const { data: escrowData } = await client
    .from('escrows')
    .select('*, projects(id, title, client_id)')
    .eq('id', escrowId)
    .single();

  const { error: err } = await client
    .from('escrows')
    .update({
      status: 'held',
      payment_method: paymentMethod,
      updated_at: new Date().toISOString(),
    })
    .eq('id', escrowId);
  if (err) throw err;

  if (escrowData?.project_id) {
    const { error: projectErr } = await client
      .from('projects')
      .update({ status: 'payment_received' })
      .eq('id', escrowData.project_id);
    if (projectErr) throw projectErr;
  }
}

export async function releaseAdvance(client: Client, escrowId: string): Promise<void> {
  const { data: escrow } = await client
    .from('escrows')
    .select('advance_amount, project_id')
    .eq('id', escrowId)
    .single();

  const { error } = await client
    .from('escrows')
    .update({
      is_advance_paid: true,
      advance_paid: escrow?.advance_amount ?? 0,
      status: 'advance_paid',
      updated_at: new Date().toISOString(),
    })
    .eq('id', escrowId);
  if (error) throw error;
}

export async function releaseFullPayment(client: Client, escrowId: string): Promise<void> {
  const { error } = await client
    .from('escrows')
    .update({
      status: 'released',
      updated_at: new Date().toISOString(),
    })
    .eq('id', escrowId);
  if (error) throw error;
}

export async function freezeEscrow(client: Client, escrowId: string): Promise<void> {
  const { error } = await client
    .from('escrows')
    .update({
      status: 'frozen',
      updated_at: new Date().toISOString(),
    })
    .eq('id', escrowId);
  if (error) throw error;
}

export async function refundEscrow(client: Client, escrowId: string): Promise<void> {
  const { error } = await client
    .from('escrows')
    .update({
      status: 'refunded',
      updated_at: new Date().toISOString(),
    })
    .eq('id', escrowId);
  if (error) throw error;
}

export async function updateEscrowForNewAmount(
  client: Client,
  escrowId: string,
  newBaseAmount: number,
): Promise<void> {
  const { data: escrow, error: fetchErr } = await client
    .from('escrows')
    .select('id, commission_percent, advance_percent, status')
    .eq('id', escrowId)
    .single();
  if (fetchErr || !escrow) throw fetchErr ?? new Error('Escrow introuvable');
  if (escrow.status !== 'pending' && escrow.status !== 'held') {
    throw new Error(
      "Impossible de modifier le montant : l'escrow n'est plus en attente.",
    );
  }

  const commissionPercent = Number(escrow.commission_percent) || 10;
  const isVerified = (Number(escrow.advance_percent) || 0) > 0;
  const calculation = calculateEscrow(newBaseAmount, 0, commissionPercent, isVerified);

  const { error: updateErr } = await client
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
}
