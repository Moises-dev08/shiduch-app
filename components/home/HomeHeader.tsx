import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppTextInput } from "../AppTextInput";

interface HomeHeaderProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  unreadCount: number;
  onNotificationPress: () => void;
  onFilterPress: () => void;
  isDesktop?: boolean;
}

/**
 * Responsive header for the home screen.
 * Desktop: expanded layout with inline search and actions.
 * Mobile: compact layout.
 */
export function HomeHeader({
  searchQuery,
  onSearchChange,
  unreadCount,
  onNotificationPress,
  onFilterPress,
  isDesktop = false,
}: HomeHeaderProps): React.JSX.Element {
  if (isDesktop) {
    return (
      <View style={styles.desktopHeader}>
        <View style={styles.desktopTitleRow}>
          <View>
            <Text style={styles.desktopTitle}>Discover</Text>
            <Text style={styles.desktopSubtitle}>
              Find your perfect match from our community
            </Text>
          </View>
          <View style={styles.desktopActions}>
            <TouchableOpacity
              style={styles.desktopSuccessButton}
              onPress={() => router.push("/successful-matches")}
            >
              <Text style={styles.successEmoji}>🎉</Text>
              <Text style={styles.desktopSuccessText}>Success stories</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.desktopNotifButton}
              onPress={onNotificationPress}
            >
              <Ionicons
                name={unreadCount > 0 ? "notifications" : "notifications-outline"}
                size={22}
                color="#333"
              />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.desktopSearchRow}>
          <View style={styles.desktopSearchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <AppTextInput
              style={styles.desktopSearchInput}
              placeholder="Search by name, location, interests..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={onSearchChange}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => onSearchChange("")}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Mobile header
  return (
    <View style={styles.mobileHeader}>
      <View style={styles.mobileTop}>
        <Text style={styles.mobileTitle}>Discover</Text>
        <TouchableOpacity
          style={styles.successButton}
          onPress={() => router.push("/successful-matches")}
        >
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successText}>Success stories</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.notifButton} onPress={onNotificationPress}>
          <Ionicons
            name={unreadCount > 0 ? "notifications" : "notifications-outline"}
            size={24}
            color="#333"
          />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.mobileSearchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <AppTextInput
            style={styles.searchInput}
            placeholder="Search profiles..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={onSearchChange}
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={onFilterPress}>
          <Ionicons name="options" size={20} color="#1293DA" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Desktop styles
  desktopHeader: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 20,
  },
  desktopTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  desktopTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
  },
  desktopSubtitle: {
    fontSize: 15,
    color: "#666",
    marginTop: 4,
  },
  desktopActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  desktopSuccessButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#DAA520",
    borderRadius: 24,
    gap: 6,
    shadowColor: "#DAA520",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  desktopSuccessText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  desktopNotifButton: {
    padding: 8,
    position: "relative",
  },
  desktopSearchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  desktopSearchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  desktopSearchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  clearButton: {
    padding: 4,
  },

  // Mobile styles
  mobileHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  mobileTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mobileTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  successButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "#DAA520",
    borderRadius: 20,
    gap: 4,
    shadowColor: "#DAA520",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  successEmoji: {
    fontSize: 14,
  },
  successText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  notifButton: {
    padding: 6,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#E53935",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
    lineHeight: 12,
  },
  mobileSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
  },
  filterButton: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#1293DA",
    justifyContent: "center",
    alignItems: "center",
  },
});
