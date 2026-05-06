import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI 绘本朗读</Text>
      <Text style={styles.description}>
        当前为路由骨架验收页，可从这里进入新建、详情和设置页面。
      </Text>

      <View style={styles.actions}>
        <Link href="/books/new" style={styles.link}>
          新建绘本
        </Link>
        <Link href="/books/demo-book" style={styles.link}>
          查看绘本详情
        </Link>
        <Link href="/settings" style={styles.link}>
          打开设置
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4b5563",
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  link: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#eef2ff",
    color: "#312e81",
    fontSize: 16,
    fontWeight: "600",
    overflow: "hidden",
  },
});
