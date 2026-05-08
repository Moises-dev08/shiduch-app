import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { adminService } from "../lib/adminService";
import { useAuth } from "../lib/AuthContext";
import { profileService } from "../lib/profileService";

/**
 * Post-splash bootstrap: resolves admin vs profile and replaces the route.
 * Keeps a branded loading surface until navigation runs so users never see a blank screen.
 */
export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const [routePending, setRoutePending] = useState(true);
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    setRoutePending(true);
    setRouteError(null);

    const checkUserStatus = async () => {
      try {
        if (!session) {
          router.replace("/auth/login");
          return;
        }

        const isAdmin = await adminService.isAdmin();
        if (cancelled) return;

        if (isAdmin) {
          router.replace("/admin/dashboard");
          return;
        }

        // Supabase session can take a moment to propagate right after login,
        // which causes getProfile() to return { success: false } briefly.
        // Retry up to 4 times (2 s total) so we are certain about the profile
        // state before navigating — the splash screen stays visible the whole time.
        let profileResult = await profileService.getProfile();
        if (cancelled) return;

        let attempts = 0;
        while (!profileResult.success && attempts < 4) {
          await new Promise((r) => setTimeout(r, 500));
          if (cancelled) return;
          profileResult = await profileService.getProfile();
          if (cancelled) return;
          attempts++;
        }

        if (profileResult.success && profileResult.profile) {
          if (profileResult.profile.status === "approved") {
            router.replace("/(tabs)");
          } else {
            router.replace("/(tabs)/profile");
          }
        } else {
          // success with no profile row (PGRST116) OR all retries exhausted —
          // go to the profile tab so the user can create / retry there
          router.replace("/(tabs)/profile");
        }
      } catch (e) {
        console.error("Index bootstrap error:", e);
        if (!cancelled) {
          setRouteError("Something went wrong while starting the app.");
          setRoutePending(false);
        }
      }
    };

    checkUserStatus();

    return () => {
      cancelled = true;
    };
  }, [session, authLoading]);

  if (authLoading || routePending) {
    return (
      <LinearGradient
        colors={["#7ACDF5", "#1293DA", "#0d3b8e"]}
        locations={[0, 0.45, 1]}
        style={styles.gradient}
      >
        <View style={styles.center}>
          <Image
            source={require("../logo-original.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <ActivityIndicator
            size="large"
            color="#fff"
            style={styles.spinner}
          />
        </View>
      </LinearGradient>
    );
  }

  if (routeError) {
    return (
      <LinearGradient
        colors={["#7ACDF5", "#1293DA", "#0d3b8e"]}
        locations={[0, 0.45, 1]}
        style={styles.gradient}
      >
        <View style={styles.center}>
          <Text style={styles.errorText}>{routeError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.replace("/auth/login")}
            activeOpacity={0.85}
          >
            <Text style={styles.retryLabel}>Go to login</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  logo: {
    width: 220,
    height: 200,
    marginBottom: 28,
  },
  spinner: {
    marginTop: 8,
  },
  errorText: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#FEE706",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  retryLabel: {
    color: "#282828",
    fontSize: 16,
    fontWeight: "700",
  },
});
