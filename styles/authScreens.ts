import { Platform, StyleSheet } from "react-native";

const isWeb = Platform.OS === "web";

/** Shared brand-auth layout bits that differ on web vs native. */
export const authBrandLayout = StyleSheet.create({
  logo: {
    width: isWeb ? 280 : 400,
    height: isWeb ? 250 : 360,
    marginBottom: isWeb ? 8 : -16,
    maxWidth: "100%",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: isWeb ? 24 : 28,
    paddingVertical: isWeb ? 32 : 20,
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: isWeb ? "center" : undefined,
    paddingHorizontal: isWeb ? 24 : 0,
    paddingVertical: isWeb ? 32 : 0,
  },
  scrollInner: {
    width: "100%",
    maxWidth: isWeb ? 420 : undefined,
    paddingHorizontal: isWeb ? 0 : 28,
    paddingVertical: isWeb ? 0 : 40,
  },
  lightContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: isWeb ? 24 : 20,
    paddingVertical: isWeb ? 32 : 20,
    width: "100%",
  },
});
