import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import type { MainStackParamList } from '../navigation/MainStack';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Dashboard'>;
};

export default function DashboardScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tableau de bord</Text>
      <Text style={styles.email}>{user?.email ?? '—'}</Text>
      <Button title="Mes projets" onPress={() => navigation.navigate('ProjectList')} />
      <View style={styles.spacer} />
      <Button title="Déconnexion" onPress={() => signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  email: { marginBottom: 24 },
  spacer: { flex: 1 },
});
