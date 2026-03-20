import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../lib/AuthContext';

/**
 * Entry point for the shiduchimapp://profile/<id> deep link.
 * Redirects to profile-details so privacy settings and the full UI are respected.
 * If the user is not logged in, sends them to the login screen first.
 */
export default function ProfileDeepLinkRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return; // wait for auth to resolve

    if (!session) {
      // Not logged in — go to login; after login the deep link won't re-fire,
      // but the user can search for the profile manually.
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
