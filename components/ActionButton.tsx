import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import type { ComponentProps } from "react";
import type {
  GestureResponderEvent,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import { Pressable, StyleSheet, Text } from "react-native";

type ActionButtonProps = {
  label: string;
  href?: Href;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  iconName?: ComponentProps<typeof Ionicons>["name"];
  iconSize?: number;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
  disabledStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function ActionButton({
  label,
  href,
  onPress,
  disabled = false,
  iconName,
  iconSize = 18,
  iconColor = "#fff",
  style,
  disabledStyle,
  textStyle,
}: ActionButtonProps) {
  function handlePress(event: GestureResponderEvent) {
    onPress?.(event);

    if (!event.defaultPrevented && href) {
      router.push(href);
    }
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        style,
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? disabledStyle : null,
      ]}
      onPress={handlePress}
      disabled={disabled}
    >
      {iconName ? (
        <Ionicons name={iconName} size={iconSize} color={iconColor} />
      ) : null}
      <Text style={[styles.label, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  label: {
    color: "#fff",
    fontWeight: "700",
  },
});
