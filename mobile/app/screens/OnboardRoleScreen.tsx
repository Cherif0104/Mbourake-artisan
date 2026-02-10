import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import type { AuthStackParamList } from '../navigation/AuthStack';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'OnboardRole'>;
};

export default function OnboardRoleScreen({ navigation }: Props) {
  const [role, setRole] = useState<'client' | 'artisan' | null>(null);

  const goToAuth = (mode: 'login' | 'signup') => {
    navigation.navigate('Auth', { mode, role: role ?? undefined });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mbourake</Text>
      <Text style={styles.subtitle}>Choisissez votre profil</Text>
      <View style={styles.buttons}>
        <Button title="Client" onPress={() => setRole('client')} />
        <Button title="Artisan" onPress={() => setRole('artisan')} />
      </View>
      <View style={styles.authButtons}>
        <Button title="Connexion" onPress={() => goToAuth('login')} />
        <Button title="Inscription" onPress={() => goToAuth('signup')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
  buttons: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
  authButtons: { gap: 12 },
});
