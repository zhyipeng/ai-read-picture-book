import { useEffect } from "react";
import { Stack } from "expo-router";

import { initDatabase } from "@/lib/db";

export default function RootLayout() {
  useEffect(() => {
    void initDatabase().catch((error) => {
      console.error("Failed to initialize database", error);
    });
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
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
