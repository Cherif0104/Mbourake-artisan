import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import type { MainStackParamList } from '../navigation/MainStack';

const WEB_APP_URL = process.env.WEB_APP_URL || 'https://mbourake.vercel.app';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Profile'>;
};

export default function ProfileScreen({ navigation }: Props) {
  const { user, session, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const openEditProfileWeb = useCallback(() => {
    const url = `${WEB_APP_URL}/edit-profile`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Erreur', 'Impossible d\'ouvrir la page.'),
    );
  }, []);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Supprimer mon compte',
      'Êtes-vous sûr de vouloir supprimer définitivement votre compte et toutes les données liées à cette adresse email ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            if (!session?.access_token || !supabase) {
              Alert.alert('Erreur', 'Session expirée. Veuillez vous reconnecter.');
              return;
            }
            setDeleting(true);
            try {
              const { data, error } = await supabase.functions.invoke(
                'delete-my-account',
                {
                  headers: { Authorization: `Bearer ${session.access_token}` },
                },
              );
              if (error) throw error;
              if (data?.error) throw new Error(data.error);
              await signOut();
              Alert.alert(
                'Compte supprimé',
                'Votre compte et toutes vos données ont été supprimés. Vous pouvez vous réinscrire à tout moment.',
                [{ text: 'OK' }],
              );
            } catch (err: unknown) {
              const msg =
                err instanceof Error ? err.message : 'Impossible de supprimer le compte.';
              Alert.alert('Erreur', msg);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [session?.access_token, signOut]);

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email ?? '—'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profil</Text>
        <Pressable
          onPress={openEditProfileWeb}
          style={({ pressed }) => [styles.linkButton, pressed && styles.linkButtonPressed]}
          disabled={deleting}
        >
          <Text style={styles.linkButtonText}>Modifier mon profil (version web)</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paramètres du compte</Text>
        <Text style={styles.warningText}>
          Cette action supprime définitivement votre compte, votre profil, vos projets et
          toutes les données liées. Elle est irréversible.
        </Text>
        <Pressable
          onPress={handleDeleteAccount}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deleteButtonPressed,
            deleting && styles.deleteButtonDisabled,
          ]}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.deleteButtonText}>
              Supprimer mon compte et toutes mes données
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 28,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
    color: '#0f172a',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  linkButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  linkButtonPressed: {
    opacity: 0.8,
  },
  linkButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0ea5e9',
  },
  warningText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 20,
  },
  deleteButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  deleteButtonPressed: {
    opacity: 0.9,
  },
  deleteButtonDisabled: {
    opacity: 0.7,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
