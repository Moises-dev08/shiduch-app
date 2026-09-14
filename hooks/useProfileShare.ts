import { useState } from "react";
import { Alert, Platform, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import { getProfileHttpsShareUrl } from "../lib/profileShareUrls";

// Structural type — accepts any Profile shape as long as it has the fields we need.
export interface ShareableProfile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
}

export interface UseProfileShareResult {
  isSharing: boolean;
  shareProfile: (profile: ShareableProfile) => Promise<void>;
  showWebShareModal: boolean;
  webShareUrl: string;
  closeWebShareModal: () => void;
  copyWebShareUrl: () => Promise<void>;
}

export function useProfileShare(): UseProfileShareResult {
  const [isSharing, setIsSharing] = useState(false);
  const [showWebShareModal, setShowWebShareModal] = useState(false);
  const [webShareUrl, setWebShareUrl] = useState("");

  const shareProfile = async (profile: ShareableProfile): Promise<void> => {
    if (!profile.id) {
      Alert.alert("Error", "Profile must be saved before it can be shared.");
      return;
    }

    if (!profile.first_name || !profile.last_name) {
      Alert.alert("Error", "Profile must have a first and last name to share.");
      return;
    }

    const webUrl = getProfileHttpsShareUrl(profile.id);
    const name = `${profile.first_name} ${profile.last_name}`;

    // Web platform: show share modal with URL
    if (Platform.OS === "web") {
      setWebShareUrl(webUrl);
      setShowWebShareModal(true);
      return;
    }

    // Mobile platforms: use native Share API
    try {
      setIsSharing(true);
      await Share.share(
        Platform.OS === "ios"
          ? {
              // On iOS: keep URL out of message — url field generates the preview card.
              // Having the URL in both places creates a duplicate preview card.
              message: `Check out ${name}'s profile on Zivug Mishamayim!`,
              url: webUrl,
            }
          : {
              message: `Check out ${name}'s profile on Zivug Mishamayim!\n\n${webUrl}`,
            },
        { dialogTitle: `Share ${name}'s profile` },
      );
    } catch (error: any) {
      // User cancelled share — no need to show an error
      if (error?.message !== "User did not share") {
        console.error("Error sharing profile:", error);
        Alert.alert("Error", "An unexpected error occurred while sharing.");
      }
    } finally {
      setIsSharing(false);
    }
  };

  const closeWebShareModal = () => {
    setShowWebShareModal(false);
    setWebShareUrl("");
  };

  const copyWebShareUrl = async () => {
    try {
      await Clipboard.setStringAsync(webShareUrl);
      Alert.alert("Success", "Profile link copied to clipboard!");
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      Alert.alert("Error", "Failed to copy link to clipboard.");
    }
  };

  return {
    isSharing,
    shareProfile,
    showWebShareModal,
    webShareUrl,
    closeWebShareModal,
    copyWebShareUrl,
  };
}
