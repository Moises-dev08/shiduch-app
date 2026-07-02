import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const NONPROFIT_NAME = "Zivug Mishamayim";
const DONATE_WEB_URL = "https://www.zivugmishamayim.com/donate";
const PRIVACY_URL = "https://zivugmishamayim.com/privacy";

type ImpactItem = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  description: string;
};

const IMPACT_ITEMS: ImpactItem[] = [
  {
    icon: "people",
    color: "#1293DA",
    title: "Community matchmaking",
    description:
      "Supporting programs that help singles and families build meaningful connections.",
  },
  {
    icon: "heart",
    color: "#E91E63",
    title: "Shidduch facilitation",
    description:
      "Resources for matchmakers and community members guiding the shidduch process.",
  },
  {
    icon: "globe-outline",
    color: "#4CAF50",
    title: "Mission operations",
    description:
      "Technology and outreach that keep our nonprofit services available to the community.",
  },
];

export default function DonationsScreen(): React.JSX.Element {
  const openDonateWebsite = async (): Promise<void> => {
    try {
      const canOpen = await Linking.canOpenURL(DONATE_WEB_URL);
      if (!canOpen) {
        Alert.alert(
          "Unable to open link",
          "Please visit our website in your browser to make a donation.",
        );
        return;
      }
      await Linking.openURL(DONATE_WEB_URL);
    } catch {
      Alert.alert(
        "Unable to open link",
        "Please visit our website in your browser to make a donation.",
      );
    }
  };

  const openPrivacyPolicy = async (): Promise<void> => {
    try {
      await Linking.openURL(PRIVACY_URL);
    } catch {
      Alert.alert("Error", "Unable to open privacy policy. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <FontAwesome5 name="donate" size={32} color="#1293DA" />
          </View>
          <Text style={styles.title}>Support our mission</Text>
          <Text style={styles.subtitle}>
            {NONPROFIT_NAME} is a registered nonprofit dedicated to helping our
            community find meaningful shidduch connections.
          </Text>
          <View style={styles.nonprofitBadge}>
            <Text style={styles.nonprofitBadgeText}>
              Registered 501(c)(3) nonprofit
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>How your gift is used</Text>

        <View style={styles.impactCard}>
          {IMPACT_ITEMS.map((item, index) => (
            <View
              key={item.title}
              style={[
                styles.impactRow,
                index === IMPACT_ITEMS.length - 1 && styles.impactRowLast,
              ]}
            >
              <View style={styles.impactIconBox}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={styles.impactText}>
                <Text style={styles.impactTitle}>{item.title}</Text>
                <Text style={styles.impactDesc}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.donateButton}
          onPress={openDonateWebsite}
          activeOpacity={0.85}
        >
          <Ionicons name="open-outline" size={20} color="#fff" />
          <Text style={styles.donateButtonText}>Donate on our website</Text>
        </TouchableOpacity>

        <Text style={styles.browserNote}>
          Donations open in your browser and are completed securely on our
          website. PayPal, card, and other options are available there.
        </Text>

        <View style={styles.disclosureCard}>
          <Text style={styles.disclosureTitle}>Donation disclosure</Text>
          <Text style={styles.disclosureText}>
            Donations are voluntary contributions to {NONPROFIT_NAME}, a
            registered 501(c)(3) tax-exempt nonprofit organization.
          </Text>
          <Text style={styles.disclosureText}>
            Donations do not unlock any app features, digital content, or
            services. This app is free for all users.
          </Text>
          <Text style={styles.disclosureText}>
            Tax-deductible contributions may be available where applicable.
            Donation receipts are provided according to our website policies.
          </Text>
          <Text style={[styles.disclosureText, styles.disclosureTextLast]}>
            Questions? Contact us at donations@zivugmishamayim.com
          </Text>
          <TouchableOpacity
            style={styles.privacyLink}
            onPress={openPrivacyPolicy}
          >
            <Text style={styles.privacyLinkText}>View privacy policy</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Ionicons name="heart-outline" size={14} color="#999" />
          <Text style={styles.footerText}>
            Thank you for supporting our community mission.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f9",
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
  },
  headerIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 21,
  },
  nonprofitBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#E8F5E9",
    borderRadius: 20,
  },
  nonprofitBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2E7D32",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  impactCard: {
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  impactRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  impactRowLast: {
    marginBottom: 0,
  },
  impactIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
  },
  impactText: {
    flex: 1,
  },
  impactTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  impactDesc: {
    fontSize: 12,
    color: "#888",
    lineHeight: 18,
  },
  donateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: "#1293DA",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: "#1293DA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  donateButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  browserNote: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    lineHeight: 18,
    marginHorizontal: 24,
    marginBottom: 24,
  },
  disclosureCard: {
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  disclosureTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 10,
  },
  disclosureText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
    marginBottom: 8,
  },
  disclosureTextLast: {
    marginBottom: 0,
  },
  privacyLink: {
    marginTop: 4,
  },
  privacyLinkText: {
    fontSize: 12,
    color: "#1293DA",
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 18,
    flex: 1,
  },
});
