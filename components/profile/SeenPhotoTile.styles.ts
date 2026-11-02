import { StyleSheet } from "react-native";

export const seenPhotoTileStyles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  tile: {
    backgroundColor: "rgba(17, 17, 17, 0.78)",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  compactTile: {
    backgroundColor: "rgba(17, 17, 17, 0.78)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  label: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  compactLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
