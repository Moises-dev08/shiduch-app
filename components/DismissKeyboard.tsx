import React from "react";
import {
  Keyboard,
  Platform,
  StyleProp,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from "react-native";

interface DismissKeyboardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Tap outside to dismiss the keyboard on native. On web, TouchableWithoutFeedback
 * intercepts clicks and prevents TextInput from receiving focus/keyboard input.
 */
export function DismissKeyboard({
  children,
  style,
}: DismissKeyboardProps): React.JSX.Element {
  if (Platform.OS === "web") {
    return <View style={style}>{children}</View>;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={style}>{children}</View>
    </TouchableWithoutFeedback>
  );
}
