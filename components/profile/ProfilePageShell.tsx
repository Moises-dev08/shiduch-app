import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useResponsiveLayout } from "../../hooks/useResponsiveLayout";

interface ProfilePageShellProps {
  children: React.ReactNode;
  profileStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  onShare?: () => void;
  isSharing?: boolean;
  showStatusBanner?: boolean;
}

/**
 * Desktop-optimized shell for profile page with status banner and sidebar.
 * Mobile: full-width content.
 * Desktop: centered content with max-width and nice spacing.
 */
export function ProfilePageShell({
  children,
  profileStatus,
  rejectionReason,
  onShare,
  isSharing,
  showStatusBanner = false,
}: ProfilePageShellProps): React.JSX.Element {
  const { isDesktop } = useResponsiveLayout();

  const StatusBanner = () => {
    if (!showStatusBanner) return null;

    if (profileStatus === "pending") {
      return (
        <View style={styles.bannerPending}>
          <View style={styles.bannerContent}>
            <Ionicons name="time-outline" size={20} color="#F57C00" />
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Profile under review</Text>
              <Text style={styles.bannerDescription}>
                Your profile is being reviewed by our team. This usually takes 24-48 hours.
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (profileStatus === "rejected") {
      return (
        <View style={styles.bannerRejected}>
          <View style={styles.bannerContent}>
            <Ionicons name="alert-circle-outline" size={20} color="#D32F2F" />
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Profile needs attention</Text>
              <Text style={styles.bannerDescription}>
                {rejectionReason || "Please review and update your profile."}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (profileStatus === "approved" && onShare) {
      return (
        <View style={styles.bannerApproved}>
          <View style={styles.bannerContent}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#388E3C" />
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Profile approved!</Text>
              <Text style={styles.bannerDescription}>
                Your profile is live and visible to the community.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={onShare}
            disabled={isSharing}
          >
            {isSharing ? (
              <Text style={styles.shareButtonText}>Sharing...</Text>
            ) : (
              <>
                <Ionicons name="share-social-outline" size={16} color="#fff" />
                <Text style={styles.shareButtonText}>Share</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  if (!isDesktop) {
    return (
      <>
        <StatusBanner />
        {children}
      </>
    );
  }

  return (
    <ScrollView 
      style={styles.desktopContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBanner />
      <View style={styles.desktopContent}>
        <View style={styles.desktopMain}>
          {children}
        </View>
        {/* Desktop sidebar with tips */}
        <View style={styles.desktopSidebar}>
          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Ionicons name="bulb-outline" size={20} color="#1293DA" />
              <Text style={styles.tipTitle}>Profile tips</Text>
            </View>
            <View style={styles.tipList}>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#388E3C" />
                <Text style={styles.tipText}>
                  Add a clear, recent photo to increase views by 80%
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#388E3C" />
                <Text style={styles.tipText}>
                  Complete all sections for better match recommendations
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#388E3C" />
                <Text style={styles.tipText}>
                  Be authentic - honesty helps find the right match
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#388E3C" />
                <Text style={styles.tipText}>
                  Review your profile regularly to keep it up to date
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.privacyCard}>
            <View style={styles.privacyHeader}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#388E3C" />
              <Text style={styles.privacyTitle}>Privacy & safety</Text>
            </View>
            <Text style={styles.privacyText}>
              Your contact information is never shared publicly. Only approved users can
              view your profile.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
  },
  desktopContent: {
    flexDirection: "row",
    gap: 24,
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 32,
  },
  desktopMain: {
    flex: 1,
    maxWidth: 800,
  },
  desktopSidebar: {
    width: 320,
    gap: 16,
  },

  // Status banners
  bannerPending: {
    backgroundColor: "#FFF3E0",
    borderLeftWidth: 4,
    borderLeftColor: "#F57C00",
    padding: 16,
    marginBottom: 16,
  },
  bannerApproved: {
    backgroundColor: "#E8F5E9",
    borderLeftWidth: 4,
    borderLeftColor: "#388E3C",
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerRejected: {
    backgroundColor: "#FFEBEE",
    borderLeftWidth: 4,
    borderLeftColor: "#D32F2F",
    padding: 16,
    marginBottom: 16,
  },
  bannerContent: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  bannerDescription: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1293DA",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  shareButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Sidebar cards
  tipCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  tipList: {
    gap: 14,
  },
  tipItem: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  privacyCard: {
    backgroundColor: "#F1F8F4",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  privacyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  privacyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  privacyText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
});
