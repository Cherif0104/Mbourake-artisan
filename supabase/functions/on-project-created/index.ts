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
    // Récupérer les credentials Supabase depuis les variables d'environnement
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les données du webhook (projet créé)
    const { record } = await req.json();

    if (!record || record.status !== 'open') {
      return new Response(
        JSON.stringify({ message: 'Projet non ouvert, pas de notification' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Récupérer les filtres du projet s'ils existent
    const { data: projectFilters } = await supabase
      .from('project_filters')
      .select('*')
      .eq('project_id', record.id)
      .single();

    const { data: categoryRow, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('name_fr', record.category)
      .maybeSingle();

    if (categoryError) {
      console.error('Erreur récupération catégorie:', categoryError);
      throw categoryError;
    }

    if (!categoryRow?.id) {
      return new Response(
        JSON.stringify({ message: 'Catégorie introuvable, pas de notification' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Construire la requête de base pour les professionnels
    let query = supabase
      .from('professionals')
      .select(`
        id,
        user_id,
        category_id,
        rating,
        review_count,
        verification_status,
        is_motorized,
        availability,
        ranking_score,
        reputation_level,
        coordinates,
        region_id,
        department_id,
        commune_id,
        profiles!professionals_user_id_fkey (
          id,
          name,
          email,
          status
        )
      `)
      .eq('category_id', categoryRow.id)
      .eq('profiles.status', 'active');

    // Appliquer les filtres si spécifiés
    if (projectFilters) {
      if (projectFilters.verified_only) {
        query = query.eq('verification_status', 'verified');
      }
      if (projectFilters.motorized_only) {
        query = query.eq('is_motorized', true);
      }
      if (projectFilters.available_only !== false) {
        query = query.eq('availability', 'available');
      }
      if (projectFilters.min_rating) {
        query = query.gte('rating', projectFilters.min_rating);
      }
      if (projectFilters.region_id) {
        query = query.eq('region_id', projectFilters.region_id);
      }
      if (projectFilters.department_id) {
        query = query.eq('department_id', projectFilters.department_id);
      }
      if (projectFilters.commune_id) {
        query = query.eq('commune_id', projectFilters.commune_id);
      }
    } else {
      // Par défaut, seulement les disponibles
      query = query.eq('availability', 'available');
    }

    const { data: professionals, error: prosError } = await query;

    if (prosError) {
      console.error('Erreur récupération pros:', prosError);
      throw prosError;
    }

    if (!professionals || professionals.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Aucun professionnel trouvé pour cette catégorie' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Calculer les distances et scores de matching si coordonnées disponibles
    const projectCoords = record.location_coordinates 
      ? (typeof record.location_coordinates === 'string' 
          ? JSON.parse(record.location_coordinates) 
          : record.location_coordinates)
      : null;

    const professionalsWithScores = professionals
      .map((pro: any) => {
        const proCoords = pro.coordinates 
          ? { lat: pro.coordinates.lat || pro.coordinates[0], lon: pro.coordinates.lon || pro.coordinates[1] }
          : null;

        let distance_km: number | undefined;
        if (projectCoords && proCoords) {
          // Formule de Haversine simplifiée
          const R = 6371; // Rayon de la Terre en km
          const dLat = (proCoords.lat - projectCoords.lat) * Math.PI / 180;
          const dLon = (proCoords.lon - projectCoords.lon) * Math.PI / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(projectCoords.lat * Math.PI / 180) * Math.cos(proCoords.lat * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distance_km = R * c;

          // Filtrer par distance maximale si spécifiée
          if (projectFilters?.max_distance_km && distance_km > projectFilters.max_distance_km) {
            return null;
          }
        }

        // Calculer le score de matching
        const ratingScore = (pro.rating || 0) * 0.4;
        const reviewScore = Math.min(pro.review_count || 0, 100) / 100 * 0.2;
        const distanceScore = distance_km
          ? Math.max(0, 1 - (distance_km / 100)) * 0.2
          : 0.1;
        const verificationScore = pro.verification_status === 'verified' ? 0.1 : 0;
        const reputationMap: { [key: string]: number } = {
          'Platinum': 1.0,
          'Gold': 0.75,
          'Silver': 0.5,
          'Bronze': 0.25,
        };
        const reputationScore = (reputationMap[pro.reputation_level] || 0.25) * 0.1;
        const matching_score = ratingScore + reviewScore + distanceScore + verificationScore + reputationScore;

        return {
          ...pro,
          distance_km,
          matching_score,
        };
      })
      .filter((pro: any) => pro !== null)
      .sort((a: any, b: any) => b.matching_score - a.matching_score)
      .slice(0, 50); // Limiter à 50 professionnels

    // Créer des notifications pour chaque professionnel correspondant
    const notifications = professionalsWithScores.map((pro: any) => ({
      user_id: pro.user_id,
      type: 'new_project',
      title: 'Nouvelle demande dans votre catégorie',
      message: `Une nouvelle demande "${record.title}" a été publiée dans la catégorie ${record.category}.`,
      related_project_id: record.id,
      is_read: false,
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError) {
      console.error('Erreur création notifications:', notifError);
      throw notifError;
    }

    // TODO: Envoyer des emails/SMS aux professionnels
    // Pour l'instant, on crée juste les notifications dans la base
    // L'envoi d'emails peut être fait par une autre fonction ou un service externe

    return new Response(
      JSON.stringify({
        message: `Notifications créées pour ${professionals.length} professionnels`,
        projectId: record.id,
        category: record.category,
        professionalsNotified: professionals.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Erreur dans on-project-created:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

