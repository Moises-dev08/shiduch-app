import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../lib/AuthContext';

const PENDING_PROFILE_DEEP_LINK_KEY = 'pendingProfileDeepLink';

/**
 * Entry point for the shiduchimapp://profile/<id> deep link.
 * Logged-in users go to the full profile. Guests get the public preview.
 */
export default function ProfileDeepLinkRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!id) {
      router.replace('/(tabs)');
      return;
    }

    if (!session) {
      router.replace(`/public-profile/${id}`);
      return;
    }

    AsyncStorage.removeItem(PENDING_PROFILE_DEEP_LINK_KEY).catch(() => {});
    router.replace({ pathname: '/profile-details', params: { profileId: id } });
  }, [loading, session, id]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#1293DA" />
    </View>
  );
}
