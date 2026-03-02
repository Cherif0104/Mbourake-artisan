import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '@shared';

export type Message = Database['public']['Tables']['messages']['Row'];

export function useMessages(projectId?: string, userId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!projectId || !userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setMessages(data);
    } else if (error) {
      console.error('Error fetching messages:', error);
    }
    setLoading(false);
  }, [projectId, userId]);

  useEffect(() => {
    if (!projectId || !userId) return;
    fetchMessages();

    // Subscribe to new messages (éviter doublon avec envoi optimiste)
    const channel = supabase
      .channel(`project-messages-${projectId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `project_id=eq.${projectId}`
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => 
          prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, userId, fetchMessages]);

  const sendMessage = async (data: {
    project_id: string;
    sender_id: string;
    content?: string;
    audio_url?: string;
    type: 'text' | 'audio' | 'image' | 'video';
  }) => {
    const { data: inserted, error } = await supabase
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
    if (inserted) {
      setMessages(prev => [...prev, inserted as Message]);
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    refresh: fetchMessages,
  };
}
