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

function numericDimension(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
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
  const flatStyle = StyleSheet.flatten(imageStyle);
  const width = numericDimension(flatStyle?.width);
  const height = numericDimension(flatStyle?.height);
  const frameStyle: ViewStyle = {
    width,
    height,
    backgroundColor:
      typeof flatStyle?.backgroundColor === "string"
        ? flatStyle.backgroundColor
        : undefined,
  };
  // Android grows a relative parent to the photo's pixel size when the image
  // is absolutely positioned. A fixed frame keeps the avatar at its real size.
  const photoStyle: ImageStyle =
    width !== undefined && height !== undefined
      ? { width, height }
      : { width: "100%", height: "100%" };
  const webBlurStyle: ViewStyle | null =
    blurred && Platform.OS === "web"
      ? ({ filter: `blur(${blurRadius}px)` } as ViewStyle)
      : null;
  const webScaleStyle: ImageStyle | null =
    blurred && Platform.OS === "web"
      ? { transform: [{ scale: blurRadius >= 24 ? 1.45 : 1.18 }] }
      : null;

  return (
    <View
      style={[
        styles.clip,
        frameStyle,
        borderRadius > 0 ? { borderRadius } : null,
        webBlurStyle,
      ]}
    >
      <Image
        source={{ uri }}
        style={[
          photoStyle,
          webScaleStyle,
        ]}
        resizeMode={resizeMode}
        onError={onError}
        blurRadius={blurred && Platform.OS !== "web" ? blurRadius : 0}
      />
    </View>
  );
}
