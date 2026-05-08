import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { type ReactNode, useEffect, useState } from "react";
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

import { Dialog } from "@/components/Dialog";
import { OptionSheet } from "@/components/OptionSheet";
import { listBooks } from "@/lib/db/books";
import { listModelConfigs } from "@/lib/db/modelConfigs";
import { listPagesByBookId, updatePage } from "@/lib/db/pages";
import { getAppSettings, updateAppSettings } from "@/lib/db/settings";
import {
  formatConfigSummary,
  formatPlaybackSpeed,
  getConfigTypeTitle,
  getModelProviderLabel,
  PLAYBACK_SPEED_OPTIONS,
} from "@/lib/settings/configs";
import { deleteFileIfExists } from "@/lib/storage/files";
import type { ModelConfig } from "@/types/config";
import type { AppSettings } from "@/types/settings";

type SettingsSnapshot = {
  settings: AppSettings;
  visionConfigs: ModelConfig[];
  ttsConfigs: ModelConfig[];
  audioCacheBytes: number;
};

type SelectorState =
  | {
      kind: "default-config";
      title: string;
      field:
        | "defaultZhVisionConfigId"
        | "defaultEnVisionConfigId"
        | "defaultZhTtsConfigId"
        | "defaultEnTtsConfigId";
      value: string | null;
      options: ModelConfig[];
    }
  | {
      kind: "playback-speed";
      title: string;
      value: number;
    }
  | null;

async function getAudioCacheBytes(): Promise<number> {
  const books = await listBooks();
  const pageGroups = await Promise.all(books.map((book) => listPagesByBookId(book.id)));
  let total = 0;

  for (const pages of pageGroups) {
    for (const page of pages) {
      if (!page.audioPath) {
        continue;
      }

      try {
        const info = await FileSystem.getInfoAsync(page.audioPath);

        if (info.exists && !info.isDirectory && typeof info.size === "number") {
          total += info.size;
        }
      } catch {
        continue;
      }
    }
  }

  return total;
}

async function getSettingsSnapshot(): Promise<SettingsSnapshot> {
  const [settings, visionConfigs, ttsConfigs, audioCacheBytes] = await Promise.all([
    getAppSettings(),
    listModelConfigs("vision"),
    listModelConfigs("tts"),
    getAudioCacheBytes(),
  ]);

  return {
    settings,
    visionConfigs,
    ttsConfigs,
    audioCacheBytes,
  };
}

function getConfigDisplayName(configs: ModelConfig[], configId: string | null): string {
  if (!configId) {
    return "未设置";
  }

  const config = configs.find((item) => item.id === configId);

  if (!config) {
    return "配置已删除";
  }

  return `${config.name} · ${getModelProviderLabel(config.provider)}`;
}

