import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';
import { notifyNewMessage } from '../lib/notificationService';

export type Message = Database['public']['Tables']['messages']['Row'];

export function useMessages(projectId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setMessages(data);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchMessages();

    // Subscribe to new messages
    if (!projectId) return;
    const channel = supabase
      .channel(`project-messages-${projectId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `project_id=eq.${projectId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchMessages]);

  const sendMessage = async (data: {
    project_id: string;
    sender_id: string;
    content?: string;
    audio_url?: string;
    type: 'text' | 'audio' | 'image';
  }) => {
    const { error } = await supabase
      .from('messages')
      .insert({
        project_id: data.project_id,
        sender_id: data.sender_id,
        content: data.content,
        audio_url: data.audio_url,
        type: data.type,
      });
    
    if (error) throw error;
  };

  return {
    messages,
    loading,
    sendMessage,
    refresh: fetchMessages,
  };
}
