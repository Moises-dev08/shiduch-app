import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router, Stack } from "expo-router";
import { useEffect } from "react";
import { AuthProvider } from "../lib/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,   // 2 minutes — data is fresh, no background refetch
      gcTime: 10 * 60 * 1000,     // 10 minutes — keep unused cache in memory
      retry: 1,
    },
  },
});

function NotificationHandler() {
  useEffect(() => {
    // Handle notification tap when app is foregrounded or backgrounded
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, any>;

      if (!data?.type) return;

      switch (data.type) {
        case 'profile_approved':
        case 'profile_rejected':
          router.push('/(tabs)/profile');
          break;
        // All connect-tab events (explicit for clarity)
        case 'matchmaker_request':
        case 'matchmaker_responded':
        case 'matchmaker_selected':
        case 'intro_request_from_matchmaker':
        case 'intro_accepted':
        case 'intro_rejected':
        case 'match_accepted':
        case 'requested_responded':
        case 'continuation_choice':
        case 'suggestion':
        case 'suggestion_rejected':
        case 'suggestion_reverted':
        case 'suggestion_both_accepted':
        case 'info_request':
        case 'info_request_approved':
        case 'info_request_declined':
        case 'engagement_proposal':
        case 'engagement_confirmed':
        case 'engagement_confirmed_admin':
          router.push('/(tabs)/connect');
          break;
        default:
          router.push('/(tabs)/connect');
      }
    });

    return () => subscription.remove();
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NotificationHandler />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="filters" options={{ headerShown: false }} />
        <Stack.Screen name="profile/[id]" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
    </QueryClientProvider>
  );
}
