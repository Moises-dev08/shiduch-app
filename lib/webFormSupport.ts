import { Platform, StyleSheet, ViewStyle } from "react-native";

export const isWebPlatform = Platform.OS === "web";

/** Prevents ScrollView from stealing taps from TextInput on web. */
export const webFormScrollProps = {
  keyboardShouldPersistTaps: "handled" as const,
};

/** Removes default browser outline quirks; keeps inputs typable on web. */
export const webTextInputStyle: ViewStyle | undefined = isWebPlatform
  ? ({
      outlineStyle: "none",
    } as unknown as ViewStyle)
  : undefined;

export const webTextInputStyles = StyleSheet.create({
  base: {
    ...(isWebPlatform ? ({ outlineStyle: "none" } as unknown as ViewStyle) : {}),
  },
});
