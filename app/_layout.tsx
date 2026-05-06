import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "绘本" }} />
      <Stack.Screen name="books/new" options={{ title: "新建绘本" }} />
      <Stack.Screen name="books/[bookId]/index" options={{ title: "绘本详情" }} />
      <Stack.Screen
        name="books/[bookId]/page/[pageId]"
        options={{ title: "页面详情" }}
      />
      <Stack.Screen name="settings/index" options={{ title: "设置" }} />
    </Stack>
  );
}
