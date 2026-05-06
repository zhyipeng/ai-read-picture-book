import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function BookPageDetailScreen() {
  const { bookId, pageId } = useLocalSearchParams<{
    bookId: string;
    pageId: string;
  }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>页面详情</Text>
      <Text style={styles.meta}>bookId: {bookId ?? "unknown-book"}</Text>
      <Text style={styles.meta}>pageId: {pageId ?? "unknown-page"}</Text>
      <Text style={styles.description}>
        这里将展示页面图片、三段文本编辑区和单页生成操作。
      </Text>
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
});
