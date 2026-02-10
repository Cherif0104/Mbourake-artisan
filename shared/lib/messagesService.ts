import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

export type MessageRow = Database['public']['Tables']['messages']['Row'];
type Client = SupabaseClient<Database>;

export async function fetchMessages(client: Client, projectId: string): Promise<MessageRow[]> {
  const { data, error } = await client
    .from('messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(
  client: Client,
  data: {
    project_id: string;
    sender_id: string;
    content?: string;
    audio_url?: string;
    type: 'text' | 'audio' | 'image' | 'video';
  },
): Promise<MessageRow> {
  const { data: inserted, error } = await client
    .from('messages')
    .insert({
      project_id: data.project_id,
      sender_id: data.sender_id,
      content: data.content,
      audio_url: data.audio_url,
      type: data.type,
    })
    .select()
    .single();
  if (error) throw error;
  return inserted;
}

export function subscribeMessages(
  client: Client,
  projectId: string,
  onInsert: (message: MessageRow) => void,
): () => void {
  const channel = client
    .channel(`project-messages-${projectId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => {
        onInsert(payload.new as MessageRow);
      },
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
