import { Platform, StyleSheet, ViewStyle } from "react-native";

const isWeb = Platform.OS === "web";

const rootWeb: ViewStyle = isWeb
  ? ({ minHeight: "100vh" } as ViewStyle)
  : {};

/** Web-only layout: full viewport, optional max-width per route type. No phone mockup frame. */
export const webAppShellStyles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    ...rootWeb,
  },
  /** Main app tabs & screens - wider max-width for better desktop utilization */
  innerApp: {
    flex: 1,
    width: "100%",
    maxWidth: 1400, // Increased from 1100 to use more desktop space
    height: "100%",
  },
  /** Auth: gradient/brand screens span the full browser width */
  innerAuth: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  /** Admin dashboards */
  innerAdmin: {
    flex: 1,
    width: "100%",
    maxWidth: 1200,
    height: "100%",
  },
});
