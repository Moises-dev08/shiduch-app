import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { router, Stack } from "expo-router";
import { useEffect, useRef } from "react";
import { Linking, Platform } from "react-native";
import { AuthProvider, useAuth } from "../lib/AuthContext";
import { extractProfileIdFromShareUrl } from "../lib/profileShareUrls";
import { getNavigationTarget } from "../lib/notificationRoutes";
import { isNativePushNotificationsSupported } from "../lib/pushNotificationsPlatform";
import { supabase } from "../lib/supabase";
import { WebAppShell } from "../components/WebAppShell";

const PENDING_PROFILE_DEEP_LINK_KEY = 'pendingProfileDeepLink';

// Keep splash visible until we explicitly hide it (native only; web overlay blocks input)
if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,   // 2 minutes — data is fresh, no background refetch
      gcTime: 10 * 60 * 1000,     // 10 minutes — keep unused cache in memory
      retry: 0,
    },
  },
});

/** Push payloads use the same routing table as NotificationPanel (+ title/body for type disambiguation). */
function pathFromPushContent(content: Notifications.NotificationContent): string | null {
  const data = content.data as Record<string, any>;
  if (!data?.type || typeof data.type !== "string") return null;
  const title =
    typeof content.title === "string"
      ? content.title
      : content.title != null
        ? String(content.title)
        : "";
  const body =
    typeof content.body === "string"
      ? content.body
      : content.body != null
        ? String(content.body)
        : "";
  return getNavigationTarget(data.type, data, { title, body });
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
    if (!isNativePushNotificationsSupported) return;

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      coldStartId.current = response.notification.request.identifier;
      const content = response.notification.request.content;
      const data = content.data as Record<string, any>;
      if (!data?.type) return;
      bustCacheForNotification(data);
      const path = pathFromPushContent(content);
      if (path) pendingPath.current = path;
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
    if (!isNativePushNotificationsSupported) return;

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      // Skip the cold-start tap — already handled by the effect above
      if (response.notification.request.identifier === coldStartId.current) return;

      const content = response.notification.request.content;
      const data = content.data as Record<string, any>;
      if (!data?.type) return;

      bustCacheForNotification(data);
      const path = pathFromPushContent(content);
      if (path) {
        try {
          router.push(path as any);
        } catch {}
      }
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
    return;
  }

  // Shared profile: https://www.zivugmishamayim.com/profile/<id> or shiduchimapp://profile/<id>
  const profileId = extractProfileIdFromShareUrl(url);
  if (profileId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.replace({ pathname: '/profile-details', params: { profileId } });
    } else {
      router.replace(`/public-profile/${profileId}`);
    }
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

// When the user signs in after tapping a share link, resume navigation to the
// target profile that was stashed in AsyncStorage.
function PendingDeepLinkResumer() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event !== 'SIGNED_IN') return;
      try {
        const pendingId = await AsyncStorage.getItem(PENDING_PROFILE_DEEP_LINK_KEY);
        if (pendingId) {
          await AsyncStorage.removeItem(PENDING_PROFILE_DEEP_LINK_KEY);
          router.replace({ pathname: '/profile-details', params: { profileId: pendingId } });
        }
      } catch {}
    });
    return () => subscription.unsubscribe();
  }, []);
  return null;
}

// Hides the splash screen as soon as the auth session check completes
function SplashController() {
  const { loading } = useAuth();
  useEffect(() => {
    if (Platform.OS === "web" || !loading) {
      SplashScreen.hideAsync().catch(() => {});
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
      <PendingDeepLinkResumer />
      <WebAppShell>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="admin" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="filters" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="public-profile/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="profile-details" options={{ headerShown: false }} />
        </Stack>
      </WebAppShell>
    </AuthProvider>
    </QueryClientProvider>
  );
}
