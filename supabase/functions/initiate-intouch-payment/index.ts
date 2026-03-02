/**
 * Edge Function: initiate-intouch-payment
 * ---------------------------------------
 * Point d'entrée unique pour déclencher un paiement via les partenaires (InTouch, Wave, Orange Money, etc.).
 * 
 * Pour l'instant, cette fonction renvoie un résultat de paiement simulé mais côté serveur.
 * Elle servira de point d’intégration avec l’API InTouch (clé, URL, etc. via Deno.env).
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface InvokePayload {
  amount: number;
  methodId: string;
  metadata?: Record<string, unknown>;
}

interface EdgePaymentResult {
  success: boolean;
  transactionId: string;
  reference: string;
  timestamp: string;
  amount: number;
  fees: number;
  totalCharged: number;
  method: string;
  status: 'completed' | 'pending' | 'failed';
  message: string;
}

const generateId = (prefix: string): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

const generateReference = (): string => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `MBK-${dateStr}-${random}`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const body = (await req.json()) as InvokePayload;
    const { amount, methodId } = body;

    if (!amount || amount <= 0 || !methodId) {
      return new Response(
        JSON.stringify({ error: 'amount et methodId sont requis.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const intouchApiKey = Deno.env.get('INTOUCH_API_KEY');
    const intouchBaseUrl = Deno.env.get('INTOUCH_BASE_URL');

    // À terme : utiliser intouchApiKey / intouchBaseUrl pour appeler l’API réelle.
    // Pour le moment, on renvoie un paiement simulé côté serveur.

    const metadata = body.metadata ?? {};
    if (intouchApiKey && intouchBaseUrl) {
      try {
        const apiUrl = `${intouchBaseUrl.replace(/\/$/, '')}/pay`;
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${intouchApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, methodId, metadata }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && typeof data.success !== 'undefined') {
          const apiResult: EdgePaymentResult = {
            success: Boolean(data.success),
            transactionId: String(data.transactionId ?? data.transaction_id ?? generateId('PAY')),
            reference: String(data.reference ?? data.reference_id ?? generateReference()),
            timestamp: String(data.timestamp ?? new Date().toISOString()),
            amount: Number(data.amount ?? amount),
            fees: Number(data.fees ?? 0),
            totalCharged: Number(data.totalCharged ?? data.total_charged ?? amount),
            method: String(data.method ?? methodId),
            status: (data.status === 'pending' || data.status === 'failed' ? data.status : 'completed') as 'completed' | 'pending' | 'failed',
            message: String(data.message ?? data.error ?? (data.success ? 'Paiement initié.' : 'Échec du paiement.')),
          };
          return new Response(JSON.stringify(apiResult), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } catch (apiError) {
        console.error('initiate-intouch-payment API call failed:', apiError);
      }
    }
    const result: EdgePaymentResult = {
      success: true,
      transactionId: generateId('PAY'),
      reference: generateReference(),
      timestamp: new Date().toISOString(),
      amount,
      fees: 0,
      totalCharged: amount,
      method: methodId,
      status: 'completed',
      message: intouchApiKey && intouchBaseUrl
        ? 'Paiement simulé (API partenaire indisponible ou non configurée).'
        : 'Paiement simulé (InTouch non encore configuré).',
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('initiate-intouch-payment error:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur interne lors du traitement du paiement.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

