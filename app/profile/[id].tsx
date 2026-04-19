import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../lib/AuthContext';

const PENDING_PROFILE_DEEP_LINK_KEY = 'pendingProfileDeepLink';

/**
 * Entry point for the shiduchimapp://profile/<id> deep link.
 * Redirects to profile-details so privacy settings and the full UI are respected.
 * If the user is not logged in, stashes the target id so navigation resumes
 * after they sign in (see PendingDeepLinkResumer in app/_layout.tsx).
 */
export default function ProfileDeepLinkRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return; // wait for auth to resolve

    if (!session) {
      if (id) {
        AsyncStorage.setItem(PENDING_PROFILE_DEEP_LINK_KEY, id).catch(() => {});
      }
      router.replace('/auth/login');
      return;
    }

    if (id) {
      router.replace({ pathname: '/profile-details', params: { profileId: id } });
    } else {
      router.replace('/(tabs)');
    }
  }, [loading, session, id]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#1293DA" />
    </View>
  );
}
