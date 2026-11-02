import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { Tabs, usePathname } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Alert, AppState, Platform, type ViewStyle } from "react-native";
import { useNotificationCount } from "../../hooks/useNotificationCount";
import { profileService } from "../../lib/profileService";
import { supabase } from "../../lib/supabase";

/** Same key as profile.tsx / connect.tsx so tab gating never lags behind cached profile. */
const MY_PROFILE_QUERY_KEY = ["my_profile"] as const;

/**
 * Android Chrome draws the page under the gesture bar. Keep the 49px icon row
 * and let the bar grow by the safe-area inset so Home / Connect / Donations /
 * Profile stay above that bar. With a 0 inset this is still 64px tall.
 */
const webTabBarStyle = {
  paddingBottom: "max(15px, env(safe-area-inset-bottom, 0px))",
  height: "calc(49px + max(15px, env(safe-area-inset-bottom, 0px)))",
  flexShrink: 0,
  zIndex: 2,
} as ViewStyle;

function tabIconColor(color: unknown, disabled: boolean): string {
  if (disabled) return "#ccc";
  return typeof color === "string" ? color : "#999";
}

export default function TabLayout() {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const { counts, refresh: refreshNotifications } = useNotificationCount();

  const prevStatusRef = useRef<"pending" | "approved" | "rejected" | null>(null);

  const profileQuery = useQuery({
    queryKey: MY_PROFILE_QUERY_KEY,
    queryFn: () => profileService.getProfile(),
    staleTime: 5 * 60 * 1000,
  });

  const profile = profileQuery.data?.success
    ? profileQuery.data.profile
    : undefined;
  const hasProfile = !!profile;
  const profileStatus = profile?.status ?? null;

  // When moderation status flips to approved, match previous getProfileStatus-only behavior.
  useEffect(() => {
    const s = profile?.status ?? null;
    const prev = prevStatusRef.current;
    if (
      prev &&
      prev !== "approved" &&
      s === "approved"
    ) {
      Alert.alert(
        "Profile Approved!",
        "Your profile has been approved! You now have access to all features.",
        [{ text: "Great!" }]
      );
      refreshNotifications();
    }
    prevStatusRef.current = s;
  }, [profile?.status, refreshNotifications]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Foreground refresh (same triggers as before).
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        queryClient.invalidateQueries({ queryKey: MY_PROFILE_QUERY_KEY });
        refreshNotifications();
      }
    });
    return () => sub.remove();
  }, [queryClient, refreshNotifications]);

  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  useEffect(() => {
    let profileChannel: string | null = null;
    let notifChannel: string | null = null;

    const setup = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      profileChannel = `profile-status-${user.id}`;
      supabase
        .channel(profileChannel)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            queryClientRef.current.invalidateQueries({
              queryKey: MY_PROFILE_QUERY_KEY,
            });
          }
        )
        .subscribe();

      notifChannel = `admin-notif-status-${user.id}`;
      supabase
        .channel(notifChannel)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications" },
          (payload) => {
            const rowUserId = (payload.new as { user_id?: string })?.user_id;
            if (!rowUserId || rowUserId === user.id) {
              queryClientRef.current.invalidateQueries({
                queryKey: MY_PROFILE_QUERY_KEY,
              });
            }
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      [profileChannel, notifChannel].forEach((name) => {
        if (!name) return;
        const ch = supabase
          .getChannels()
          .find((c) => c.topic === `realtime:${name}`);
        if (ch) supabase.removeChannel(ch);
      });
    };
  }, []);

  const isConnectTabActive = pathname === "/connect";

  const handleTabPress = (tabName: string) => {
    // Avoid false “no profile” while the shared query hasn't settled (or isolated getProfileStatus failed before).
    if (profileQuery.isPending) {
      return true;
    }

    // If the profile query failed, don't block as if the user never created a profile.
    if (profileQuery.isError) {
      return true;
    }

    if (!hasProfile && tabName !== "profile") {
      Alert.alert(
        "Create Your Profile",
        "Please create your profile first before accessing other features.",
        [{ text: "OK" }]
      );
      return false;
    }

    if (profileStatus !== "approved" && tabName !== "profile") {
      const message =
        profileStatus === "pending"
          ? "Your profile is currently under review. You can only access the Profile tab until your profile is approved."
          : profileStatus === "rejected"
            ? "Your profile needs attention. Please update your profile in the Profile tab."
            : "Please complete your profile setup first.";

      Alert.alert(
        profileStatus === "pending"
          ? "Profile Under Review"
          : "Profile Incomplete",
        message,
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  const isTabDisabled = !hasProfile || profileStatus !== "approved";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarActiveTintColor: "#1293DA",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e0e0e0",
          ...(Platform.OS === "web" ? webTabBarStyle : {}),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="home"
              size={size}
              color={tabIconColor(color, isTabDisabled)}
            />
          ),
          tabBarLabelStyle: isTabDisabled ? { color: "#ccc" } : {},
        }}
        listeners={{
          tabPress: (e) => {
            if (!handleTabPress("index")) {
              e.preventDefault();
            }
          },
        }}
      />

      <Tabs.Screen
        name="connect"
        options={{
          title: "Connect",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="heart"
              size={size}
              color={tabIconColor(color, isTabDisabled)}
            />
          ),
          tabBarLabelStyle: isTabDisabled ? { color: "#ccc" } : {},
          tabBarBadge:
            !isConnectTabActive && counts.total > 0
              ? counts.total
              : undefined,
        }}
        listeners={{
          tabPress: (e) => {
            if (!handleTabPress("connect")) {
              e.preventDefault();
            } else {
              refreshNotifications();
            }
          },
        }}
      />

      <Tabs.Screen
        name="donations"
        options={{
          title: "Donations",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5
              name="donate"
              size={size - 2}
              color={tabIconColor(color, isTabDisabled)}
            />
          ),
          tabBarLabelStyle: isTabDisabled ? { color: "#ccc" } : {},
        }}
        listeners={{
          tabPress: (e) => {
            if (!handleTabPress("donations")) {
              e.preventDefault();
            }
          },
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={tabIconColor(color, false)} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
