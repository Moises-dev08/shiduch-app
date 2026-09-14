import { useIsFocused } from "@react-navigation/native";
import { Platform } from "react-native";

/**
 * On web, tab screens stay mounted and can paint over siblings (e.g. profile form
 * bleeding into Discover). Return false when this tab is not active.
 */
export function useWebTabVisible(): boolean {
  const isFocused = useIsFocused();
  if (Platform.OS === "web" && !isFocused) {
    return false;
  }
  return true;
}
