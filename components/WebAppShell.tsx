import { usePathname } from "expo-router";
import React from "react";
import { Platform, View } from "react-native";
import { webAppShellStyles as styles } from "./WebAppShell.styles";

interface WebAppShellProps {
  children: React.ReactNode;
}

function getInnerStyle(pathname: string) {
  if (pathname.startsWith("/auth")) {
    return styles.innerAuth;
  }
  if (pathname.startsWith("/admin")) {
    return styles.innerAdmin;
  }
  return styles.innerApp;
}

/**
 * On web, keeps layouts readable on desktop: auth is full-width, main app is
 * centered up to 768px, admin up to 1200px. Native is unchanged.
 */
export function WebAppShell({ children }: WebAppShellProps): React.JSX.Element {
  const pathname = usePathname();

  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  return (
    <View style={styles.root}>
      <View style={getInnerStyle(pathname)}>{children}</View>
    </View>
  );
}
