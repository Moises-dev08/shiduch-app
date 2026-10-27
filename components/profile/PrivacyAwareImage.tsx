import React from "react";
import {
  Image,
  ImageStyle,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { privacyAwareImageStyles as styles } from "./PrivacyAwareImage.styles";

interface PrivacyAwareImageProps {
  uri: string;
  imageStyle: StyleProp<ImageStyle>;
  blurred: boolean;
  blurRadius?: number;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
  borderRadius?: number;
  onError?: () => void;
}

/**
 * Shows a profile photo, or a blurred version when the owner set it to private
 * or one-time. The blur works on native and on web.
 */
export function PrivacyAwareImage({
  uri,
  imageStyle,
  blurred,
  blurRadius = 18,
  resizeMode = "cover",
  borderRadius = 0,
  onError,
}: PrivacyAwareImageProps): React.JSX.Element {
  return (
    <View
      style={[
        styles.clip,
        imageStyle as StyleProp<ViewStyle>,
        borderRadius > 0 ? { borderRadius } : null,
        blurred ? styles.webBlurClip : null,
      ]}
    >
      <Image
        source={{ uri }}
        style={[
          StyleSheet.absoluteFill,
          blurred ? (styles.webScaledImage as StyleProp<ImageStyle>) : null,
        ]}
        resizeMode={resizeMode}
        onError={onError}
        blurRadius={blurred && Platform.OS !== "web" ? blurRadius : 0}
      />
    </View>
  );
}
