import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { router, Stack } from "expo-router";
import { useEffect, useRef } from "react";
import { Linking } from "react-native";
import { AuthProvider, useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";

// Keep splash visible until we explicitly hide it
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,   // 2 minutes — data is fresh, no background refetch
      gcTime: 10 * 60 * 1000,     // 10 minutes — keep unused cache in memory
      retry: 1,
    },
  },
});

// Maps a notification data payload to the route the user should land on.
function getNotificationPath(data: Record<string, any>): string {
  switch (data.type) {
    case 'profile_approved':
    case 'profile_rejected':
    case 'profile_update_approved':
    case 'profile_update_rejected':
      return '/(tabs)/profile';
    case 'matchmaker_request':
    case 'matchmaker_responded':
    case 'matchmaker_selected':
    case 'intro_request_from_matchmaker':
      return '/(tabs)/connect?category=for_others&forOthersSection=awaiting';
    case 'info_request_approved':
    case 'info_request_declined':
      if (data.requestedProfileId) {
        return `/profile-details?profileId=${data.requestedProfileId}`;
      }
      return '/(tabs)/connect';
    case 'engagement_news':
      return '/successful-matches';
    case 'engagement_proposal':
    case 'engagement_confirmed':
    case 'engagement_confirmed_admin':
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
    default:
      return '/(tabs)/connect';
  }
}

function NotificationHandler() {
  const { session, loading } = useAuth();
  const queryClient = useQueryClient();
  // Path queued from a cold-start notification tap (app was killed)
  const pendingPath = useRef<string | null>(null);
  // Identifier of the cold-start response so we don't navigate twice
  const coldStartId = useRef<string | null>(null);

  // Bust any stale cache that must be fresh before we navigate
  const bustCacheForNotification = (data: Record<string, any>) => {
    const type = data?.type as string | undefined;
    if (
      (type === 'info_request_approved' || type === 'info_request_declined') &&
      data?.requestedProfileId
    ) {
      queryClient.invalidateQueries({
        queryKey: ['profile_details', data.requestedProfileId],
      });
      queryClient.invalidateQueries({ queryKey: ['info_requests'] });
    }
  };

  // ── Cold-start: capture notification that launched the app from killed state ──
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      coldStartId.current = response.notification.request.identifier;
      const data = response.notification.request.content.data as Record<string, any>;
      if (!data?.type) return;
      bustCacheForNotification(data);
      pendingPath.current = getNotificationPath(data);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Execute the queued cold-start navigation once auth + router are ready ──
  useEffect(() => {
    if (loading || !session || !pendingPath.current) return;
    const path = pendingPath.current;
    pendingPath.current = null;
    // Small delay ensures the navigator stack is fully mounted before pushing
    const timer = setTimeout(() => {
      try { router.push(path as any); } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [loading, session]);

  // ── Foreground / background taps (app already running) ───────────────────
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      // Skip the cold-start tap — already handled by the effect above
      if (response.notification.request.identifier === coldStartId.current) return;

      const data = response.notification.request.content.data as Record<string, any>;
      if (!data?.type) return;

      bustCacheForNotification(data);
      try {
        router.push(getNotificationPath(data) as any);
      } catch {}
    });

    return () => subscription.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// Parses both hash (#key=val) and query (?key=val) params from a deep link URL
function parseDeepLinkParams(url: string): Record<string, string> {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const params: Record<string, string> = {};

  if (hashIndex !== -1) {
    new URLSearchParams(url.slice(hashIndex + 1)).forEach((v, k) => { params[k] = v; });
  }
  if (queryIndex !== -1) {
    const end = hashIndex !== -1 ? hashIndex : undefined;
    new URLSearchParams(url.slice(queryIndex + 1, end)).forEach((v, k) => { params[k] = v; });
  }
  return params;
}

async function handleDeepLink(url: string) {
  const params = parseDeepLinkParams(url);
  if (params.type === 'recovery' && params.access_token && params.refresh_token) {
    await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    router.replace('/auth/reset-password');
  }
}

// Clears the entire React Query cache when the user signs out so the next
// user never sees stale data from the previous session.
function CacheClearer() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  return null;
}

// Hides the splash screen as soon as the auth session check completes
function SplashController() {
  const { loading } = useAuth();
  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);
  return null;
}

function PasswordResetHandler() {
  useEffect(() => {
    // App opened from closed state via deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // App already open and receives a deep link
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, []);
  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CacheClearer />
      <SplashController />
      <NotificationHandler />
      <PasswordResetHandler />
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
