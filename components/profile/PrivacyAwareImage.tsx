import React from "react";
import {
  Image,
  ImageStyle,
  Platform,
  StyleProp,
  View,
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
        borderRadius > 0 ? { borderRadius } : null,
        blurred ? styles.webBlurClip : null,
      ]}
    >
      <Image
        source={{ uri }}
        style={[imageStyle, blurred ? styles.webScaledImage : null]}
        resizeMode={resizeMode}
        onError={onError}
        blurRadius={blurred && Platform.OS !== "web" ? blurRadius : 0}
      />
    </View>
  );
}
