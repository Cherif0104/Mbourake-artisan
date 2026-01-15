/**
 * Edge Function: Mark Expired Projects
 * Appelle la fonction SQL mark_expired_projects() pour marquer les projets expirés
 * 
 * Cette fonction peut être appelée:
 * 1. Manuellement via l'API Supabase
 * 2. Via un cron job (pg_cron dans Supabase)
 * 3. Via un service externe (cron service comme cron-job.org)
 * 
 * Pour configurer un cron job Supabase:
 * - Activer l'extension pg_cron dans Supabase
 * - Exécuter: SELECT cron.schedule('mark-expired-projects', '0 * * * *', $$SELECT mark_expired_projects()$$);
 *   (exécute toutes les heures)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Récupérer les credentials Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Appeler la fonction SQL mark_expired_projects()
    const { data, error } = await supabase.rpc('mark_expired_projects');

    if (error) {
      console.error('Error marking expired projects:', error);
      throw error;
    }

    // Optionnel: Récupérer le nombre de projets expirés pour logging
    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'expired')
      .gte('updated_at', new Date(Date.now() - 60000).toISOString()); // Mis à jour dans la dernière minute

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Expired projects marked successfully',
        expired_count: count || 0,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in mark-expired-projects function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
