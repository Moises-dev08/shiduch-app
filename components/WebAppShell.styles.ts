import { Platform, StyleSheet, ViewStyle } from "react-native";

const isWeb = Platform.OS === "web";

/** 100vh on Android Chrome includes the area behind the browser toolbar. */
const rootWeb: ViewStyle = isWeb
  ? ({
      height: "var(--app-height, 100dvh)",
      maxHeight: "var(--app-height, 100dvh)",
      minHeight: 0,
    } as ViewStyle)
  : {};

/** Web-only layout: full viewport, optional max-width per route type. No phone mockup frame. */
export const webAppShellStyles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    overflow: "hidden",
    ...rootWeb,
  },
  /** Main app tabs & screens - wider max-width for better desktop utilization */
  innerApp: {
    flex: 1,
    width: "100%",
    maxWidth: 1400, // Increased from 1100 to use more desktop space
    height: "100%",
    minHeight: 0,
  },
  /** Auth: gradient/brand screens span the full browser width */
  innerAuth: {
    flex: 1,
    width: "100%",
    height: "100%",
    minHeight: 0,
  },
  /** Admin dashboards */
  innerAdmin: {
    flex: 1,
    width: "100%",
    maxWidth: 1200,
    height: "100%",
    minHeight: 0,
  },
});
