-- Migration: RLS sur messages pour que les deux participants (client + artisan) voient tous les messages du projet
-- Sans cette policy, seul l'expéditeur peut lire (si une ancienne policy le restreint) et le destinataire ne reçoit rien.

-- Activer RLS sur messages si pas déjà fait
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Supprimer une policy restrictive existante qui limiterait la lecture au seul expéditeur (si elle existe)
DROP POLICY IF EXISTS "Users can read own sent messages" ON public.messages;
DROP POLICY IF EXISTS "Users can read only their messages" ON public.messages;
DROP POLICY IF EXISTS "Allow read own messages" ON public.messages;

-- SELECT : lire les messages si on est participant au projet (client OU artisan avec devis pending/viewed/accepted)
CREATE POLICY "Participants can read project messages"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = messages.project_id
    AND (
      p.client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.quotes q
        WHERE q.project_id = p.id
        AND q.artisan_id = auth.uid()
        AND q.status IN ('pending', 'viewed', 'accepted')
      )
    )
  )
);

-- INSERT : envoyer un message uniquement si on est participant et qu'on est l'expéditeur
CREATE POLICY "Participants can send messages in project"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = messages.project_id
    AND (
      p.client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.quotes q
        WHERE q.project_id = p.id
        AND q.artisan_id = auth.uid()
        AND q.status IN ('pending', 'viewed', 'accepted')
      )
    )
  )
);
