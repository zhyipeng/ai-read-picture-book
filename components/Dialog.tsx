import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { ActionButton } from "@/components/ActionButton";

type DialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  onRequestClose?: () => void;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
};

export function Dialog({
  visible,
  title,
  message,
  confirmText = "确定",
  cancelText = "取消",
  onConfirm,
  onCancel,
  onRequestClose,
  confirmDisabled = false,
  cancelDisabled = false,
}: DialogProps) {
  const handleRequestClose = onRequestClose ?? onCancel;
  const canDismiss = !confirmDisabled && !cancelDisabled;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={canDismiss ? onCancel : undefined}
        />
        <View style={styles.card}>
          <Pressable
            hitSlop={8}
            style={styles.closeButton}
            onPress={onCancel}
            disabled={!canDismiss}
          >
            <Ionicons name="close" size={14} color="#baa28b" />
          </Pressable>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actionRow}>
            <ActionButton
              label={cancelText}
              onPress={onCancel}
              disabled={cancelDisabled}
              style={styles.cancelButton}
              textStyle={styles.cancelButtonText}
            />
            <ActionButton
              label={confirmText}
              onPress={onConfirm}
              disabled={confirmDisabled}
              style={styles.confirmButton}
              disabledStyle={styles.confirmButtonDisabled}
              textStyle={styles.confirmButtonText}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(70, 52, 38, 0.14)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1e3d4",
    backgroundColor: "#fffaf4",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: "#a68869",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    paddingTop: 4,
    textAlign: "center",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: "#3c2f24",
  },
  message: {
    marginTop: 16,
    textAlign: "left",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
    color: "#6c5744",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eadbca",
    backgroundColor: "#fff7ef",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#7c6754",
  },
  confirmButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: "#ef724f",
    shadowColor: "#ef724f",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 2,
  },
  confirmButtonDisabled: {
    backgroundColor: "#efb4a2",
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
