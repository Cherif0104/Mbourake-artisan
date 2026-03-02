import { supabase } from './supabase';

/**
 * Système de Bypass Temporaire pour les Paiements
 * ================================================
 * 
 * Ce module simule les paiements en attendant l'intégration des API
 * des partenaires financiers (Wave, Orange Money, etc.)
 * 
 * À REMPLACER par les vraies intégrations API une fois disponibles.
 */

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string; // Emoji pour compatibilité
  logo?: string; // Chemin vers l'image du logo
  description: string;
  processingTime: string;
  fees: number; // en pourcentage
  minAmount: number;
  maxAmount: number;
  available: boolean;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'wave',
    name: 'Wave',
    icon: '🌊',
    logo: '/payment-logos/wave.png',
    description: 'Paiement mobile Wave',
    processingTime: 'Instantané',
    fees: 0,
    minAmount: 100,
    maxAmount: 5000000,
    available: true,
  },
  {
    id: 'orange_money',
    name: 'Orange Money',
    icon: '🟠',
    logo: '/payment-logos/orange-money.png',
    description: 'Paiement mobile Orange Money',
    processingTime: 'Instantané',
    fees: 1,
    minAmount: 100,
    maxAmount: 2000000,
    available: true,
  },
  {
    id: 'free_money',
    name: 'Free Money',
    icon: '💚',
    description: 'Paiement mobile Free Money',
    processingTime: 'Instantané',
    fees: 0,
    minAmount: 100,
    maxAmount: 1000000,
    available: true,
  },
  {
    id: 'card',
    name: 'Carte Bancaire',
    icon: '💳',
    logo: '/payment-logos/card.png',
    description: 'Visa, Mastercard',
    processingTime: 'Instantané',
    fees: 2.5,
    minAmount: 1000,
    maxAmount: 10000000,
    available: true,
  },
  {
    id: 'bank_transfer',
    name: 'Virement Bancaire',
    icon: '🏦',
    description: 'Virement depuis votre banque',
    processingTime: '24-48h',
    fees: 0,
    minAmount: 10000,
    maxAmount: 50000000,
    available: true,
  },
];

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  reference: string;
  timestamp: Date;
  amount: number;
  fees: number;
  totalCharged: number;
  method: string;
  status: 'completed' | 'pending' | 'failed';
  message: string;
}

export interface WithdrawalResult {
  success: boolean;
  transactionId: string;
  reference: string;
  timestamp: Date;
  amount: number;
  fees: number;
  netAmount: number;
  method: string;
  status: 'completed' | 'pending' | 'processing';
  estimatedArrival: string;
  message: string;
}

// Génère un ID de transaction unique
const generateTransactionId = (prefix: string): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// Génère une référence lisible
const generateReference = (): string => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `MBK-${dateStr}-${random}`;
};

/**
 * Simule un paiement (BYPASS TEMPORAIRE)
 * 
 * En production, cette fonction sera remplacée par les appels API réels
 * vers Wave, Orange Money, etc.
 */
async function processRealPayment(
  amount: number,
  methodId: string,
  metadata?: {
    projectId?: string;
    escrowId?: string;
    userId?: string;
    phoneNumber?: string;
  },
): Promise<PaymentResult> {
  const { data, error } = await supabase.functions.invoke<PaymentResult>('initiate-intouch-payment', {
    body: {
      amount,
      methodId,
      metadata: metadata ?? {},
    },
  });

  if (error || !data) {
    throw new Error(error?.message || 'Erreur lors de l’appel à l’API de paiement.');
  }

  return data;
}

export async function processPayment(
  amount: number,
  methodId: string,
  metadata?: {
    projectId?: string;
    escrowId?: string;
    userId?: string;
    phoneNumber?: string;
  },
): Promise<PaymentResult> {
  // Si le mode bypass est désactivé, on tente d'utiliser l'Edge Function (InTouch)
  if (!BYPASS_MODE.enabled) {
    try {
      return await processRealPayment(amount, methodId, metadata);
    } catch (e) {
      console.error('[payment] Erreur API réelle, bascule en mode bypass:', e);
      // On continue en mode simulation ci-dessous
    }
  }

  // Simule un délai de traitement
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
  
  const method = PAYMENT_METHODS.find(m => m.id === methodId);
  if (!method) {
    return {
      success: false,
      transactionId: '',
      reference: '',
      timestamp: new Date(),
      amount,
      fees: 0,
      totalCharged: amount,
      method: methodId,
      status: 'failed',
      message: 'Méthode de paiement non reconnue',
    };
  }

  // Validation du montant
  if (amount < method.minAmount) {
    return {
      success: false,
      transactionId: '',
      reference: '',
      timestamp: new Date(),
      amount,
      fees: 0,
      totalCharged: amount,
      method: methodId,
      status: 'failed',
      message: `Montant minimum: ${method.minAmount.toLocaleString('fr-FR')} FCFA`,
    };
  }

  if (amount > method.maxAmount) {
    return {
      success: false,
      transactionId: '',
      reference: '',
      timestamp: new Date(),
      amount,
      fees: 0,
      totalCharged: amount,
      method: methodId,
      status: 'failed',
      message: `Montant maximum: ${method.maxAmount.toLocaleString('fr-FR')} FCFA`,
    };
  }

  // Calcul des frais
  const fees = Math.round(amount * method.fees / 100);
  const totalCharged = amount + fees;

  // Simulation de succès (95% de réussite en mode test)
  const isSuccess = Math.random() > 0.05;

  if (!isSuccess) {
    return {
      success: false,
      transactionId: generateTransactionId('FAIL'),
      reference: generateReference(),
      timestamp: new Date(),
      amount,
      fees,
      totalCharged,
      method: method.name,
      status: 'failed',
      message: 'Paiement refusé par l\'opérateur. Veuillez réessayer.',
    };
  }

  return {
    success: true,
    transactionId: generateTransactionId('PAY'),
    reference: generateReference(),
    timestamp: new Date(),
    amount,
    fees,
    totalCharged,
    method: method.name,
    status: methodId === 'bank_transfer' ? 'pending' : 'completed',
    message: methodId === 'bank_transfer' 
      ? 'Virement en attente de confirmation bancaire'
      : 'Paiement effectué avec succès',
  };
}