function formatBytes(size: number): string {
  if (size <= 0) {
    return "0 MB";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = value >= 100 || unitIndex === 0 ? 0 : 1;

  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingsRow({
  label,
  value,
  onPress,
  danger = false,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const isPressable = Boolean(onPress);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        !isPressable ? styles.rowStatic : null,
        pressed && isPressable ? styles.rowPressed : null,
      ]}
      onPress={onPress}
      disabled={!isPressable}
    >
      <Text style={[styles.rowLabel, danger ? styles.rowLabelDanger : null]}>{label}</Text>
      <View style={styles.rowValueWrap}>
        <Text style={[styles.rowValue, danger ? styles.rowValueDanger : null]}>{value}</Text>
        {isPressable ? (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={danger ? "#d16d4b" : "#c4b09a"}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const isFocused = useIsFocused();
  const [snapshot, setSnapshot] = useState<SettingsSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectorState, setSelectorState] = useState<SelectorState>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);

      try {
        const nextSnapshot = await getSettingsSnapshot();

        if (!cancelled) {
          setSnapshot(nextSnapshot);
        }
      } catch (error) {
        if (!cancelled) {
          showAlert(
            "加载失败",
            error instanceof Error ? error.message : "设置数据暂时无法读取。"
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
  }, [isFocused]);

  async function refreshSnapshot() {
    const nextSnapshot = await getSettingsSnapshot();
    setSnapshot(nextSnapshot);
  }

  async function handleUpdateSettings(input: Partial<AppSettings>) {
    if (!snapshot || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const nextSettings = await updateAppSettings(input);

      setSnapshot({
        ...snapshot,
        settings: nextSettings,
      });
    } catch (error) {
      showAlert(
        "保存失败",
        error instanceof Error ? error.message : "设置暂时无法保存。"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClearAudioCache() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const books = await listBooks();
      const pageGroups = await Promise.all(books.map((book) => listPagesByBookId(book.id)));

      for (const pages of pageGroups) {
        for (const page of pages) {
          if (!page.audioPath) {
            continue;
          }

          await deleteFileIfExists(page.audioPath);
          await updatePage(page.id, {
            audioPath: null,
            audioDuration: null,
            audioStatus: "idle",
            lastError: null,
          });
        }
      }

      await refreshSnapshot();
      setShowClearDialog(false);
    } catch (error) {
      showAlert(
        "清理失败",
        error instanceof Error ? error.message : "本地音频缓存暂时无法清理。"
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !snapshot) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#e78842" />
          <Text style={styles.centerText}>正在加载设置</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { settings, visionConfigs, ttsConfigs, audioCacheBytes } = snapshot;

  const selectorOptions =
    selectorState?.kind === "default-config"
      ? [
          {
            key: "none",
            label: "不设置默认值",
            description: "生成时需要手动选择或使用绘本级覆盖配置。",
            selected: selectorState.value === null,
          },
          ...selectorState.options.map((config) => ({
            key: config.id,
            label: config.name,
            description: formatConfigSummary(config),
            selected: selectorState.value === config.id,
          })),
        ]
      : selectorState?.kind === "playback-speed"
        ? PLAYBACK_SPEED_OPTIONS.map((speed) => ({
            key: `${speed}`,
            label: formatPlaybackSpeed(speed),
            description: speed === 1 ? "标准播放速度" : undefined,
            selected: speed === selectorState.value,
          }))
        : [];

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection title="模型配置管理">
          <SettingsRow
            label="多模态模型配置"
            value={`${visionConfigs.length} 个`}
            onPress={() => router.push("/settings/configs/vision")}
          />
          <SettingsRow
            label="TTS 配置"
            value={`${ttsConfigs.length} 个`}
            onPress={() => router.push("/settings/configs/tts")}
          />
        </SettingsSection>

        <SettingsSection title="默认配置">
          <SettingsRow
            label="中文默认多模态模型"
            value={getConfigDisplayName(visionConfigs, settings.defaultZhVisionConfigId)}
            onPress={() =>
              setSelectorState({
                kind: "default-config",
                title: "中文默认多模态模型",
                field: "defaultZhVisionConfigId",
                value: settings.defaultZhVisionConfigId,
                options: visionConfigs,
              })
            }
          />
          <SettingsRow
            label="英文默认多模态模型"
            value={getConfigDisplayName(visionConfigs, settings.defaultEnVisionConfigId)}
            onPress={() =>
              setSelectorState({
                kind: "default-config",
                title: "英文默认多模态模型",
                field: "defaultEnVisionConfigId",
                value: settings.defaultEnVisionConfigId,
                options: visionConfigs,
              })
            }
          />
          <SettingsRow
            label="中文默认 TTS 模型"
            value={getConfigDisplayName(ttsConfigs, settings.defaultZhTtsConfigId)}
            onPress={() =>
              setSelectorState({
                kind: "default-config",
                title: "中文默认 TTS 模型",
                field: "defaultZhTtsConfigId",
                value: settings.defaultZhTtsConfigId,
                options: ttsConfigs,
              })
            }
          />
          <SettingsRow
            label="英文默认 TTS 模型"
            value={getConfigDisplayName(ttsConfigs, settings.defaultEnTtsConfigId)}
            onPress={() =>
              setSelectorState({
                kind: "default-config",
                title: "英文默认 TTS 模型",
                field: "defaultEnTtsConfigId",
                value: settings.defaultEnTtsConfigId,
                options: ttsConfigs,
              })
            }
          />
        </SettingsSection>

        <SettingsSection title="播放设置">
          <SettingsRow
            label="默认倍速"
            value={formatPlaybackSpeed(settings.playbackSpeed)}
            onPress={() =>
              setSelectorState({
                kind: "playback-speed",
                title: "默认倍速",
                value: settings.playbackSpeed,
              })
            }
          />
        </SettingsSection>

        <SettingsSection title="本地存储">
          <SettingsRow
            label="清理本地音频缓存"
            value={formatBytes(audioCacheBytes)}
            onPress={() => setShowClearDialog(true)}
            danger={audioCacheBytes > 0}
          />
          <Text style={styles.sectionHint}>
            清理后不会删除绘本与文本内容，但已生成的语音需要重新生成。
          </Text>
        </SettingsSection>

        <SettingsSection title="隐私说明">
          <Text style={styles.privacyText}>• 所有绘本数据默认保存在本地</Text>
          <Text style={styles.privacyText}>• 不会上传到自有服务器</Text>
          <Text style={styles.privacyText}>
            • API Key 仅用于用户配置的模型服务
          </Text>
        </SettingsSection>

        <View style={styles.footerCard}>
          <Ionicons name="sparkles-outline" size={18} color="#d29257" />
          <Text style={styles.footerText}>
            {getConfigTypeTitle("vision")}与 {getConfigTypeTitle("tts")} 支持独立维护。
          </Text>
        </View>
      </ScrollView>

      <OptionSheet
        visible={selectorState !== null}
        title={selectorState?.title ?? ""}
        options={selectorOptions}
        onClose={() => setSelectorState(null)}
        onSelect={(key) => {
          if (!selectorState) {
            return;
          }

          if (selectorState.kind === "default-config") {
            void handleUpdateSettings({
              [selectorState.field]: key === "none" ? null : key,
            });
          } else {
            void handleUpdateSettings({
              playbackSpeed: Number(key),
            });
          }

          setSelectorState(null);
        }}
      />

      <Dialog
        visible={showClearDialog}
        title="清理本地音频缓存"
        message="已生成的音频文件会被删除，页面文本和绘本信息会保留。清理后如需播放，需要重新生成语音。"
        confirmText="立即清理"
        cancelText="取消"
        onCancel={() => setShowClearDialog(false)}
        onConfirm={() => void handleClearAudioCache()}
        confirmDisabled={isSaving}
        cancelDisabled={isSaving}
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
    gap: 12,
    paddingHorizontal: 24,
  },
  centerText: {
    fontSize: 15,
    color: "#8f7c69",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 16,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    paddingHorizontal: 4,
    fontSize: 15,
    fontWeight: "700",
    color: "#4b3d30",
  },
  sectionCard: {
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#efe2d4",
    backgroundColor: "#fffdf9",
    shadowColor: "#b38457",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3eadf",
  },
  rowStatic: {
    paddingVertical: 14,
  },
  rowPressed: {
    backgroundColor: "#fdf4ea",
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#43362C",
  },
  rowLabelDanger: {
    color: "#b65232",
  },
  rowValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowValue: {
    maxWidth: 180,
    fontSize: 14,
    fontWeight: "600",
    color: "#9A866F",
    textAlign: "right",
  },
  rowValueDanger: {
    color: "#d16d4b",
  },
  sectionHint: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
    fontSize: 13,
    lineHeight: 19,
    color: "#9a866f",
  },
  privacyText: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#6f5d4c",
  },
  footerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0dfcc",
    backgroundColor: "#fff8ef",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: "#8f775f",
  },
});
