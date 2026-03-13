import * as Notifications from 'expo-notifications';
import { router, Stack } from "expo-router";
import { useEffect } from "react";
import { AuthProvider } from "../lib/AuthContext";

function NotificationHandler() {
  useEffect(() => {
    // Handle notification tap when app is foregrounded or backgrounded
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, any>;

      if (!data?.type) return;

      switch (data.type) {
        case 'matchmaker_request':
        case 'intro_accepted':
        case 'intro_rejected':
        case 'continuation_choice':
          router.push('/(tabs)/connect');
          break;
        case 'suggestion':
          router.push('/(tabs)/connect');
          break;
        case 'info_request':
          router.push('/(tabs)/connect');
          break;
        case 'profile_approved':
        case 'profile_rejected':
          router.push('/(tabs)/profile');
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
  );
}
