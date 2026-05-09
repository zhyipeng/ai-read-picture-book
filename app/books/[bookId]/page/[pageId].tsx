import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

import { AppHeaderSpacer } from "@/components/AppHeader";
import { PreviewImage } from "@/components/PreviewImage";
import { getBookById } from "@/lib/db/books";
import { getModelConfigById } from "@/lib/db/modelConfigs";
import { getPageById, listPagesByBookId } from "@/lib/db/pages";
import {
  generatePageAudio,
  generatePageText,
  getGenerationProviderName,
} from "@/lib/services/generation";
import { getAppSettings } from "@/lib/db/settings";
import { useAudioPlayer } from "@/lib/services/audioPlayer";
import { formatPlaybackSpeed } from "@/lib/settings/configs";
import { getPersistedImageUri } from "@/lib/storage/files";
import type { Book } from "@/types/book";
import type { ModelConfig } from "@/types/config";
import type { Page } from "@/types/page";
import type { AppSettings } from "@/types/settings";

type DetailTabKey = "original" | "scene" | "read";

type StatusTone = "green" | "amber" | "red" | "gray" | "blue";

type StatusDescriptor = {
  label: string;
  tone: StatusTone;
  iconName: keyof typeof Ionicons.glyphMap;
};

type PageDetailState = {
  book: Book;
  page: Page;
  pages: Page[];
  settings: AppSettings;
  ttsConfig: ModelConfig | null;
  imageUri: string | null;
};

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function getPreferredTab(page: Page): DetailTabKey {
  if (page.readAloudText.trim()) {
    return "read";
  }

  if (page.originalText.trim()) {
    return "original";
  }

  return "scene";
}

function getStatusPalette(tone: StatusTone) {
  if (tone === "green") {
    return {
      backgroundColor: "#E6F5E9",
      borderColor: "#CBE6D2",
      textColor: "#2F7A48",
      iconColor: "#389E57",
    };
  }

  if (tone === "amber") {
    return {
      backgroundColor: "#FFF3DF",
      borderColor: "#F1DDB8",
      textColor: "#996817",
      iconColor: "#DB9927",
    };
  }

  if (tone === "red") {
    return {
      backgroundColor: "#FFF1EF",
      borderColor: "#F2D0CB",
      textColor: "#BD4D3A",
      iconColor: "#E26049",
    };
  }

  if (tone === "blue") {
    return {
      backgroundColor: "#EDF3FF",
      borderColor: "#D5E1FF",
      textColor: "#4567AF",
      iconColor: "#6289DD",
    };
  }

  return {
    backgroundColor: "#F3EFE9",
    borderColor: "#E5DDD2",
    textColor: "#84786D",
    iconColor: "#9A8D82",
  };
}

function hasGeneratedText(page: Page): boolean {
  return (
    page.originalText.trim().length > 0 ||
    page.sceneDescription.trim().length > 0 ||
    page.readAloudText.trim().length > 0 ||
    page.textStatus === "done"
  );
}

function getTextStatusDescriptor(page: Page): StatusDescriptor {
  if (page.textStatus === "error" || page.lastError) {
    return {
      label: "生成失败",
      tone: "red",
      iconName: "alert-circle",
    };
  }

  if (page.textStatus === "generating") {
    return {
      label: "生成中",
      tone: "blue",
      iconName: "time",
    };
  }

  if (page.hasManualEdit) {
    return {
      label: "已编辑待更新语音",
      tone: "amber",
      iconName: "create",
    };
  }

  if (hasGeneratedText(page)) {
    return {
      label: "文本已生成",
      tone: "green",
      iconName: "checkmark-circle",
    };
  }

  return {
    label: "未生成",
    tone: "gray",
    iconName: "ellipse-outline",
  };
}

