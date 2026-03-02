/**
 * Edge Function: Suppression d'un compte par un administrateur
 * - Body: { user_id: string }
 * - Vérifie que l'appelant (JWT) est admin (profiles.role = 'admin')
 * - Supprime toutes les données du compte cible puis le compte Auth
 * CORS : verify_jwt = false pour OPTIONS.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://www.mbourake.com',
  'https://mbourake.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
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

async function deleteUserData(admin: ReturnType<typeof createClient>, uid: string): Promise<void> {
  const { data: projectsToDelete } = await admin.from('projects').select('id').or(`client_id.eq.${uid},target_artisan_id.eq.${uid}`);
  const projectIds = (projectsToDelete ?? []).map((p: { id: string }) => p.id);

  const quoteFilter = projectIds.length
    ? `artisan_id.eq.${uid},project_id.in.(${projectIds.join(',')})`
    : `artisan_id.eq.${uid}`;
  const { data: quotesToDelete } = await admin.from('quotes').select('id').or(quoteFilter);
  const quoteIds = (quotesToDelete ?? []).map((q: { id: string }) => q.id);

  const { data: escrowsToDelete } = await admin.from('escrows').select('id').in('project_id', projectIds);
  const escrowIds = (escrowsToDelete ?? []).map((e: { id: string }) => e.id);

  const { data: invoicesToDelete } = await admin.from('invoices').select('id').or(`client_id.eq.${uid},artisan_id.eq.${uid}`);
  const invoiceIds = (invoicesToDelete ?? []).map((i: { id: string }) => i.id);

  try { await admin.from('notifications').delete().eq('user_id', uid); } catch (_) { /* ignore */ }
  await admin.from('expenses').delete().eq('user_id', uid);
  await admin.from('quote_revisions').delete().eq('requested_by', uid);
  if (quoteIds.length) await admin.from('quote_revisions').delete().in('quote_id', quoteIds);
  await admin.from('reviews').delete().or(`client_id.eq.${uid},artisan_id.eq.${uid}`);
  await admin.from('messages').delete().eq('sender_id', uid);
  if (projectIds.length) {
    for (const pid of projectIds) {
      await admin.from('messages').delete().eq('project_id', pid);
    }
  }
  if (projectIds.length) await admin.from('project_audit_logs').delete().in('project_id', projectIds);
  await admin.from('project_audit_logs').delete().eq('user_id', uid);
  if (quoteIds.length) await admin.from('quote_audit_logs').delete().in('quote_id', quoteIds);
  await admin.from('quote_audit_logs').delete().eq('user_id', uid);
  if (escrowIds.length) await admin.from('escrow_audit_logs').delete().in('escrow_id', escrowIds);
  await admin.from('escrow_audit_logs').delete().eq('user_id', uid);
  if (invoiceIds.length) await admin.from('invoice_audit_logs').delete().in('invoice_id', invoiceIds);
  await admin.from('invoice_audit_logs').delete().eq('user_id', uid);
  if (invoiceIds.length) await admin.from('invoices').delete().in('id', invoiceIds);
  if (projectIds.length) {
    for (const pid of projectIds) {
      await admin.from('escrows').delete().eq('project_id', pid);
    }
  }
  if (quoteIds.length) {
    for (const qid of quoteIds) {
      await admin.from('quotes').delete().eq('id', qid);
    }
  }
  if (projectIds.length) {
    for (const pid of projectIds) {
      await admin.from('projects').delete().eq('id', pid);
    }
  }
  await admin.from('artisan_credit_wallets').delete().eq('artisan_id', uid);
  await admin.from('artisan_affiliations').delete().eq('artisan_id', uid);
  await admin.from('verification_documents').delete().eq('artisan_id', uid);
  await admin.from('verification_documents').delete().eq('reviewed_by', uid);
  try {
    await admin.from('favorites').delete().eq('client_id', uid);
    await admin.from('favorites').delete().eq('artisan_id', uid);
  } catch (_) { /* ignore */ }
  try {
    await admin.from('organisation_members').delete().eq('user_id', uid);
  } catch (_) { /* table peut ne pas exister */ }
  try {
    await admin.from('client_attributions').delete().eq('client_id', uid);
  } catch (_) { /* table peut ne pas exister */ }
  try {
    const { data: orders } = await admin.from('orders').select('id').or(`buyer_id.eq.${uid},seller_id.eq.${uid}`);
    const orderIds = (orders ?? []).map((o: { id: string }) => o.id);
    if (orderIds.length) {
      await admin.from('order_items').delete().in('order_id', orderIds);
      await admin.from('orders').delete().in('id', orderIds);
    }
  } catch (_) { /* ignore */ }
  await admin.from('products').delete().eq('artisan_id', uid);
  await admin.from('artisans').delete().eq('id', uid);
  await admin.from('artisans').delete().eq('user_id', uid);
  await admin.from('profiles').delete().eq('id', uid);

  const buckets = ['photos', 'videos', 'audio', 'documents'] as const;
  const prefixUid = `${uid}`;
  const prefixMessagesUid = `messages/${uid}`;

  async function listAllPaths(bucketId: string, prefix: string): Promise<string[]> {
    const paths: string[] = [];
    const { data: items, error } = await admin.storage.from(bucketId).list(prefix, { limit: 1000 });
    if (error || !items?.length) return paths;
    for (const item of items) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
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
      if (paths.length > 0) await admin.storage.from(bucketId).remove(paths);
    } catch (e) {
      console.warn(`admin-delete-account: storage ${bucketId}:`, e);
    }
  }
  try {
    const paths = await listAllPaths('audio', prefixMessagesUid);
    if (paths.length > 0) await admin.storage.from('audio').remove(paths);
  } catch (e) {
    console.warn('admin-delete-account: storage audio:', e);
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(uid);
  if (deleteUserError) throw deleteUserError;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

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

    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user: caller }, error: callerError } = await supabaseAnon.auth.getUser(token);
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Session invalide ou expirée.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', caller.id).maybeSingle();
    if ((callerProfile as { role?: string } | null)?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Réservé aux administrateurs.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId = typeof body?.user_id === 'string' ? body.user_id.trim() : null;
    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'user_id requis.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (targetUserId === caller.id) {
      return new Response(
        JSON.stringify({ error: 'Vous ne pouvez pas supprimer votre propre compte depuis cette interface.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    await deleteUserData(admin, targetUserId);

    return new Response(
      JSON.stringify({ success: true, message: 'Compte et données supprimés.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: unknown) {
    console.error('admin-delete-account error:', err);
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
