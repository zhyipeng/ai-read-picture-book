import { useEffect } from "react";
import { Stack } from "expo-router";

import { AppHeaderIconButton, AppHeaderSpacer } from "@/components/AppHeader";
import { initDatabase } from "@/lib/db";

export default function RootLayout() {
  useEffect(() => {
    void initDatabase().catch((error) => {
      console.error("Failed to initialize database", error);
    });
  }, []);

  return (
    <Stack
      screenOptions={({ navigation }) => ({
        headerBackVisible: false,
        headerShadowVisible: false,
        headerTitleAlign: "center",
        headerStyle: {
          backgroundColor: "#F6F2EC",
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: "800",
          color: "#41362E",
        },
        headerLeft: () =>
          navigation.canGoBack() ? (
            <AppHeaderIconButton
              iconName="chevron-back"
              onPress={() => navigation.goBack()}
            />
          ) : (
            <AppHeaderSpacer />
          ),
        headerRight: () => <AppHeaderSpacer />,
      })}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="books/new" options={{ title: "新建绘本" }} />
      <Stack.Screen name="books/[bookId]/edit" options={{ title: "编辑绘本" }} />
      <Stack.Screen
        name="books/[bookId]/index"
        options={{
          title: "绘本详情",
        }}
      />
      <Stack.Screen
        name="books/[bookId]/page/[pageId]"
        options={{ title: "页面详情" }}
      />
      <Stack.Screen name="settings/index" options={{ title: "设置" }} />
    </Stack>
  );
}
