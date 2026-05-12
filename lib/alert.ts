import { Alert, Platform } from "react-native";

/**
 * 跨平台 alert，web 端回退到浏览器原生 window.alert。
 */
export function showAlert(title: string, message?: string): void {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

/**
 * 跨平台 confirm，web 端回退到浏览器原生 window.confirm。
 * 返回 Promise<boolean>，true 表示用户确认。
 */
export function showConfirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "取消", style: "cancel", onPress: () => resolve(false) },
      { text: "确认", onPress: () => resolve(true) },
    ]);
  });
}
