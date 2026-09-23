import { Ionicons } from "@expo/vector-icons";
import React, { ReactNode, useState } from "react";
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { calculateAge } from "../../lib/utils";
import { Profile } from "../../types/homeTypes";

interface ProfileCardProps {
  profile: Profile;
  onPress: (profile: Profile) => void;
  renderAction?: ReactNode;
  /** Small floating element rendered over the photo area (e.g. a "View" pill). */
  renderOverlay?: ReactNode;
  /** Override default card width (used for responsive web grids). */
  cardWidthPercent?: number;
}

export default function ProfileCard({
  profile,
  onPress,
  renderAction,
  renderOverlay,
  cardWidthPercent,
}: ProfileCardProps) {
  const [imageError, setImageError] = useState(false);
  const showImage =
    !imageError &&
    profile.picture &&
    (profile.picturePrivacy === "always" ||
      profile.picturePrivacy === "private" ||
      profile.picturePrivacy === "one_time");
  const isBlurred = profile.picturePrivacy === "private";
  const isOneTimeViewed = profile.picturePrivacy === "one_time" && profile.picturesViewed;
  const age = calculateAge(profile.dob);

  return (
    <TouchableOpacity
      style={[
        styles.profileCard,
        cardWidthPercent != null && { width: `${cardWidthPercent}%` },
      ]}
      onPress={() => onPress(profile)}
      activeOpacity={0.7}
    >
      {showImage ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: profile.picture }}
            style={styles.profileImage}
            onError={() => setImageError(true)}
            blurRadius={isBlurred ? 15 : isOneTimeViewed ? 15 : 0}
          />
          {isBlurred && (
            <View style={styles.blurOverlay}>
              <Ionicons name="lock-closed" size={24} color="#fff" />
            </View>
          )}
          {isOneTimeViewed && (
            <View style={styles.openedOverlay}>
              <Ionicons name="eye" size={22} color="#fff" />
              <Text style={styles.openedText}>Opened</Text>
            </View>
          )}
          <View style={styles.nameBadge}>
            <Text style={styles.nameText} numberOfLines={1}>
              {profile.name}
            </Text>
          </View>
          <View style={styles.ageBadge}>
            <Text style={styles.ageText}>{age} y/o</Text>
          </View>
          {renderOverlay && (
            <View style={styles.overlayContainer}>{renderOverlay}</View>
          )}
        </View>
      ) : (
        <View style={[styles.profileImage, styles.placeholderImage]}>
          <Ionicons name="person" size={40} color="#ccc" />
          <View style={styles.nameBadge}>
            <Text style={styles.nameText} numberOfLines={1}>
              {profile.name}
            </Text>
          </View>
          <View style={styles.ageBadge}>
            <Text style={styles.ageText}>{age} y/o</Text>
          </View>
          {renderOverlay && (
            <View style={styles.overlayContainer}>{renderOverlay}</View>
          )}
        </View>
      )}
      {renderAction && (
        <View style={styles.actionContainer}>{renderAction}</View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    width: "31%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: "relative",
  },
  profileImage: {
    width: "100%",
    backgroundColor: "#f0f0f0",
    ...(Platform.OS === "web"
      ? { aspectRatio: 3 / 4 }
      : { height: 200 }),
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  nameBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: "#7ACDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
  },
  nameText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    width: "100%",
  },
  ageBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#1293DA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ageText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  overlayContainer: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 10,
  },
  actionContainer: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  blurOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  openedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  openedText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    letterSpacing: 0.5,
  },
});
