import React from "react";
import { ScrollView, ScrollViewProps } from "react-native";
import { webFormScrollProps } from "../lib/webFormSupport";

/**
 * ScrollView preset for screens/modals with TextInput fields.
 * Avoids web focus bugs where taps fail to focus inputs.
 */
export function WebFormScrollView({
  keyboardShouldPersistTaps,
  ...props
}: ScrollViewProps): React.JSX.Element {
  return (
    <ScrollView
      keyboardShouldPersistTaps={
        keyboardShouldPersistTaps ?? webFormScrollProps.keyboardShouldPersistTaps
      }
      {...props}
    />
  );
}
