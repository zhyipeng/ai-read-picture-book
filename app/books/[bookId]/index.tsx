import { Link, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function BookDetailScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const currentBookId = bookId ?? "unknown-book";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>绘本详情</Text>
      <Text style={styles.meta}>bookId: {currentBookId}</Text>
      <Text style={styles.description}>
        这里将展示绘本基础信息、页面缩略图以及整本操作入口。
      </Text>
      <Link
        href={`/books/${currentBookId}/page/demo-page`}
        style={styles.link}
      >
        查看示例页面详情
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
  meta: {
    fontSize: 14,
    color: "#6b7280",
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