function getAudioStatusDescriptor(page: Page): StatusDescriptor {
  if (page.audioStatus === "error") {
    return {
      label: "生成失败",
      tone: "red",
      iconName: "alert-circle",
    };
  }

  if (page.audioStatus === "generating") {
    return {
      label: "生成中",
      tone: "blue",
      iconName: "time",
    };
  }

  if (page.audioStatus === "done" && page.audioPath) {
    return {
      label: "语音已生成",
      tone: "green",
      iconName: "checkmark-circle",
    };
  }

  if (page.readAloudText.trim()) {
    return {
      label: "待生成",
      tone: "amber",
      iconName: "mic-outline",
    };
  }

  return {
    label: "未生成",
    tone: "gray",
    iconName: "ellipse-outline",
  };
}

function PageIllustrationFallback() {
  return (
    <View style={styles.fallbackArt}>
      <View style={styles.fallbackMoonGlow} />
      <View style={styles.fallbackMoon}>
        <View style={styles.fallbackMoonEyeLeft} />
        <View style={styles.fallbackMoonEyeRight} />
        <View style={styles.fallbackMoonSmile} />
      </View>
      <View style={styles.fallbackStarSmall} />
      <View style={styles.fallbackStarBig} />
      <View style={styles.fallbackWater} />
      <View style={styles.fallbackBoatBody} />
      <View style={styles.fallbackBoatChildHead} />
      <View style={styles.fallbackBoatChildBody} />
      <View style={styles.fallbackBoatArm} />
    </View>
  );
}

function DetailTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.tabButton, active ? styles.tabButtonActive : null]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ActionChipButton({
  label,
  iconName,
  backgroundColor,
  disabled = false,
  onPress,
}: {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionChipButton,
        { backgroundColor },
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={iconName} size={17} color="#FFFFFF" />
      <Text style={styles.actionChipButtonText}>{label}</Text>
    </Pressable>
  );
}

function StatusBadge({ descriptor }: { descriptor: StatusDescriptor }) {
  const palette = getStatusPalette(descriptor.tone);

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
      ]}
    >
      <Ionicons
        name={descriptor.iconName}
        size={14}
        color={palette.iconColor}
      />
      <Text style={[styles.statusBadgeText, { color: palette.textColor }]}>
        {descriptor.label}
      </Text>
    </View>
  );
}

function StatusRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusRowLabel}>{label}</Text>
      <View style={styles.statusRowValue}>{children}</View>
    </View>
  );
}

