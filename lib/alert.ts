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
