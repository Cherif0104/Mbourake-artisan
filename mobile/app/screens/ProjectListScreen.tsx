import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Button, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getClientProjects } from '../../../shared';
import { supabase } from '../../config/supabase';
import type { MainStackParamList } from '../navigation/MainStack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = { navigation: NativeStackNavigationProp<MainStackParamList, 'ProjectList'> };

type ProjectItem = { id: string; title: string | null; project_number: string | null; status: string | null };

export default function ProjectListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase || !user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getClientProjects(supabase, user.id);
      setProjects((data ?? []) as ProjectItem[]);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <ActivityIndicator size="large" style={styles.centered} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('ProjectDetails', { projectId: item.id })}
          >
            <Text style={styles.title}>{item.title ?? item.project_number ?? item.id}</Text>
            <Text style={styles.status}>{item.status ?? '—'}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aucun projet</Text>}
      />
      <Button title="Rafraîchir" onPress={load} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center' },
  row: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontWeight: '600' },
  status: { fontSize: 12, color: '#666', marginTop: 4 },
  empty: { textAlign: 'center', padding: 24, color: '#666' },
});
