import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
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

const PAYPAL_LINK = "https://www.paypal.com/ncp/payment/YF8LQFHC7JAVC";
const ZELLE_EMAIL = "donations@zivugmishamayim.com";

type PaymentMethod = {
  id: string;
  label: string;
  sublabel: string;
  color: string;
  bgColor: string;
  action: () => void;
  icon: React.ReactNode;
};

export default function DonationsScreen() {
  const openPayPal = async () => {
    try {
      await Linking.openURL(PAYPAL_LINK);
    } catch {
      Alert.alert("Error", "Unable to open link. Please try again later.");
    }
  };

  const handleZelle = async () => {
    await Clipboard.setStringAsync(ZELLE_EMAIL);
    Alert.alert(
      "Zelle Email Copied! 💜",
      `Send your donation to:\n\n${ZELLE_EMAIL}\n\nOpen your bank app, go to Zelle, and paste this email to complete your donation.\n\nThank you for your generosity! 🙏`,
      [{ text: "Got it" }],
    );
  };

  const paymentMethods: PaymentMethod[] = [
    {
      id: "paypal",
      label: "PayPal",
      sublabel: "Fast & secure online checkout",
      color: "#003087",
      bgColor: "#EEF4FF",
      action: openPayPal,
      icon: <FontAwesome5 name="paypal" size={26} color="#003087" />,
    },
    {
      id: "apple-pay",
      label: "Apple Pay",
      sublabel: "One-tap payment via Safari",
      color: "#1a1a1a",
      bgColor: "#F2F2F2",
      action: openPayPal,
      icon: <FontAwesome5 name="apple-pay" size={28} color="#1a1a1a" />,
    },
    {
      id: "card",
      label: "Credit / Debit Card",
      sublabel: "Visa, Mastercard & more",
      color: "#1E7E34",
      bgColor: "#EAFAF1",
      action: openPayPal,
      icon: <FontAwesome5 name="credit-card" size={22} color="#1E7E34" />,
    },
    {
      id: "zelle",
      label: "Zelle",
      sublabel: ZELLE_EMAIL,
      color: "#6C2FF2",
      bgColor: "#F5F0FF",
      action: handleZelle,
      icon: <MaterialCommunityIcons name="bank-transfer" size={28} color="#6C2FF2" />,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <FontAwesome5 name="donate" size={32} color="#1293DA" />
          </View>
          <Text style={styles.title}>Support Our Community</Text>
          <Text style={styles.subtitle}>
            Your generosity keeps the app running and helps us create
            meaningful connections across the community.
          </Text>
        </View>

        {/* Purpose card */}
        <View style={styles.purposeCard}>
          <View style={styles.purposeRow}>
            <View style={styles.purposeIconBox}>
              <Ionicons name="settings" size={22} color="#fff" />
            </View>
            <View style={styles.purposeText}>
              <Text style={styles.purposeTitle}>App Maintenance</Text>
              <Text style={styles.purposeDesc}>
                Server costs, updates &amp; improvements
              </Text>
            </View>
          </View>
        </View>

        {/* Payment methods */}
        <Text style={styles.sectionLabel}>Choose a payment method</Text>

        <View style={styles.methodsList}>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={styles.methodCard}
              onPress={method.action}
              activeOpacity={0.75}
            >
              <View style={[styles.methodIconBox, { backgroundColor: method.bgColor }]}>
                {method.icon}
              </View>

              <View style={styles.methodInfo}>
                <Text style={styles.methodLabel}>{method.label}</Text>
                <Text
                  style={[
                    styles.methodSublabel,
                    method.id === "zelle" && styles.zelleEmail,
                  ]}
                  numberOfLines={1}
                >
                  {method.sublabel}
                </Text>
              </View>

              <View style={[styles.arrowBox, { backgroundColor: method.bgColor }]}>
                <Ionicons
                  name={method.id === "zelle" ? "copy-outline" : "arrow-forward"}
                  size={16}
                  color={method.color}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="lock-closed-outline" size={14} color="#999" />
          <Text style={styles.footerText}>
            All payments are processed securely. Thank you for your generosity! 🙏
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

  // Purpose card
  purposeCard: {
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  purposeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  purposeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#1293DA",
    justifyContent: "center",
    alignItems: "center",
  },
  purposeText: {
    flex: 1,
  },
  purposeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  purposeDesc: {
    fontSize: 12,
    color: "#888",
  },

  // Section label
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginBottom: 10,
  },

  // Payment methods
  methodsList: {
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 28,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  methodIconBox: {
    width: 52,
    height: 52,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  methodInfo: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 3,
  },
  methodSublabel: {
    fontSize: 12,
    color: "#888",
  },
  zelleEmail: {
    color: "#6C2FF2",
    fontWeight: "500",
  },
  arrowBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  // Footer
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
