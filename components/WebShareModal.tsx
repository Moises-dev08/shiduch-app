import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface WebShareModalProps {
  visible: boolean;
  url: string;
  onClose: () => void;
  onCopy: () => void;
}

/**
 * Web-specific share modal that displays a shareable URL with copy functionality.
 * Only used on web platform where native Share API is not available.
 */
export function WebShareModal({
  visible,
  url,
  onClose,
  onCopy,
}: WebShareModalProps): React.JSX.Element {
  const openInNewTab = (shareUrl: string) => {
    window.open(shareUrl, "_blank");
  };

  const shareOnWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Check out this profile on Zivug Mishamayim! ${url}`)}`;
    openInNewTab(whatsappUrl);
  };

  const shareViaEmail = () => {
    const emailUrl = `mailto:?subject=${encodeURIComponent("Profile from Zivug Mishamayim")}&body=${encodeURIComponent(`Check out this profile: ${url}`)}`;
    window.location.href = emailUrl;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Share profile</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* URL Input */}
          <View style={styles.urlContainer}>
            <TextInput
              style={styles.urlInput}
              value={url}
              editable={false}
              selectTextOnFocus
            />
            <TouchableOpacity style={styles.copyButton} onPress={onCopy}>
              <Ionicons name="copy-outline" size={20} color="#fff" />
              <Text style={styles.copyButtonText}>Copy</Text>
            </TouchableOpacity>
          </View>

          {/* Share Options */}
          <Text style={styles.sectionTitle}>Share via</Text>
          <View style={styles.shareOptions}>
            <TouchableOpacity
              style={styles.shareOption}
              onPress={shareOnWhatsApp}
            >
              <View style={[styles.iconCircle, { backgroundColor: "#25D366" }]}>
                <Ionicons name="logo-whatsapp" size={24} color="#fff" />
              </View>
              <Text style={styles.shareOptionText}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareOption} onPress={shareViaEmail}>
              <View style={[styles.iconCircle, { backgroundColor: "#EA4335" }]}>
                <Ionicons name="mail-outline" size={24} color="#fff" />
              </View>
              <Text style={styles.shareOptionText}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  urlContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  urlInput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1293DA",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  copyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 16,
  },
  shareOptions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 32,
  },
  shareOption: {
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  shareOptionText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
});
