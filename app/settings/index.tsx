import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>设置</Text>
      <Text style={styles.description}>
        这里将管理 Vision、TTS、默认模型和播放参数配置。
      </Text>
      <Link href="/" style={styles.link}>
        返回首页
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4b5563",
  },
  link: {
    marginTop: 8,
    color: "#2563eb",
    fontSize: 16,
    fontWeight: "600",
  },
});
