import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type TabType = "intros" | "suggestions" | "info";

interface ConnectHeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  counts: {
    intros: number;
    suggestions: number;
    info: number;
  };
  isDesktop?: boolean;
}

/**
 * Desktop-optimized header for Connect screen with tab navigation.
 */
export function ConnectHeader({
  activeTab,
  onTabChange,
  counts,
  isDesktop = false,
}: ConnectHeaderProps): React.JSX.Element {
  if (isDesktop) {
    return (
      <View style={styles.desktopHeader}>
        <View style={styles.desktopTitleSection}>
          <Text style={styles.desktopTitle}>Connections</Text>
          <Text style={styles.desktopSubtitle}>
            Manage your intro requests, suggestions, and information requests
          </Text>
        </View>
        <View style={styles.desktopTabs}>
          <TouchableOpacity
            style={[
              styles.desktopTab,
              activeTab === "intros" && styles.desktopTabActive,
            ]}
            onPress={() => onTabChange("intros")}
          >
            <Ionicons
              name="people"
              size={20}
              color={activeTab === "intros" ? "#1293DA" : "#666"}
            />
            <Text
              style={[
                styles.desktopTabText,
                activeTab === "intros" && styles.desktopTabTextActive,
              ]}
            >
              Intro requests
            </Text>
            {counts.intros > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{counts.intros}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.desktopTab,
              activeTab === "suggestions" && styles.desktopTabActive,
            ]}
            onPress={() => onTabChange("suggestions")}
          >
            <Ionicons
              name="heart"
              size={20}
              color={activeTab === "suggestions" ? "#1293DA" : "#666"}
            />
            <Text
              style={[
                styles.desktopTabText,
                activeTab === "suggestions" && styles.desktopTabTextActive,
              ]}
            >
              Suggestions
            </Text>
            {counts.suggestions > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{counts.suggestions}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.desktopTab,
              activeTab === "info" && styles.desktopTabActive,
            ]}
            onPress={() => onTabChange("info")}
          >
            <Ionicons
              name="information-circle"
              size={20}
              color={activeTab === "info" ? "#1293DA" : "#666"}
            />
            <Text
              style={[
                styles.desktopTabText,
                activeTab === "info" && styles.desktopTabTextActive,
              ]}
            >
              Info requests
            </Text>
            {counts.info > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{counts.info}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Mobile header (existing simple header)
  return (
    <View style={styles.mobileHeader}>
      <Text style={styles.mobileTitle}>Connect</Text>
      <Text style={styles.mobileSubtitle}>Manage your connections</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Desktop styles
  desktopHeader: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  desktopTitleSection: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 16,
  },
  desktopTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  desktopSubtitle: {
    fontSize: 15,
    color: "#666",
  },
  desktopTabs: {
    flexDirection: "row",
    paddingHorizontal: 32,
    gap: 8,
  },
  desktopTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  desktopTabActive: {
    borderBottomColor: "#1293DA",
  },
  desktopTabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#666",
  },
  desktopTabTextActive: {
    color: "#1293DA",
    fontWeight: "600",
  },
  badge: {
    backgroundColor: "#E53935",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },

  // Mobile styles
  mobileHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  mobileTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  mobileSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
});
