import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getVisibleProfileImageUrl } from '../../lib/profilePictureVisibility';
import { supabase } from '../../lib/supabase';
import { calculateAge } from '../../lib/utils';

interface PublicProfileData {
  id: string;
  first_name: string;
  last_name: string;
  bio?: string | null;
  dob?: string | null;
  gender?: string | null;
  role?: string | null;
  hashkafa_type?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  location_country?: string | null;
  pictures?: string[] | null;
  picture_privacy?: string | null;
  status?: string | null;
}

export default function PublicProfileScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async (): Promise<void> => {
      if (!id) {
        setError('Profile not found');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select(
          'id, first_name, last_name, bio, dob, gender, role, hashkafa_type, location_city, location_state, location_country, pictures, picture_privacy, status'
        )
        .eq('id', id)
        .eq('status', 'approved')
        .maybeSingle();

      if (fetchError || !data) {
        setError('This profile is not available');
        setLoading(false);
        return;
      }

      setProfile(data as PublicProfileData);
      setLoading(false);
    };

    void load();
  }, [id]);

  const goJoin = (): void => {
    if (id) {
      AsyncStorage.setItem('pendingProfileDeepLink', id).catch(() => {});
    }
    router.push('/auth/signup');
  };

  const goLogin = (): void => {
    if (id) {
      AsyncStorage.setItem('pendingProfileDeepLink', id).catch(() => {});
    }
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1293DA" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="person-outline" size={64} color="#ccc" />
          <Text style={styles.errorTitle}>{error || 'Profile not found'}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={goJoin}>
            <Text style={styles.primaryButtonText}>Join Zivug Mishamayim</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const imageUrl = getVisibleProfileImageUrl(profile);
  const age = profile.dob ? calculateAge(profile.dob) : null;
  const location = [profile.location_city, profile.location_state, profile.location_country]
    .filter(Boolean)
    .join(', ');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile preview</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Ionicons name="person" size={64} color="#ccc" />
            </View>
          )}

          <Text style={styles.name}>
            {profile.first_name} {profile.last_name}
          </Text>
          <Text style={styles.meta}>
            {[age ? `${age}` : null, profile.gender, profile.hashkafa_type]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {!!location && <Text style={styles.location}>{location}</Text>}
          {!!profile.bio && (
            <Text style={styles.bio} numberOfLines={6}>
              {profile.bio}
            </Text>
          )}
        </View>

        <View style={styles.joinCard}>
          <Text style={styles.joinTitle}>Want to connect?</Text>
          <Text style={styles.joinBody}>
            Create a free account to set up matches, ask for info, and message through the app.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={goJoin}>
            <Text style={styles.primaryButtonText}>Join</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={goLogin}>
            <Text style={styles.secondaryButtonText}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  photo: {
    width: 160,
    height: 160,
    borderRadius: 80,
    marginBottom: 16,
    backgroundColor: '#eee',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
  },
  meta: {
    marginTop: 6,
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  location: {
    marginTop: 4,
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  bio: {
    marginTop: 16,
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    textAlign: 'center',
  },
  joinCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  joinTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  joinBody: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#1293DA',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1293DA',
    fontSize: 15,
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
});
