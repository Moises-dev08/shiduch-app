import { Platform, useWindowDimensions } from "react-native";

const WEB_APP_MAX_WIDTH = 1400; // Updated to match innerApp maxWidth

export interface ProfileGridLayout {
  columns: number;
  cardWidthPercent: number;
}

/**
 * Responsive profile grid: more columns on wider web viewports.
 * Adapts from 2 columns (mobile) up to 7 columns (ultra-wide desktop).
 */
export function useProfileGridLayout(): ProfileGridLayout {
  const { width } = useWindowDimensions();

  if (Platform.OS !== "web") {
    return { columns: 3, cardWidthPercent: 31 };
  }

  const contentWidth = Math.min(width, WEB_APP_MAX_WIDTH);

  // Ultra-wide desktop (1200px+): 7 columns
  if (contentWidth >= 1200) {
    return { columns: 7, cardWidthPercent: 13.3 };
  }
  // Wide desktop (1000-1199px): 6 columns
  if (contentWidth >= 1000) {
    return { columns: 6, cardWidthPercent: 15.5 };
  }
  // Desktop (900-999px): 5 columns
  if (contentWidth >= 900) {
    return { columns: 5, cardWidthPercent: 18.4 };
  }
  // Tablet landscape (720-899px): 4 columns
  if (contentWidth >= 720) {
    return { columns: 4, cardWidthPercent: 23 };
  }
  // Tablet portrait (480-719px): 3 columns
  if (contentWidth >= 480) {
    return { columns: 3, cardWidthPercent: 31 };
  }
  // Mobile (< 480px): 2 columns
  return { columns: 2, cardWidthPercent: 48 };
}
