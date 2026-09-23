import { Platform, useWindowDimensions } from "react-native";

const WEB_APP_MAX_WIDTH = 1400; // Updated to match innerApp maxWidth

export interface ProfileGridLayout {
  columns: number;
  cardWidthPercent: number;
}

/**
 * Profile grid columns.
 * Native and wider web viewports show 3 cards per row.
 * Narrow web (phone) stays at 2 so the cards remain readable.
 */
export function useProfileGridLayout(): ProfileGridLayout {
  const { width } = useWindowDimensions();

  if (Platform.OS !== "web") {
    return { columns: 3, cardWidthPercent: 31 };
  }

  const contentWidth = Math.min(width, WEB_APP_MAX_WIDTH);

  if (contentWidth < 480) {
    return { columns: 2, cardWidthPercent: 48 };
  }

  return { columns: 3, cardWidthPercent: 31 };
}
