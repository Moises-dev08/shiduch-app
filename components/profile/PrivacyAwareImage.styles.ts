import { Platform, StyleSheet, ViewStyle } from "react-native";

/** Web ignores Image blurRadius, so the wrapper blurs the rendered photo. */
const webBlurClip: ViewStyle =
  Platform.OS === "web" ? ({ filter: "blur(18px)" } as ViewStyle) : {};

const webScaledImage: ViewStyle =
  Platform.OS === "web" ? { transform: [{ scale: 1.18 }] } : {};

export const privacyAwareImageStyles = StyleSheet.create({
  clip: {
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  webBlurClip: {
    ...webBlurClip,
  },
  webScaledImage: {
    ...webScaledImage,
  },
});
