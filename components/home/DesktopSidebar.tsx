import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface DesktopSidebarProps {
  profileCount: number;
  visibleCount: number;
  activeFiltersCount: number;
  onOpenFilters: () => void;
  currentUserProfile?: {
    role?: string;
    gender?: string;
  } | null;
}

/**
 * Desktop sidebar for the home screen showing stats and quick actions.
 * Only renders on desktop; hidden on mobile/tablet.
 */
export function DesktopSidebar({
  profileCount,
  visibleCount,
  activeFiltersCount,
  onOpenFilters,
  currentUserProfile,
}: DesktopSidebarProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      {/* Stats Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="stats-chart" size={20} color="#1293DA" />
          <Text style={styles.cardTitle}>Browse stats</Text>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profileCount}</Text>
            <Text style={styles.statLabel}>Total profiles</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{visibleCount}</Text>
            <Text style={styles.statLabel}>Showing</Text>
          </View>
        </View>
        {activeFiltersCount > 0 && (
          <View style={styles.filterInfo}>
            <Ionicons name="funnel" size={14} color="#666" />
            <Text style={styles.filterInfoText}>
              {activeFiltersCount} filter{activeFiltersCount !== 1 ? "s" : ""} active
            </Text>
          </View>
        )}
      </View>

      {/* Quick Filters */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="funnel-outline" size={20} color="#1293DA" />
          <Text style={styles.cardTitle}>Quick filters</Text>
        </View>
        <TouchableOpacity style={styles.actionButton} onPress={onOpenFilters}>
          <Ionicons name="options" size={18} color="#1293DA" />
          <Text style={styles.actionButtonText}>Open filters</Text>
          <Ionicons name="chevron-forward" size={16} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="flash-outline" size={20} color="#1293DA" />
          <Text style={styles.cardTitle}>Quick actions</Text>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/successful-matches")}
        >
          <Text style={styles.actionEmoji}>🎉</Text>
          <Text style={styles.actionButtonText}>Success stories</Text>
          <Ionicons name="chevron-forward" size={16} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/(tabs)/profile")}
        >
          <Ionicons name="person-outline" size={18} color="#666" />
          <Text style={styles.actionButtonText}>My profile</Text>
          <Ionicons name="chevron-forward" size={16} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/(tabs)/connect")}
        >
          <Ionicons name="people-outline" size={18} color="#666" />
          <Text style={styles.actionButtonText}>Connections</Text>
          <Ionicons name="chevron-forward" size={16} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Tips Card */}
      <View style={[styles.card, styles.tipCard]}>
        <View style={styles.tipHeader}>
          <Ionicons name="bulb" size={18} color="#DAA520" />
          <Text style={styles.tipTitle}>Tip</Text>
        </View>
        <Text style={styles.tipText}>
          Complete your profile to get better matches and increase your visibility!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 280,
    gap: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1293DA",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#e0e0e0",
  },
  filterInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  filterInfoText: {
    fontSize: 13,
    color: "#666",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  actionEmoji: {
    fontSize: 18,
  },
  tipCard: {
    backgroundColor: "#FFFBF0",
    borderWidth: 1,
    borderColor: "#DAA520",
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DAA520",
  },
  tipText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
});
