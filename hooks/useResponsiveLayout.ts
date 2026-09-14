import { Platform, useWindowDimensions } from "react-native";

/**
 * Breakpoints for responsive design
 * - xs: < 480px (mobile portrait)
 * - sm: 480-639px (mobile landscape)
 * - md: 640-1023px (tablet)
 * - lg: 1024-1439px (desktop)
 * - xl: 1440px+ (large desktop)
 */
export interface ResponsiveLayout {
  /** Current viewport width in pixels */
  width: number;
  /** Current viewport height in pixels */
  height: number;
  /** Whether running on web platform */
  isWeb: boolean;
  /** Breakpoint flags */
  isXSmall: boolean;
  isSmall: boolean;
  isMedium: boolean;
  isLarge: boolean;
  isXLarge: boolean;
  /** Mobile vs desktop checks */
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** Suggested number of columns for grid layouts */
  gridColumns: number;
  /** Suggested padding for content */
  contentPadding: number;
  /** Suggested gap between grid items */
  itemGap: number;
}

/**
 * Hook for building adaptive, desktop-friendly components that work on mobile too.
 * 
 * Usage:
 * ```tsx
 * const { isDesktop, gridColumns, contentPadding } = useResponsiveLayout();
 * 
 * return (
 *   <View style={{ padding: contentPadding }}>
 *     <View style={{ flexDirection: isDesktop ? 'row' : 'column' }}>
 *       // Content adapts based on screen size
 *     </View>
 *   </View>
 * );
 * ```
 */
export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === "web";

  // Define breakpoints
  const isXSmall = width < 480;
  const isSmall = width >= 480 && width < 640;
  const isMedium = width >= 640 && width < 1024;
  const isLarge = width >= 1024 && width < 1440;
  const isXLarge = width >= 1440;

  // Device type helpers
  const isMobile = isXSmall || isSmall;
  const isTablet = isMedium;
  const isDesktop = isLarge || isXLarge;

  // Suggested layout values
  const gridColumns = isXLarge ? 6 : isLarge ? 5 : isMedium ? 4 : isSmall ? 3 : 2;
  const contentPadding = isWeb
    ? isDesktop
      ? 32
      : isTablet
        ? 24
        : 16
    : 16;
  const itemGap = isWeb ? (isDesktop ? 20 : 16) : 12;

  return {
    width,
    height,
    isWeb,
    isXSmall,
    isSmall,
    isMedium,
    isLarge,
    isXLarge,
    isMobile,
    isTablet,
    isDesktop,
    gridColumns,
    contentPadding,
    itemGap,
  };
}
