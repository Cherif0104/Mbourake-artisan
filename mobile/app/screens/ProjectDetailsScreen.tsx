import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import type { MainStackParamList } from '../navigation/MainStack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'ProjectDetails'>;
  route: { params: { projectId: string } };
};

export default function ProjectDetailsScreen({ navigation, route }: Props) {
  const { projectId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Projet {projectId}</Text>
      <Button title="Paiement" onPress={() => navigation.navigate('ProjectPayment', { projectId })} />
      <Button title="Travaux" onPress={() => navigation.navigate('ProjectWork', { projectId })} />
      <Button title="Clôture" onPress={() => navigation.navigate('ProjectCompletion', { projectId })} />
      <Button title="Chat" onPress={() => navigation.navigate('Chat', { projectId })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
});
