/**
 * Edge Function: Supprimer mon compte et toutes mes données
 * - Vérifie le JWT de l'utilisateur
 * - Supprime toutes les données public liées à cet utilisateur (ordre respectant les FK)
 * - Supprime le compte Auth (auth.users)
 * À appeler depuis le front avec Authorization: Bearer <session.access_token>
 * CORS : config.toml doit avoir verify_jwt = false pour cette fonction (préflight OPTIONS sans token).
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://www.mbourake.com',
  'https://mbourake.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3002',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3002',
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // CORS preflight : 200 OK + corps "ok" (recommandation Supabase). Nécessite verify_jwt = false dans config.toml.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé. Token manquant.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    // Vérifier le JWT et récupérer l'utilisateur
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Session invalide ou expirée.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const uid = user.id;

    // Client avec service_role pour supprimer les données et le compte Auth
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // 1) Récupérer les IDs des projets / devis / escrows / factures à supprimer
    let projectIds: string[] = [];
    let quoteIds: string[] = [];
    let escrowIds: string[] = [];
    let invoiceIds: string[] = [];

    try {
      const { data: projectsToDelete } = await admin.from('projects').select('id').or(`client_id.eq.${uid},target_artisan_id.eq.${uid}`);
      projectIds = (projectsToDelete ?? []).map((p) => p.id);
    } catch (e) {
      console.warn('delete-my-account: projects fetch:', e);
    }

    try {
      const quoteFilter = projectIds.length
        ? `artisan_id.eq.${uid},project_id.in.(${projectIds.join(',')})`
        : `artisan_id.eq.${uid}`;
      const { data: quotesToDelete } = await admin.from('quotes').select('id').or(quoteFilter);
      quoteIds = (quotesToDelete ?? []).map((q) => q.id);
    } catch (e) {
      console.warn('delete-my-account: quotes fetch:', e);
    }

    try {
      if (projectIds.length > 0) {
        const { data: escrowsToDelete } = await admin.from('escrows').select('id').in('project_id', projectIds);
        escrowIds = (escrowsToDelete ?? []).map((e) => e.id);
      }
    } catch (_) { /* table escrows peut ne pas exister */ }
    try {
      const { data: invoicesToDelete } = await admin.from('invoices').select('id').or(`client_id.eq.${uid},artisan_id.eq.${uid}`);
      invoiceIds = (invoicesToDelete ?? []).map((i) => i.id);
    } catch (_) { /* table invoices peut ne pas exister */ }

    let orderIds: string[] = [];
    try {
      const { data: ordersToDelete } = await admin.from('orders').select('id').or(`buyer_id.eq.${uid},seller_id.eq.${uid}`);
      orderIds = (ordersToDelete ?? []).map((o) => o.id);
    } catch (_) { /* table orders peut ne pas exister */ }

    const safeDelete = async (fn: () => Promise<{ error?: unknown } | unknown>) => {
      try {
        const result = await fn();
        if (result && typeof result === 'object' && 'error' in result && result.error) {
          console.warn('delete-my-account skip:', result.error);
        }
      } catch (e) {
        console.warn('delete-my-account skip:', e);
      }
    };

    // 2) Suppressions dans l'ordre (clés étrangères) — chaque bloc peut être ignoré si la table n'existe pas
    await safeDelete(() => admin.from('notifications').delete().eq('user_id', uid));
    await safeDelete(() => admin.from('expenses').delete().eq('user_id', uid));
    await safeDelete(() => admin.from('quote_revisions').delete().eq('requested_by', uid));
    if (quoteIds.length) await safeDelete(() => admin.from('quote_revisions').delete().in('quote_id', quoteIds));
    await safeDelete(() => admin.from('reviews').delete().or(`client_id.eq.${uid},artisan_id.eq.${uid}`));
    await safeDelete(() => admin.from('messages').delete().eq('sender_id', uid));
    if (projectIds.length) {
      for (const pid of projectIds) {
        await safeDelete(() => admin.from('messages').delete().eq('project_id', pid));
      }
    }
    if (projectIds.length) await safeDelete(() => admin.from('project_audit_logs').delete().in('project_id', projectIds));
    await safeDelete(() => admin.from('project_audit_logs').delete().eq('user_id', uid));
    if (quoteIds.length) await safeDelete(() => admin.from('quote_audit_logs').delete().in('quote_id', quoteIds));
    await safeDelete(() => admin.from('quote_audit_logs').delete().eq('user_id', uid));
    if (escrowIds.length) await safeDelete(() => admin.from('escrow_audit_logs').delete().in('escrow_id', escrowIds));
    await safeDelete(() => admin.from('escrow_audit_logs').delete().eq('user_id', uid));
    if (invoiceIds.length) await safeDelete(() => admin.from('invoice_audit_logs').delete().in('invoice_id', invoiceIds));
    await safeDelete(() => admin.from('invoice_audit_logs').delete().eq('user_id', uid));
    if (invoiceIds.length) await safeDelete(() => admin.from('invoices').delete().in('id', invoiceIds));
    if (projectIds.length) {
      for (const pid of projectIds) {
        await safeDelete(() => admin.from('escrows').delete().eq('project_id', pid));
      }
    }
    if (quoteIds.length) {
      for (const qid of quoteIds) {
        await safeDelete(() => admin.from('quotes').delete().eq('id', qid));
      }
    }
    if (projectIds.length) {
      for (const pid of projectIds) {
        await safeDelete(() => admin.from('projects').delete().eq('id', pid));
      }
    }
    // Marketplace: order_items → orders (RESTRICT sur buyer_id/seller_id)
    if (orderIds.length) {
      await safeDelete(() => admin.from('order_items').delete().in('order_id', orderIds));
      await safeDelete(() => admin.from('orders').delete().in('id', orderIds));
    }
    await safeDelete(() => admin.from('products').delete().eq('artisan_id', uid));
    await safeDelete(() => admin.from('artisan_certifications').delete().eq('artisan_id', uid));
    await safeDelete(() => admin.from('artisan_credit_transactions').delete().eq('artisan_id', uid));
    await safeDelete(() => admin.from('artisan_credit_wallets').delete().eq('artisan_id', uid));
    await safeDelete(() => admin.from('artisan_affiliations').delete().eq('artisan_id', uid));
    await safeDelete(() => admin.from('verification_documents').delete().eq('artisan_id', uid));
    await safeDelete(() => admin.from('verification_documents').delete().eq('reviewed_by', uid));
    await safeDelete(() => admin.from('favorites').delete().eq('client_id', uid));
    await safeDelete(() => admin.from('favorites').delete().eq('artisan_id', uid));
    await safeDelete(() => admin.from('client_attributions').delete().eq('client_id', uid));
    await safeDelete(() => admin.from('client_attribution_transfers').delete().eq('transferred_by', uid));
    await safeDelete(() => admin.from('deletion_requests').delete().eq('user_id', uid));
    await safeDelete(() => admin.from('organisation_members').delete().eq('user_id', uid));
    await safeDelete(() => admin.from('admin_user_role_assignments').delete().eq('user_id', uid));
    await safeDelete(() => admin.from('team_members').delete().eq('user_id', uid));
    await safeDelete(() => admin.from('training_cohort_members').delete().eq('user_id', uid));
    await safeDelete(() => admin.from('artisans').delete().eq('id', uid));
    await safeDelete(() => admin.from('artisans').delete().eq('user_id', uid));
    await safeDelete(() => admin.from('profiles').delete().eq('id', uid));

    // 2.5) Supprimer les fichiers Storage (portfolio, documents, vérification, etc.)
    const buckets = ['photos', 'videos', 'audio', 'documents'] as const;
    const prefixUid = `${uid}`;
    const prefixMessagesUid = `messages/${uid}`;

    async function listAllPaths(bucketId: string, prefix: string): Promise<string[]> {
      const paths: string[] = [];
      const { data: items, error } = await admin.storage.from(bucketId).list(prefix, { limit: 1000 });
      if (error || !items?.length) return paths;
      for (const item of items) {
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
        // null id = folder (prefix) in Supabase Storage list
        if (item.id == null) {
          const nested = await listAllPaths(bucketId, fullPath);
          paths.push(...nested);
        } else {
          paths.push(fullPath);
        }
      }
      return paths;
    }

    for (const bucketId of buckets) {
      try {
        const paths = await listAllPaths(bucketId, prefixUid);
        if (paths.length > 0) {
          await admin.storage.from(bucketId).remove(paths);
        }
      } catch (e) {
        console.warn(`delete-my-account: storage ${bucketId} prefix ${prefixUid}:`, e);
      }
    }
    // audio: messages/{uid}/ (Chat)
    try {
      const paths = await listAllPaths('audio', prefixMessagesUid);
      if (paths.length > 0) {
        await admin.storage.from('audio').remove(paths);
      }
    } catch (e) {
      console.warn('delete-my-account: storage audio messages:', e);
    }

    // 3) Supprimer le compte Auth
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(uid);
    if (deleteUserError) {
      console.error('deleteUser error:', deleteUserError);
      return new Response(
        JSON.stringify({ error: 'Impossible de supprimer le compte. Réessayez ou contactez le support.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Compte et données supprimés.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: unknown) {
    console.error('delete-my-account error:', err);
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
