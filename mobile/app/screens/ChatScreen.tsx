import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { fetchMessages, sendMessage, subscribeMessages, type MessageRow } from '../../../shared';
import { supabase } from '../../config/supabase';
import type { MainStackParamList } from '../navigation/MainStack';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Chat'>;
  route: { params: { projectId: string } };
};

export default function ChatScreen({ route }: Props) {
  const { projectId } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchMessages(supabase, projectId);
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!supabase) return;
    const unsub = subscribeMessages(supabase, projectId, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    return unsub;
  }, [projectId]);

  const onSend = async () => {
    if (!supabase || !user?.id || !input.trim()) return;
    try {
      const sent = await sendMessage(supabase, {
        project_id: projectId,
        sender_id: user.id,
        content: input.trim(),
        type: 'text',
      });
      setMessages((prev) => [...prev, sent]);
      setInput('');
    } catch {}
  };

  if (loading) return <ActivityIndicator size="large" style={styles.centered} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.bubble}>
            <Text style={styles.content}>{item.content ?? '—'}</Text>
          </View>
        )}
      />
      <View style={styles.footer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message..."
        />
        <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
          <Text style={styles.sendText}>Envoyer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center' },
  bubble: { padding: 12, margin: 8, backgroundColor: '#e8e8e8', borderRadius: 12 },
  content: {},
  footer: { flexDirection: 'row', padding: 8, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, borderWidth: 1, padding: 10, marginRight: 8, borderRadius: 8 },
  sendBtn: { padding: 10, backgroundColor: '#007AFF' },
  sendText: { color: '#fff', fontWeight: '600' },
});