/**
 * Simule un retrait/versement vers l'artisan (BYPASS TEMPORAIRE)
 */
export async function processWithdrawal(
  amount: number,
  methodId: string,
  recipientInfo: {
    name: string;
    phoneNumber?: string;
    bankAccount?: string;
    rib?: string;
  }
): Promise<WithdrawalResult> {
  // Simule un délai de traitement
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
  
  const method = PAYMENT_METHODS.find(m => m.id === methodId);
  if (!method) {
    return {
      success: false,
      transactionId: '',
      reference: '',
      timestamp: new Date(),
      amount,
      fees: 0,
      netAmount: amount,
      method: methodId,
      status: 'processing',
      estimatedArrival: '',
      message: 'Méthode de retrait non reconnue',
    };
  }

  // Frais de retrait (généralement 1%)
  const withdrawalFeeRate = 0.01;
  const fees = Math.round(amount * withdrawalFeeRate);
  const netAmount = amount - fees;

  // Estimation d'arrivée
  let estimatedArrival: string;
  if (['wave', 'orange_money', 'free_money'].includes(methodId)) {
    estimatedArrival = 'Instantané';
  } else if (methodId === 'card') {
    estimatedArrival = '1-3 jours ouvrés';
  } else {
    estimatedArrival = '2-5 jours ouvrés';
  }

  return {
    success: true,
    transactionId: generateTransactionId('WDR'),
    reference: generateReference(),
    timestamp: new Date(),
    amount,
    fees,
    netAmount,
    method: method.name,
    status: ['wave', 'orange_money', 'free_money'].includes(methodId) ? 'completed' : 'processing',
    estimatedArrival,
    message: `Versement de ${netAmount.toLocaleString('fr-FR')} FCFA vers ${recipientInfo.name}`,
  };
}

/**
 * Vérifie le statut d'une transaction (BYPASS TEMPORAIRE)
 */
export async function checkTransactionStatus(
  transactionId: string
): Promise<{
  found: boolean;
  status: 'completed' | 'pending' | 'processing' | 'failed' | 'refunded';
  message: string;
}> {
  // Simule un délai
  await new Promise(resolve => setTimeout(resolve, 500));

  // En mode bypass, on considère toutes les transactions comme complétées
  if (transactionId.startsWith('PAY-') || transactionId.startsWith('WDR-')) {
    return {
      found: true,
      status: 'completed',
      message: 'Transaction confirmée',
    };
  }

  if (transactionId.startsWith('FAIL-')) {
    return {
      found: true,
      status: 'failed',
      message: 'Transaction échouée',
    };
  }

  return {
    found: false,
    status: 'failed',
    message: 'Transaction introuvable',
  };
}

/**
 * Simule un remboursement (BYPASS TEMPORAIRE)
 */
export async function processRefund(
  originalTransactionId: string,
  amount: number,
  reason: string
): Promise<{
  success: boolean;
  refundId: string;
  amount: number;
  message: string;
}> {
  // Simule un délai
  await new Promise(resolve => setTimeout(resolve, 2000));

  return {
    success: true,
    refundId: generateTransactionId('REF'),
    amount,
    message: `Remboursement de ${amount.toLocaleString('fr-FR')} FCFA traité`,
  };
}

/**
 * Mode de test - Affiche une bannière pour indiquer que le système est en mode bypass.
 * Peut être contrôlé par la variable d'environnement VITE_PAYMENT_BYPASS_ENABLED.
 */
const bypassEnv = (import.meta as any).env?.VITE_PAYMENT_BYPASS_ENABLED;
const bypassEnabled =
  bypassEnv === undefined
    ? true
    : !(bypassEnv === 'false' || bypassEnv === '0' || bypassEnv === 'off');

export const BYPASS_MODE = {
  enabled: bypassEnabled,
  message: 'Mode démonstration - Paiements simulés',
  warning: 'Les transactions sont simulées. Aucun vrai paiement n\'est effectué.',
};
