import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function NewBookScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>新建绘本</Text>
      <Text style={styles.description}>
        这里将承载绘本名称、语言选择和页面图片导入表单。
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
