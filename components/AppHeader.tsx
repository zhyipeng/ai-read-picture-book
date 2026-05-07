import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

type HeaderIconButtonProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  disabled?: boolean;
};

export function AppHeaderIconButton({
  iconName,
  onPress,
  disabled = false,
}: HeaderIconButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.iconButton,
        pressed && !disabled ? styles.iconButtonPressed : null,
        disabled ? styles.iconButtonDisabled : null,
      ]}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
    >
      <Ionicons name={iconName} size={20} color="#473B31" />
    </Pressable>
  );
}

export function AppHeaderSpacer() {
  return <View style={styles.iconButton} />;
}

const styles = StyleSheet.create({
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonPressed: {
    opacity: 0.72,
  },
  iconButtonDisabled: {
    opacity: 0.42,
  },
});
