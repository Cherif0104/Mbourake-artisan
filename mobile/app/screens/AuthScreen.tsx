import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import type { AuthStackParamList } from '../navigation/AuthStack';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Auth'>;
  route: { params?: { mode?: 'login' | 'signup'; role?: string } };
};

export default function AuthScreen({ navigation, route }: Props) {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isSignup = route.params?.mode === 'signup';

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Erreur', 'Email et mot de passe requis.');
      return;
    }
    setLoading(true);
    try {
      if (isSignup) await signUp(email.trim(), password);
      else await signIn(email.trim(), password);
    } catch (e: unknown) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    navigation.setParams({ mode: isSignup ? 'login' : 'signup' });
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Adresse email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />
      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <Button title={isSignup ? 'Créer mon compte' : 'Se connecter'} onPress={submit} />
      )}
      <Pressable onPress={switchMode} style={styles.switchLink} disabled={loading}>
        <Text style={styles.switchText}>
          {isSignup
            ? 'Déjà un compte ? Se connecter'
            : 'Pas encore de compte ? S\'inscrire'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  input: { borderWidth: 1, padding: 12, marginBottom: 12, borderRadius: 8 },
  loader: { marginTop: 16 },
  switchLink: { marginTop: 24, alignItems: 'center' },
  switchText: { fontSize: 14, color: '#0ea5e9' },
});
