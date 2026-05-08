import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { showAlert } from "@/lib/alert";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionButton } from "@/components/ActionButton";
import { Dialog } from "@/components/Dialog";
import { deleteModelConfig, listModelConfigs } from "@/lib/db/modelConfigs";
import { getAppSettings, updateAppSettings } from "@/lib/db/settings";
import {
  formatConfigSummary,
  getConfigTypeShortTitle,
  getConfigTypeTitle,
  getModelProviderLabel,
  isModelConfigType,
} from "@/lib/settings/configs";
import type { ModelConfig } from "@/types/config";
import type { AppSettings } from "@/types/settings";

type ScreenState = {
  configs: ModelConfig[];
  settings: AppSettings;
};

function getDefaultBadges(
  config: ModelConfig,
  settings: AppSettings
): string[] {
  const badges: string[] = [];

  if (config.type === "vision") {
    if (settings.defaultZhVisionConfigId === config.id) {
      badges.push("中文默认");
    }
    if (settings.defaultEnVisionConfigId === config.id) {
      badges.push("英文默认");
    }
  } else {
    if (settings.defaultZhTtsConfigId === config.id) {
      badges.push("中文默认");
    }
    if (settings.defaultEnTtsConfigId === config.id) {
      badges.push("英文默认");
    }
  }

  return badges;
}

async function clearDeletedConfigFromSettings(config: ModelConfig, settings: AppSettings) {
  const updates: Partial<AppSettings> = {};

  if (config.type === "vision") {
    if (settings.defaultZhVisionConfigId === config.id) {
      updates.defaultZhVisionConfigId = null;
    }
    if (settings.defaultEnVisionConfigId === config.id) {
      updates.defaultEnVisionConfigId = null;
    }
  } else {
    if (settings.defaultZhTtsConfigId === config.id) {
      updates.defaultZhTtsConfigId = null;
    }
    if (settings.defaultEnTtsConfigId === config.id) {
      updates.defaultEnTtsConfigId = null;
    }
  }

  if (Object.keys(updates).length > 0) {
    await updateAppSettings(updates);
  }
}

export default function ConfigListScreen() {
  const params = useLocalSearchParams<{ type?: string | string[] }>();
  const isFocused = useIsFocused();
  const type = isModelConfigType(params.type) ? params.type : null;
  const [state, setState] = useState<ScreenState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingConfig, setDeletingConfig] = useState<ModelConfig | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const pageTitle = type ? getConfigTypeShortTitle(type) : "配置列表";

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    let cancelled = false;

    async function load() {
      if (!type) {
        setState(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const [configs, settings] = await Promise.all([
          listModelConfigs(type),
          getAppSettings(),
        ]);

        if (!cancelled) {
          setState({ configs, settings });
        }
      } catch (error) {
        if (!cancelled) {
          showAlert(
            "加载失败",
            error instanceof Error ? error.message : "配置列表暂时无法读取。"
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [isFocused, type]);

  if (!type) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <Stack.Screen options={{ title: "配置列表" }} />
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={32} color="#cb7349" />
          <Text style={styles.stateTitle}>配置类型无效</Text>
        </View>
      </SafeAreaView>
    );
  }

  const resolvedType = type;

  async function handleDeleteConfig() {
    if (!state || !deletingConfig || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteModelConfig(deletingConfig.id);
      await clearDeletedConfigFromSettings(deletingConfig, state.settings);

      const [configs, settings] = await Promise.all([
        listModelConfigs(resolvedType),
        getAppSettings(),
      ]);

      setState({ configs, settings });
      setDeletingConfig(null);
    } catch (error) {
      showAlert(
        "删除失败",
        error instanceof Error ? error.message : "配置暂时无法删除。"
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <Stack.Screen options={{ title: pageTitle }} />

      {isLoading || !state ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#e78842" />
          <Text style={styles.stateText}>正在加载配置</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryTextWrap}>
              <Text style={styles.summaryTitle}>{getConfigTypeTitle(resolvedType)}</Text>
              <Text style={styles.summaryText}>
                当前共 {state.configs.length} 个，可分别维护不同服务地址、模型与语音参数。
              </Text>
            </View>
            <ActionButton
              label="新增配置"
              onPress={() =>
                router.push({
                  pathname: "/settings/configs/[type]/edit",
                  params: { type: resolvedType },
                })
              }
              iconName="add"
              style={styles.addButton}
              textStyle={styles.addButtonText}
            />
          </View>

          {state.configs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="albums-outline" size={28} color="#b5987a" />
              <Text style={styles.emptyTitle}>还没有配置</Text>
              <Text style={styles.emptyText}>先新增一组配置，随后可以回到设置页选择默认值。</Text>
            </View>
          ) : (
            state.configs.map((config) => {
              const badges = getDefaultBadges(config, state.settings);

              return (
                <Pressable
                  key={config.id}
                  style={({ pressed }) => [
                    styles.configCard,
                    pressed ? styles.configCardPressed : null,
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: "/settings/configs/[type]/edit",
                      params: { type: resolvedType, configId: config.id },
                    })
                  }
                >
                  <View style={styles.configHeader}>
                    <View style={styles.configTitleWrap}>
                      <Text style={styles.configName}>{config.name}</Text>
                      {badges.length > 0 ? (
                        <View style={styles.badgeRow}>
                          {badges.map((badge) => (
                            <View key={badge} style={styles.badge}>
                              <Text style={styles.badgeText}>{badge}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>

                    <Pressable
                      hitSlop={8}
                      style={styles.deleteIconButton}
                      onPress={(event) => {
                        event.stopPropagation();
                        setDeletingConfig(config);
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#c86b4a" />
                    </Pressable>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>供应商</Text>
                    <Text numberOfLines={1} style={styles.metaValue}>
                      {getModelProviderLabel(config.provider)}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Base URL</Text>
                    <Text numberOfLines={1} style={styles.metaValue}>
                      {config.baseUrl}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>模型参数</Text>
                    <Text numberOfLines={2} style={styles.metaValue}>
                      {formatConfigSummary(config)}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      <Dialog
        visible={deletingConfig !== null}
        title="删除配置"
        message={`删除后，这组${pageTitle}将不可继续使用。若它已被设置为默认值，会同步取消默认绑定。`}
        confirmText="删除"
        cancelText="取消"
        onCancel={() => setDeletingConfig(null)}
        onConfirm={() => void handleDeleteConfig()}
        confirmDisabled={isDeleting}
        cancelDisabled={isDeleting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F2EC",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#4a3c31",
  },
  stateText: {
    fontSize: 15,
    color: "#8f7c69",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 14,
  },
  summaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#efdfcf",
    backgroundColor: "#fff9f1",
    padding: 16,
    gap: 14,
  },
  summaryTextWrap: {
    gap: 6,
  },
  summaryTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#41352B",
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#8e7862",
  },
  addButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#ef7b39",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptyCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#efdfcf",
    backgroundColor: "#fffdf9",
    paddingHorizontal: 20,
    paddingVertical: 28,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#4a3c31",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
    color: "#8f7c69",
  },
  configCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#eee1d3",
    backgroundColor: "#fffdf9",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
  },
  configCardPressed: {
    backgroundColor: "#fff6ec",
  },
  configHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  configTitleWrap: {
    flex: 1,
    gap: 8,
  },
  configName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#41352B",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: "#f8e6cf",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ab6129",
  },
  deleteIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff4ef",
  },
  metaRow: {
    gap: 6,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ab9580",
    letterSpacing: 0.4,
  },
  metaValue: {
    fontSize: 14,
    lineHeight: 20,
    color: "#5b4c3f",
  },
});
