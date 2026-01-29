/**
 * Edge Function: Supprimer mon compte et toutes mes données
 * - Vérifie le JWT de l'utilisateur
 * - Supprime toutes les données public liées à cet utilisateur (ordre respectant les FK)
 * - Supprime le compte Auth (auth.users)
 * À appeler depuis le front avec Authorization: Bearer <session.access_token>
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    const { data: projectsToDelete } = await admin.from('projects').select('id').or(`client_id.eq.${uid},target_artisan_id.eq.${uid}`);
    const projectIds = (projectsToDelete ?? []).map((p) => p.id);

    const quoteFilter = projectIds.length
      ? `artisan_id.eq.${uid},project_id.in.(${projectIds.join(',')})`
      : `artisan_id.eq.${uid}`;
    const { data: quotesToDelete } = await admin.from('quotes').select('id').or(quoteFilter);
    const quoteIds = (quotesToDelete ?? []).map((q) => q.id);

    const { data: escrowsToDelete } = await admin.from('escrows').select('id').in('project_id', projectIds);
    const escrowIds = (escrowsToDelete ?? []).map((e) => e.id);

    const { data: invoicesToDelete } = await admin.from('invoices').select('id').or(`client_id.eq.${uid},artisan_id.eq.${uid}`);
    const invoiceIds = (invoicesToDelete ?? []).map((i) => i.id);

    // 2) Suppressions dans l'ordre (clés étrangères)
    try { await admin.from('notifications').delete().eq('user_id', uid); } catch (_) { /* table peut ne pas exister */ }
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
    } catch (_) { /* table peut ne pas exister */ }
    await admin.from('artisans').delete().eq('id', uid);
    await admin.from('artisans').delete().eq('user_id', uid);
    await admin.from('profiles').delete().eq('id', uid);

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
