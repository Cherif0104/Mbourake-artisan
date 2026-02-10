import type { Database } from '../types/database.types';

export type EscrowRow = Database['public']['Tables']['escrows']['Row'];

export const TVA_RATE = 0.18;
export const DEFAULT_COMMISSION_RATE = 0.1;
export const VERIFIED_ADVANCE_RATE = 0.5;
export const UNVERIFIED_ADVANCE_RATE = 0;

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
  isVerified: boolean = false,
): EscrowCalculation {
  const urgentSurcharge = baseAmount * (urgentSurchargePercent / 100);
  const totalAmount = baseAmount + urgentSurcharge;
  const commissionAmount = totalAmount * (commissionPercent / 100);
  const tvaAmount = commissionAmount * TVA_RATE;
  const artisanPayout = totalAmount - commissionAmount - tvaAmount;
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
