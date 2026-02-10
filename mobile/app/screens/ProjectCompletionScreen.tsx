import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList } from '../navigation/MainStack';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'ProjectCompletion'>;
  route: { params: { projectId: string } };
};

export default function ProjectCompletionScreen({ route }: Props) {
  const { projectId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clôture - Projet {projectId}</Text>
      <Text style={styles.placeholder}>Clôture et avis (à brancher sur shared).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  placeholder: { color: '#666' },
});
