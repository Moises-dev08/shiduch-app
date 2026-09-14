import React from "react";
import { Platform, StyleProp, View, ViewStyle } from "react-native";
import { authFormShellStyles as styles } from "./AuthFormShell.styles";

interface AuthFormShellProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Centers auth content and caps width on web so forms stay readable on desktop.
 * On native, renders children with the provided style unchanged.
 */
export function AuthFormShell({
  children,
  style,
}: AuthFormShellProps): React.JSX.Element {
  if (Platform.OS !== "web") {
    return <View style={style}>{children}</View>;
  }

  return (
    <View style={[styles.outer, style]}>
      <View style={styles.card}>{children}</View>
    </View>
  );
}