export default function BookPageDetailScreen() {
  const { bookId, pageId } = useLocalSearchParams<{
    bookId: string;
    pageId: string;
  }>();
  const isFocused = useIsFocused();
  const imageRevokeRef = useRef<(() => void) | null>(null);
  const [state, setState] = useState<PageDetailState | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTabKey>("read");
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  const { state: playbackState, speed: playbackSpeed, load, togglePlay, cycleSpeed, setOnEnd, setSpeed, unload } = useAudioPlayer();

  function cleanupImageUri() {
    imageRevokeRef.current?.();
    imageRevokeRef.current = null;
  }

  useEffect(() => {
    return () => {
      cleanupImageUri();
    };
  }, []);

  useEffect(() => {
    if (!bookId || !pageId || !isFocused) {
      return;
    }

    let isCancelled = false;

    async function loadDetail() {
      try {
        setIsLoading(true);
        setErrorText(null);
        cleanupImageUri();

        const [book, page, pages, settings] = await Promise.all([
          getBookById(bookId),
          getPageById(pageId),
          listPagesByBookId(bookId),
          getAppSettings(),
        ]);

        if (isCancelled) {
          return;
        }

        if (!book || !page) {
          setState(null);
          setErrorText("未找到对应页面。");
          return;
        }

        const imageResult = page.imagePath
          ? await getPersistedImageUri(page.imagePath)
          : null;

        if (isCancelled) {
          imageResult?.revoke?.();
          return;
        }

        imageRevokeRef.current = imageResult?.revoke ?? null;

        const defaultTtsConfigId =
          book.language === "zh"
            ? settings.defaultZhTtsConfigId
            : settings.defaultEnTtsConfigId;
        const ttsConfigId = book.ttsConfigId ?? defaultTtsConfigId;
        const ttsConfig = ttsConfigId ? await getModelConfigById(ttsConfigId) : null;

        if (isCancelled) {
          return;
        }

        setState({
          book,
          page,
          pages,
          settings,
          ttsConfig,
          imageUri: imageResult?.uri ?? null,
        });
        setActiveTab(getPreferredTab(page));
      } catch (error) {
        console.error("Failed to load page detail", error);

        if (isCancelled) {
          return;
        }

        setState(null);
        setErrorText("页面详情加载失败，请稍后重试。");
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      isCancelled = true;
    };
  }, [bookId, pageId, isFocused, refreshKey]);

  useEffect(() => {
    if (state?.page.audioPath && state.page.audioStatus === "done") {
      void load(state.page.audioPath);
    }
  }, [state?.page.id, state?.page.audioPath]);

  useEffect(() => {
    if (!state) return;
    const { book, page, pages, settings } = state;
    const idx = pages.findIndex((item) => item.id === page.id);
    const np = idx >= 0 && idx < pages.length - 1 ? pages[idx + 1] : null;

    setOnEnd(() => {
      if (np) {
        const delayMs = (settings.pauseBetweenPages ?? 0.5) * 1000;
        setTimeout(() => {
          router.replace(`/books/${book.id}/page/${np.id}`);
        }, delayMs);
      }
    });
  }, [state]);

  useEffect(() => {
    setSpeed(playbackSpeed);
  }, [playbackSpeed]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <Stack.Screen
          options={{
            title: "页面详情",
            headerRight: () => <AppHeaderSpacer />,
          }}
        />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#5A83D0" />
          <Text style={styles.centerStateText}>正在加载页面详情...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!state || errorText) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <Stack.Screen
          options={{
            title: "页面详情",
            headerRight: () => <AppHeaderSpacer />,
          }}
        />
        <View style={styles.centerState}>
          <Ionicons name="document-text-outline" size={34} color="#A69380" />
          <Text style={styles.centerStateTitle}>页面暂不可用</Text>
          <Text style={styles.centerStateText}>{errorText ?? "未找到对应页面。"}</Text>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              if (bookId) {
                router.replace(`/books/${bookId}`);
                return;
              }

              router.replace("/");
            }}
          >
            <Text style={styles.backButtonText}>返回绘本详情</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { book, page, pages, settings, ttsConfig, imageUri } = state;
  const pageNumber = page.pageIndex + 1;
  const totalPageCount = Math.max(book.pageCount, pages.length, pageNumber);
  const currentIndex = pages.findIndex((item) => item.id === page.id);
  const prevPage = currentIndex > 0 ? pages[currentIndex - 1] : null;
  const nextPage =
    currentIndex >= 0 && currentIndex < pages.length - 1
      ? pages[currentIndex + 1]
      : null;
  const textStatusDescriptor = getTextStatusDescriptor(page);
  const audioStatusDescriptor = getAudioStatusDescriptor(page);
  const tabContent =
    activeTab === "original"
      ? page.originalText.trim() || "暂无原文文本"
      : activeTab === "scene"
        ? page.sceneDescription.trim() || "暂无画面描述"
        : page.readAloudText.trim() || "暂无朗读文本";
  const speedLabel = formatPlaybackSpeed(playbackSpeed);
  const ttsConfigLabel = ttsConfig
    ? `${ttsConfig.name}${ttsConfig.voice ? ` · ${ttsConfig.voice}` : ""} · ${speedLabel}`
    : `未配置 · ${speedLabel}`;
  const hasError =
    page.textStatus === "error" ||
    page.audioStatus === "error" ||
    Boolean(page.lastError);
  const errorMessage =
    page.lastError ?? "网络连接超时，请检查配置或稍后重试。";

  function openNeighborPage(targetPage: Page | null) {
    if (!targetPage) {
      return;
    }

    router.replace(`/books/${book.id}/page/${targetPage.id}`);
  }

  async function handleGenerateText() {
    if (isGeneratingText) {
      return;
    }

    try {
      setIsGeneratingText(true);
      await generatePageText({
        book,
        page,
      });
      setRefreshKey((value) => value + 1);
      setActiveTab("read");
      showAlert(
        "生成完成",
        `已生成当前页文本。`
      );
    } catch (error) {
      console.error("Failed to generate page text", error);
      showAlert("生成失败", String(error));
    } finally {
      setIsGeneratingText(false);
    }
  }

  async function handleGenerateAudio() {
    if (isGeneratingAudio) {
      return;
    }

    try {
      setIsGeneratingAudio(true);
      await generatePageAudio({
        book,
        page,
      });
      setRefreshKey((value) => value + 1);
      showAlert(
        "生成完成",
        `已通过 ${getGenerationProviderName()} provider 生成当前页语音。`
      );
    } catch (error) {
      console.error("Failed to generate page audio", error);
      showAlert("生成失败", "单页语音生成未完成，请稍后重试。");
    } finally {
      setIsGeneratingAudio(false);
    }
  }

  async function handleRetry() {
    if (isGeneratingText || isGeneratingAudio) {
      return;
    }

    if (!page.readAloudText.trim() || page.textStatus === "error") {
      await handleGenerateText();
      return;
    }

    await handleGenerateAudio();
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <Stack.Screen
        options={{
          title: `第 ${pageNumber} 页 / 共 ${totalPageCount} 页`,
        }}
      />

      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            {imageUri ? (
              <PreviewImage
                source={{ uri: imageUri }}
                style={styles.heroImage}
                contentFit="cover"
              />
            ) : (
              <PageIllustrationFallback />
            )}
          </View>

          <View style={styles.tabRow}>
            <DetailTab
              label="原文文本"
              active={activeTab === "original"}
              onPress={() => setActiveTab("original")}
            />
            <DetailTab
              label="画面描述"
              active={activeTab === "scene"}
              onPress={() => setActiveTab("scene")}
            />
            <DetailTab
              label="朗读文本"
              active={activeTab === "read"}
              onPress={() => setActiveTab("read")}
            />
          </View>

          <View style={styles.textCard}>
            <Text style={styles.textCardContent}>{tabContent}</Text>
          </View>

          <View style={styles.actionRow}>
            <ActionChipButton
              label={isGeneratingText ? "生成中..." : "生成文本"}
              iconName="sparkles"
              backgroundColor="#4E87DD"
              disabled={isGeneratingText || isGeneratingAudio}
              onPress={() => {
                void handleGenerateText();
              }}
            />
            <ActionChipButton
              label={isGeneratingAudio ? "生成中..." : "生成语音"}
              iconName="volume-medium"
              backgroundColor="#5FB05A"
              disabled={
                !page.readAloudText.trim() || isGeneratingText || isGeneratingAudio
              }
              onPress={() => {
                void handleGenerateAudio();
              }}
            />
            <Pressable
              style={({ pressed }) => [
                styles.playCircleButton,
                pressed ? styles.pressed : null,
                !page.audioPath || page.audioStatus !== "done"
                  ? styles.disabled
                  : null,
              ]}
              onPress={() => {
                if (!page.audioPath || page.audioStatus !== "done") return;
                void togglePlay();
              }}
              disabled={!page.audioPath || page.audioStatus !== "done"}
            >
              <Ionicons
                name={playbackState === "playing" ? "pause" : "play"}
                size={24}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          <View style={styles.statusCard}>
            <StatusRow label="文本状态">
              <StatusBadge descriptor={textStatusDescriptor} />
            </StatusRow>
            <StatusRow label="语音状态">
              <StatusBadge descriptor={audioStatusDescriptor} />
            </StatusRow>
            <StatusRow label="最近生成">
              <Text style={styles.statusPlainText}>{formatDateTime(page.updatedAt)}</Text>
            </StatusRow>
            <StatusRow label="TTS 配置">
              <Text style={styles.statusPlainText}>{ttsConfigLabel}</Text>
            </StatusRow>
          </View>

          {hasError ? (
            <View style={styles.errorCard}>
              <View style={styles.errorMain}>
                <View style={styles.errorTitleRow}>
                  <Ionicons name="alert-circle" size={18} color="#E26C47" />
                  <Text style={styles.errorTitle}>生成失败</Text>
                </View>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed ? styles.pressed : null,
                  isGeneratingText || isGeneratingAudio ? styles.disabled : null,
                ]}
                onPress={() => {
                  void handleRetry();
                }}
                disabled={isGeneratingText || isGeneratingAudio}
              >
                <Text style={styles.retryButtonText}>
                  {isGeneratingText || isGeneratingAudio ? "处理中..." : "重试"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.playerBar}>
          <View style={styles.playerInfo}>
            <View style={styles.playerThumbWrap}>
              {imageUri ? (
                <PreviewImage
                  source={{ uri: imageUri }}
                  style={styles.playerThumb}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.playerFallbackThumb}>
                  <Ionicons name="moon" size={18} color="#F7D36E" />
                </View>
              )}
            </View>

            <View style={styles.playerTextWrap}>
              <Text numberOfLines={1} style={styles.playerTitle}>
                {book.title}
              </Text>
              <Text numberOfLines={1} style={styles.playerSubtitle}>
                第 {pageNumber} / {totalPageCount} 页
              </Text>
            </View>
          </View>

          <View style={styles.playerControls}>
            <Pressable
              style={({ pressed }) => [
                styles.playerIconButton,
                pressed && prevPage ? styles.pressed : null,
                !prevPage ? styles.disabled : null,
              ]}
              onPress={() => openNeighborPage(prevPage)}
              disabled={!prevPage}
            >
              <Ionicons name="play-skip-back" size={18} color="#3F342E" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.playerPlayButton,
                pressed ? styles.pressed : null,
                !page.audioPath || page.audioStatus !== "done"
                  ? styles.disabled
                  : null,
              ]}
              onPress={() => {
                if (!page.audioPath || page.audioStatus !== "done") return;
                void togglePlay();
              }}
              disabled={!page.audioPath || page.audioStatus !== "done"}
            >
              <Ionicons
                name={playbackState === "playing" ? "pause" : "play"}
                size={18}
                color="#FFFFFF"
              />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.playerIconButton,
                pressed && nextPage ? styles.pressed : null,
                !nextPage ? styles.disabled : null,
              ]}
              onPress={() => openNeighborPage(nextPage)}
              disabled={!nextPage}
            >
              <Ionicons name="play-skip-forward" size={18} color="#3F342E" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.speedChip,
                pressed ? styles.pressed : null,
              ]}
              onPress={() => {
                void cycleSpeed(playbackSpeed);
              }}
            >
              <Text style={styles.speedChipText}>{speedLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F2EC",
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 132,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  centerStateTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#443831",
  },
  centerStateText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#8A7A6C",
    textAlign: "center",
  },
  backButton: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: "#4E87DD",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  heroCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E7DED2",
    backgroundColor: "#DCEAF9",
  },
  heroImage: {
    width: "100%",
    aspectRatio: 1.18,
  },
  fallbackArt: {
    width: "100%",
    aspectRatio: 1.18,
    backgroundColor: "#4D78A8",
    overflow: "hidden",
  },
  fallbackMoonGlow: {
    position: "absolute",
    top: 14,
    right: 34,
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: "rgba(255, 241, 187, 0.24)",
  },
  fallbackMoon: {
    position: "absolute",
    top: 26,
    right: 46,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F8E8A9",
  },
  fallbackMoonEyeLeft: {
    position: "absolute",
    top: 36,
    left: 34,
    width: 7,
    height: 10,
    borderRadius: 4,
    backgroundColor: "#A9784A",
  },
  fallbackMoonEyeRight: {
    position: "absolute",
    top: 36,
    right: 34,
    width: 7,
    height: 10,
    borderRadius: 4,
    backgroundColor: "#A9784A",
  },
  fallbackMoonSmile: {
    position: "absolute",
    bottom: 25,
    left: 33,
    width: 34,
    height: 14,
    borderBottomWidth: 3,
    borderColor: "#A9784A",
    borderRadius: 12,
  },
  fallbackStarSmall: {
    position: "absolute",
    top: 30,
    left: 44,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#F8D675",
  },
  fallbackStarBig: {
    position: "absolute",
    top: 58,
    left: 86,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F8D675",
  },
  fallbackWater: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "34%",
    backgroundColor: "#3A689A",
  },
  fallbackBoatBody: {
    position: "absolute",
    left: 56,
    bottom: 48,
    width: 110,
    height: 34,
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 38,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "#7C5231",
    transform: [{ rotate: "-2deg" }],
  },
  fallbackBoatChildHead: {
    position: "absolute",
    left: 88,
    bottom: 72,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D59A65",
  },
  fallbackBoatChildBody: {
    position: "absolute",
    left: 84,
    bottom: 48,
    width: 36,
    height: 32,
    borderRadius: 14,
    backgroundColor: "#C77031",
  },
  fallbackBoatArm: {
    position: "absolute",
    left: 112,
    bottom: 82,
    width: 36,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D59A65",
    transform: [{ rotate: "-36deg" }],
  },
  tabRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 11,
  },
  tabButtonActive: {
    backgroundColor: "#FFF6EA",
    borderWidth: 1,
    borderColor: "#F3D7B1",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8F8375",
  },
  tabTextActive: {
    color: "#D8863C",
    fontWeight: "700",
  },
  textCard: {
    marginTop: 12,
    minHeight: 132,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8DED2",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textCardContent: {
    fontSize: 16,
    lineHeight: 25,
    color: "#3F3731",
  },
  actionRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionChipButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#7F6A57",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  actionChipButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  playCircleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EE8C2B",
    shadowColor: "#7F6A57",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  statusCard: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8DED2",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusRowLabel: {
    width: 68,
    fontSize: 14,
    fontWeight: "700",
    color: "#5E554D",
  },
  statusRowValue: {
    flex: 1,
    alignItems: "flex-start",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  statusPlainText: {
    fontSize: 14,
    color: "#4C433B",
    lineHeight: 20,
  },
  errorCard: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3C8BF",
    backgroundColor: "#FFF8F6",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorMain: {
    flex: 1,
    gap: 4,
  },
  errorTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#D95736",
  },
  errorText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#8E6D64",
  },
  retryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0A895",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: "#D95838",
    fontSize: 14,
    fontWeight: "700",
  },
  playerBar: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7DCCD",
    backgroundColor: "rgba(255, 252, 246, 0.98)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: "#7E6854",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  playerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  playerThumbWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#D6E1EF",
  },
  playerThumb: {
    width: "100%",
    height: "100%",
  },
  playerFallbackThumb: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#567EAD",
  },
  playerTextWrap: {
    flex: 1,
  },
  playerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#3E342E",
  },
  playerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "#817469",
  },
  playerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playerIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  playerPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3F3730",
  },
  speedChip: {
    minWidth: 52,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5DDD0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
  },
  speedChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#675B51",
  },
  pressed: {
    opacity: 0.84,
  },
  disabled: {
    opacity: 0.46,
  },
});
