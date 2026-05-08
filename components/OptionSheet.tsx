import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type OptionSheetOption = {
  key: string;
  label: string;
  description?: string;
  selected?: boolean;
};

type OptionSheetProps = {
  visible: boolean;
  title: string;
  options: OptionSheetOption[];
  onSelect: (key: string) => void;
  onClose: () => void;
};

export function OptionSheet({
  visible,
  title,
  options,
  onSelect,
  onClose,
}: OptionSheetProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable hitSlop={8} style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={18} color="#8a7562" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.optionScroll}
            contentContainerStyle={styles.optionList}
            showsVerticalScrollIndicator={false}
          >
            {options.map((option) => (
              <Pressable
                key={option.key}
                style={[
                  styles.optionRow,
                  option.selected ? styles.optionRowSelected : null,
                ]}
                onPress={() => onSelect(option.key)}
              >
                <View style={styles.optionTextWrap}>
                  <Text
                    style={[
                      styles.optionLabel,
                      option.selected ? styles.optionLabelSelected : null,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {option.description ? (
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  ) : null}
                </View>
                {option.selected ? (
                  <Ionicons name="checkmark-circle" size={20} color="#ea7d31" />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="#c3af99" />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(60, 42, 29, 0.18)",
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#fffaf4",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
    shadowColor: "#7f644b",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 12,
    maxHeight: "72%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#3d3025",
  },
  closeButton: {
    position: "absolute",
    top: -2,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  optionScroll: {
    marginTop: 4,
  },
  optionList: {
    gap: 10,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#efe2d3",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optionRowSelected: {
    borderColor: "#f0b179",
    backgroundColor: "#fff5ea",
  },
  optionTextWrap: {
    flex: 1,
    gap: 4,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4a3c31",
  },
  optionLabelSelected: {
    color: "#a95718",
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: "#9b8671",
  },
});
