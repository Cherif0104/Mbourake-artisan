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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const googleApiKey = Deno.env.get('GOOGLE_SPEECH_TO_TEXT_API_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { audioUrl, projectId, messageId } = await req.json();

    if (!audioUrl) {
      return new Response(
        JSON.stringify({ error: 'audioUrl is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Télécharger l'audio depuis Supabase Storage
    const audioPath = audioUrl.split('/storage/v1/object/public/audio/')[1];
    if (!audioPath) {
      return new Response(
        JSON.stringify({ error: 'Invalid audio URL' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { data: audioData, error: downloadError } = await supabase.storage
      .from('audio')
      .download(audioPath);

    if (downloadError || !audioData) {
      return new Response(
        JSON.stringify({ error: 'Failed to download audio' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Convertir en base64 pour Google Speech-to-Text
    const arrayBuffer = await audioData.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Appeler Google Speech-to-Text API
    // Note: Pour une vraie implémentation, il faudrait utiliser le SDK Google Cloud
    // Ici, on simule avec une requête HTTP directe
    const transcriptionResponse = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: 'fr-SN', // Français du Sénégal, ou 'wo-SN' pour Wolof
            alternativeLanguageCodes: ['wo-SN', 'fr-FR'],
          },
          audio: {
            content: base64Audio,
          },
        }),
      }
    );

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error('Google Speech-to-Text error:', errorText);
      
      // Si l'API Google n'est pas configurée, on retourne une transcription vide
      // En production, on pourrait utiliser une alternative comme Whisper API
      return new Response(
        JSON.stringify({
          transcription: '',
          note: 'Transcription non disponible (API non configurée)',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const transcriptionData = await transcriptionResponse.json();
    const transcription = transcriptionData.results?.[0]?.alternatives?.[0]?.transcript || '';

    // Mettre à jour le projet ou le message avec la transcription
    if (projectId) {
      await supabase
        .from('projects')
        .update({ audio_transcription: transcription })
        .eq('id', projectId);
    }

    if (messageId) {
      await supabase
        .from('messages')
        .update({ audio_transcription: transcription })
        .eq('id', messageId);
    }

    return new Response(
      JSON.stringify({
        transcription,
        projectId,
        messageId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Erreur dans transcribe-audio:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

