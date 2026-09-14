import React from "react";
import { TextInput, TextInputProps } from "react-native";
import { webTextInputStyles } from "../lib/webFormSupport";

/**
 * TextInput wrapper with web-safe focus styles so laptop keyboard input works reliably.
 */
export function AppTextInput({
  style,
  ...props
}: TextInputProps): React.JSX.Element {
  return <TextInput style={[webTextInputStyles.base, style]} {...props} />;
}
