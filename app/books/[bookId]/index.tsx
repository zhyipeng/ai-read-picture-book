import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { showAlert, showConfirm } from "@/lib/alert";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionButton } from "@/components/ActionButton";
import { AppHeaderIconButton, AppHeaderSpacer } from "@/components/AppHeader";
import { Dialog } from "@/components/Dialog";
import { PreviewImage } from "@/components/PreviewImage";
import { deleteBook, getBookById } from "@/lib/db/books";
import { listPagesByBookId } from "@/lib/db/pages";
import {
  generateBookAudio,
  generateBookText,
  getGenerationProviderName,
} from "@/lib/services/generation";
import { usePlayer } from "@/lib/services/PlayerContext";
import {
  deleteBookDirectory,
  getPersistedImageUri,
} from "@/lib/storage/files";
import type { Book } from "@/types/book";
import type { Page } from "@/types/page";

type PageLayoutMode = "grid" | "list";

type PageStatusTone = "green" | "greenSoft" | "amber" | "red" | "gray" | "blue";

type PageStatusConfig = {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  tone: PageStatusTone;
};

function getLanguageLabel(language: Book["language"]): string {
  return language === "zh" ? "中文" : "英文";
}

function hasGeneratedText(page: Page): boolean {
  return (
    page.originalText.trim().length > 0 ||
    page.sceneDescription.trim().length > 0 ||
    page.readAloudText.trim().length > 0 ||
    page.textStatus === "done"
  );
}

function getGeneratedPageCount(pages: Page[]): number {
  return pages.filter(hasGeneratedText).length;
}

function getAudioReadyCount(pages: Page[]): number {
  return pages.filter(
    (page) => page.audioStatus === "done" && Boolean(page.audioPath)
  ).length;
}

function getProgressPercent(doneCount: number, totalCount: number): number {
  if (totalCount <= 0) {
    return 0;
  }

  return Math.round((doneCount / totalCount) * 100);
}

function clampCurrentPage(currentPageIndex: number, pageCount: number): number {
  if (pageCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(currentPageIndex, 0), pageCount - 1);
}

function getPageStatus(page: Page): PageStatusConfig {
  if (
    page.textStatus === "error" ||
    page.audioStatus === "error" ||
    page.lastError
  ) {
    return {
      label: "生成失败",
      iconName: "alert-circle",
      tone: "red",
    };
  }

  if (page.audioStatus === "done" && page.audioPath) {
    return {
      label: "语音已生成",
      iconName: "checkmark-circle",
      tone: "green",
    };
  }

  if (page.hasManualEdit) {
    return {
      label: "已编辑待更新",
      iconName: "create",
      tone: "amber",
    };
  }

  if (page.textStatus === "generating" || page.audioStatus === "generating") {
    return {
      label: "生成中",
      iconName: "time",
      tone: "blue",
    };
  }

  if (hasGeneratedText(page)) {
    return {
      label: "文本已生成",
      iconName: "document-text",
      tone: "greenSoft",
    };
  }

  return {
    label: "未生成文本",
    iconName: "ellipse-outline",
    tone: "gray",
  };
}

function getStatusColors(tone: PageStatusTone) {
  if (tone === "green") {
    return {
      backgroundColor: "#E2F5E6",
      borderColor: "#C4E5CA",
      textColor: "#2E7D47",
      iconColor: "#39A75A",
    };
  }

  if (tone === "greenSoft") {
    return {
      backgroundColor: "#EFF7E8",
      borderColor: "#D8EAC9",
      textColor: "#567645",
      iconColor: "#5B8B50",
    };
  }

  if (tone === "amber") {
    return {
      backgroundColor: "#FFF4DF",
      borderColor: "#F4DEB4",
      textColor: "#9B6B16",
      iconColor: "#D89A28",
    };
  }

  if (tone === "blue") {
    return {
      backgroundColor: "#EAF1FF",
      borderColor: "#D4E1FF",
      textColor: "#4466A8",
      iconColor: "#5B84D8",
    };
  }

  if (tone === "red") {
    return {
      backgroundColor: "#FFF1F0",
      borderColor: "#F4D1CC",
      textColor: "#B24C3A",
      iconColor: "#D85E47",
    };
  }

  return {
    backgroundColor: "#F2F0EC",
    borderColor: "#E3DED6",
    textColor: "#7E746A",
    iconColor: "#9C9085",
  };
}

function IllustrationFallback({
  variant = "moon",
  pageNumber,
  style,
}: {
  variant?: "moon" | "boat" | "tree" | "field";
  pageNumber?: number;
  style?: object;
}) {
  const isMoon = variant === "moon";
  const isBoat = variant === "boat";
  const isTree = variant === "tree";

  return (
    <View
      style={[
        styles.illustrationFallback,
        isMoon && styles.illustrationMoonBackground,
        isBoat && styles.illustrationBoatBackground,
        isTree && styles.illustrationTreeBackground,
        !isMoon && !isBoat && !isTree && styles.illustrationFieldBackground,
        style,
      ]}
    >
      <View style={styles.illustrationGlow} />
      <View style={styles.illustrationMoon} />
      <View style={styles.illustrationHillBack} />
      <View style={styles.illustrationHillFront} />
      {isBoat ? (
        <>
          <View style={styles.illustrationBoatBody} />
          <View style={styles.illustrationBoatCharacterHead} />
          <View style={styles.illustrationBoatCharacterBody} />
        </>
      ) : null}
      {isTree ? (
        <>
          <View style={styles.illustrationTreeCanopy} />
          <View style={styles.illustrationTreeTrunk} />
        </>
      ) : null}
      {!isBoat && !isTree ? (
        <>
          <View style={styles.illustrationCharacterHead} />
          <View style={styles.illustrationCharacterBody} />
        </>
      ) : null}
      {pageNumber ? (
        <View style={styles.fallbackPageBadge}>
          <Text style={styles.fallbackPageBadgeText}>{pageNumber}</Text>
        </View>
      ) : null}
    </View>
  );
}

function DetailActionCard({
  iconName,
  iconColor,
  iconBackgroundColor,
  borderColor,
  backgroundColor,
  title,
  subtitle,
  disabled = false,
  onPress,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackgroundColor: string;
  borderColor: string;
  backgroundColor: string;
  title: string;
  subtitle: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionCard,
        {
          borderColor,
          backgroundColor,
        },
        pressed && !disabled ? styles.actionCardPressed : null,
        disabled ? styles.actionCardDisabled : null,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View
        style={[
          styles.actionIconWrap,
          { backgroundColor: iconBackgroundColor },
        ]}
      >
        <Ionicons name={iconName} size={18} color={iconColor} />
      </View>
      <View style={styles.actionTextWrap}>
        <Text style={[styles.actionTitle, { color: iconColor }]}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

function LayoutToggle({
  mode,
  activeMode,
  iconName,
  label,
  onPress,
}: {
  mode: PageLayoutMode;
  activeMode: PageLayoutMode;
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const isActive = mode === activeMode;

  return (
    <Pressable
      style={[styles.layoutToggle, isActive ? styles.layoutToggleActive : null]}
      onPress={onPress}
    >
      <Ionicons
        name={iconName}
        size={14}
        color={isActive ? "#F59E0B" : "#A28A75"}
      />
      <Text
        style={[
          styles.layoutToggleText,
          isActive ? styles.layoutToggleTextActive : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function BookDetailScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const isFocused = useIsFocused();
  const revokeHandlersRef = useRef<(() => void)[]>([]);
  const [book, setBook] = useState<Book | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [pageImageUris, setPageImageUris] = useState<Record<string, string>>({});
  const [pageLayoutMode, setPageLayoutMode] = useState<PageLayoutMode>("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isDeleteDialogVisible, setIsDeleteDialogVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isGeneratingBookText, setIsGeneratingBookText] = useState(false);
  const [isGeneratingBookAudio, setIsGeneratingBookAudio] = useState(false);

  const { playbackState, speed: playbackSpeed, togglePlay, cycleSpeed, startPlaylist, playNext, playPrev, playlist, playlistIndex, registerPlayerBarActions } = usePlayer();

  function cleanupResolvedImages() {
    revokeHandlersRef.current.forEach((revoke) => revoke());
    revokeHandlersRef.current = [];
  }

  useEffect(() => {
    return () => {
      cleanupResolvedImages();
    };
  }, []);

  useEffect(() => {
    if (!isFocused) {
      setIsMenuVisible(false);
      setIsDeleteDialogVisible(false);
    }
  }, [isFocused]);

  useEffect(() => {
    if (!bookId || !isFocused) {
      return;
    }

    let isCancelled = false;

    async function loadBookDetail() {
      try {
        setIsLoading(true);
        setErrorText(null);
        cleanupResolvedImages();

        const [currentBook, currentPages] = await Promise.all([
          getBookById(bookId),
          listPagesByBookId(bookId),
        ]);

        if (isCancelled) {
          return;
        }

        if (!currentBook) {
          setBook(null);
          setPages([]);
          setCoverUri(null);
          setPageImageUris({});
          setErrorText("未找到该绘本。");
          return;
        }

        const imageRevokeHandlers: (() => void)[] = [];
        const imageUriEntries = await Promise.all(
          currentPages.map(async (page) => {
            const imageResult = await getPersistedImageUri(page.imagePath);

            if (imageResult.revoke) {
              imageRevokeHandlers.push(imageResult.revoke);
            }

            return [page.id, imageResult.uri] as const;
          })
        );

        const fallbackCoverPath =
          currentBook.coverImagePath ??
          currentPages.find((page) => page.id === currentBook.coverPageId)?.imagePath ??
          currentPages[0]?.imagePath ??
          null;

        let resolvedCoverUri: string | null = null;

        if (fallbackCoverPath) {
          const coverResult = await getPersistedImageUri(fallbackCoverPath);
          resolvedCoverUri = coverResult.uri;

          if (coverResult.revoke) {
            imageRevokeHandlers.push(coverResult.revoke);
          }
        }

        if (isCancelled) {
          imageRevokeHandlers.forEach((revoke) => revoke());
          return;
        }

        revokeHandlersRef.current = imageRevokeHandlers;
        setBook(currentBook);
        setPages(currentPages);
        setCoverUri(resolvedCoverUri);
        setPageImageUris(Object.fromEntries(imageUriEntries));
      } catch (error) {
        console.error("Failed to load book detail", error);

        if (isCancelled) {
          return;
        }

        setBook(null);
        setPages([]);
        setCoverUri(null);
        setPageImageUris({});
        setErrorText("绘本详情加载失败，请稍后重试。");
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadBookDetail();

    return () => {
      isCancelled = true;
    };
  }, [bookId, isFocused, refreshKey]);

  const pageCount = Math.max(book?.pageCount ?? 0, pages.length);
  const generatedPageCount = getGeneratedPageCount(pages);
  const audioReadyCount = getAudioReadyCount(pages);
  const progressPercent = getProgressPercent(generatedPageCount, pageCount);
  const currentPageIndex = clampCurrentPage(
    book?.currentPageIndex ?? 0,
    Math.max(pageCount, pages.length)
  );
  const currentReadingPage = currentPageIndex + 1;
  const currentPage = pages[currentPageIndex] ?? pages[0] ?? null;
  const languageLabel = book ? getLanguageLabel(book.language) : "--";
  const coverVariant = pages.length % 4 === 0 ? "tree" : "moon";

  const playablePages = useMemo(
    () => pages.filter((p) => p.audioStatus === "done" && Boolean(p.audioPath)),
    [pages]
  );

  useEffect(() => {
    if (!isFocused) return;
    registerPlayerBarActions({
      onPlayPause: () => {
        if (playlist.length === 0) {
          handleStartPlaylist();
        } else {
          void togglePlay();
        }
      },
    });
  }, [isFocused, playlist.length, playablePages]);

  function handleStartPlaylist() {
    if (!book || playablePages.length === 0) return;
    const items = playablePages.map((p) => ({
      bookId: book.id,
      pageId: p.id,
      bookTitle: book.title,
      pageIndex: p.pageIndex,
      totalPages: pageCount,
      imageUri: pageImageUris[p.id] ?? coverUri,
      audioPath: p.audioPath!,
    }));
    const idx = playablePages.findIndex((p) => p.id === currentPage?.id);
    startPlaylist(items, idx >= 0 ? idx : 0);
  }

  async function handleGenerateBookText() {
    if (!book || pages.length === 0 || isGeneratingBookText) {
      return;
    }

    if (generatedPageCount > 0) {
      const confirmed = await showConfirm(
        "重新生成文本",
        `已有 ${generatedPageCount} 页生成了文本，重新生成将覆盖已有内容，是否继续？`
      );
      if (!confirmed) return;
    }

    try {
      setIsGeneratingBookText(true);

      const result = await generateBookText({
        book,
        pages,
      });

      setRefreshKey((value) => value + 1);
      showAlert(
        "生成完成",
        `已为 ${result.generatedCount} 页生成文本。`
      );
    } catch (error) {
      console.error("Failed to generate book text", error);
      showAlert("生成失败", String(error));
    } finally {
      setIsGeneratingBookText(false);
    }
  }

  async function handleGenerateBookAudio() {
    if (!book || pages.length === 0 || isGeneratingBookAudio) {
      return;
    }

    if (audioReadyCount > 0) {
      const confirmed = await showConfirm(
        "重新生成语音",
        `已有 ${audioReadyCount} 页生成了语音，重新生成将覆盖已有内容，是否继续？`
      );
      if (!confirmed) return;
    }

    try {
      setIsGeneratingBookAudio(true);

      const result = await generateBookAudio({
        book,
        pages,
      });

      setRefreshKey((value) => value + 1);
      showAlert(
        "生成完成",
        result.skippedCount > 0
          ? `已为 ${result.generatedCount} 页生成语音，跳过 ${result.skippedCount} 页未生成文本的页面。`
          : `已为 ${result.generatedCount} 页生成语音。`
      );
    } catch (error) {
      console.error("Failed to generate book audio", error);
      showAlert("生成失败", `整本语音生成未完成，请稍后重试。${error}`);
    } finally {
      setIsGeneratingBookAudio(false);
    }
  }

  function handleOpenEdit() {
    if (!book) {
      return;
    }

    setIsMenuVisible(false);
    router.push(`/books/${book.id}/edit`);
  }

  function handleOpenDeleteDialog() {
    setIsMenuVisible(false);
    setIsDeleteDialogVisible(true);
  }

  async function handleConfirmDelete() {
    if (!book || isDeleting) {
      return;
    }

    try {
      setIsDeleting(true);

      const [deleteBookResult, deleteDirectoryResult] = await Promise.allSettled([
        deleteBook(book.id),
        deleteBookDirectory(book.id),
      ]);

      if (deleteBookResult.status === "rejected") {
        throw deleteBookResult.reason;
      }

      if (deleteDirectoryResult.status === "rejected") {
        console.error(
          "Failed to delete book directory",
          deleteDirectoryResult.reason
        );
      }

      setIsDeleteDialogVisible(false);
      router.replace("/");
    } catch (error) {
      console.error("Failed to delete book", error);
      showAlert("删除失败", "绘本删除未完成，请稍后重试。");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <Stack.Screen
          options={{
            headerRight: () => <AppHeaderSpacer />,
          }}
        />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#5E84D1" />
          <Text style={styles.stateText}>正在加载绘本详情...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!book || errorText) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <Stack.Screen
          options={{
            headerRight: () => <AppHeaderSpacer />,
          }}
        />
        <View style={styles.centerState}>
          <Ionicons name="book-outline" size={34} color="#9E907F" />
          <Text style={styles.stateTitle}>绘本暂不可用</Text>
          <Text style={styles.stateText}>{errorText ?? "未找到该绘本。"}</Text>
          <ActionButton
            label="返回首页"
            onPress={() => router.replace("/")}
            style={styles.backHomeButton}
            textStyle={styles.backHomeButtonText}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <AppHeaderIconButton
              iconName="ellipsis-horizontal"
              onPress={() => setIsMenuVisible(true)}
            />
          ),
        }}
      />
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            {coverUri ? (
              <PreviewImage
                source={{ uri: coverUri }}
                style={styles.coverImage}
                contentFit="cover"
              />
            ) : (
              <IllustrationFallback variant={coverVariant} style={styles.coverImage} />
            )}

            <View style={styles.heroBody}>
              <Text style={styles.bookTitle}>{book.title}</Text>

              <View style={styles.metaRow}>
                <View style={styles.languagePill}>
                  <Text style={styles.languagePillText}>{languageLabel}</Text>
                </View>
                <Text style={styles.metaDivider}>•</Text>
                <Text style={styles.metaText}>{pageCount} 页</Text>
              </View>

              <View style={styles.progressBlock}>
                <Text style={styles.progressLabel}>
                  生成进度 {generatedPageCount}/{pageCount} ({progressPercent}%)
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progressPercent}%` },
                    ]}
                  />
                </View>
              </View>

              <Text style={styles.recentReadText}>
                最近阅读：第 {currentReadingPage} 页
              </Text>
            </View>
          </View>

          <View style={styles.actionSection}>
            <DetailActionCard
              iconName="sparkles"
              iconColor="#4B74D4"
              iconBackgroundColor="#E9F0FF"
              borderColor="#C9D8FF"
              backgroundColor="#F6F9FF"
              title={isGeneratingBookText ? "生成中..." : "生成整本内容"}
              subtitle={
                isGeneratingBookText
                  ? "正在批量填充原文、画面描述和朗读文本"
                  : "（文本 + 插图 + 朗读文本）"
              }
              disabled={pages.length === 0 || isGeneratingBookText || isGeneratingBookAudio}
              onPress={() => {
                void handleGenerateBookText();
              }}
            />
            <DetailActionCard
              iconName="mic"
              iconColor="#4A8A55"
              iconBackgroundColor="#E6F4E9"
              borderColor="#CAE4CE"
              backgroundColor="#F6FBF7"
              title={isGeneratingBookAudio ? "生成中..." : "生成整本语音"}
              subtitle={
                isGeneratingBookAudio
                  ? "正在批量生成朗读语音"
                  : audioReadyCount > 0
                  ? `已为 ${audioReadyCount} 页生成语音`
                  : "为已生成文本的页面"
              }
              disabled={pages.length === 0 || isGeneratingBookText || isGeneratingBookAudio}
              onPress={() => {
                void handleGenerateBookAudio();
              }}
            />
            <DetailActionCard
              iconName={playbackState === "playing" ? "pause-circle" : "play"}
              iconColor="#E28B38"
              iconBackgroundColor="#FFF0E1"
              borderColor="#F2D2B0"
              backgroundColor="#FFF9F2"
              title={
                playbackState === "playing"
                  ? "暂停播放"
                  : playlist.length > 0
                    ? "继续播放"
                    : "连续播放"
              }
              subtitle={
                playlist.length > 0 && playlistIndex >= 0
                  ? `正在第 ${(playlist[playlistIndex]?.pageIndex ?? -1) + 1} 页`
                  : "（仅播放已有音频的页面）"
              }
              disabled={audioReadyCount === 0}
              onPress={() => {
                if (playlist.length === 0) {
                  handleStartPlaylist();
                } else {
                  void togglePlay();
                }
              }}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>页面列表</Text>
            <View style={styles.layoutSwitch}>
              <LayoutToggle
                mode="grid"
                activeMode={pageLayoutMode}
                iconName="grid-outline"
                label="网格"
                onPress={() => setPageLayoutMode("grid")}
              />
              <LayoutToggle
                mode="list"
                activeMode={pageLayoutMode}
                iconName="list-outline"
                label="列表"
                onPress={() => setPageLayoutMode("list")}
              />
            </View>
          </View>

          {pages.length > 0 ? (
            <View
              style={[
                styles.pageCollection,
                pageLayoutMode === "list" ? styles.pageCollectionList : null,
              ]}
            >
              {pages.map((page, index) => {
                const status = getPageStatus(page);
                const statusColors = getStatusColors(status.tone);
                const pageNumber = page.pageIndex + 1;
                const imageUri = pageImageUris[page.id];
                const fallbackVariant =
                  index % 4 === 0
                    ? "tree"
                    : index % 4 === 1
                      ? "boat"
                      : index % 4 === 2
                        ? "moon"
                        : "field";

                return (
                  <Pressable
                    key={page.id}
                    style={[
                      styles.pageCard,
                      pageLayoutMode === "list" ? styles.pageCardList : null,
                    ]}
                    onPress={() => router.push(`/books/${book.id}/page/${page.id}`)}
                  >
                    <View
                      style={[
                        styles.pageThumbnailWrap,
                        pageLayoutMode === "list"
                          ? styles.pageThumbnailWrapList
                          : null,
                      ]}
                    >
                      {imageUri ? (
                        <PreviewImage
                          source={{ uri: imageUri }}
                          style={styles.pageThumbnail}
                          contentFit="cover"
                        />
                      ) : (
                        <IllustrationFallback
                          variant={fallbackVariant}
                          pageNumber={pageNumber}
                          style={styles.pageThumbnail}
                        />
                      )}
                      <View style={styles.pageNumberBadge}>
                        <Text style={styles.pageNumberText}>{pageNumber}</Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.pageCardBody,
                        pageLayoutMode === "list" ? styles.pageCardBodyList : null,
                      ]}
                    >
                      {pageLayoutMode === "list" ? (
                        <Text style={styles.pageCardTitle}>第 {pageNumber} 页</Text>
                      ) : null}
                      <View
                        style={[
                          styles.pageStatusPill,
                          {
                            backgroundColor: statusColors.backgroundColor,
                            borderColor: statusColors.borderColor,
                          },
                        ]}
                      >
                        <Ionicons
                          name={status.iconName}
                          size={12}
                          color={statusColors.iconColor}
                        />
                        <Text
                          style={[
                            styles.pageStatusText,
                            { color: statusColors.textColor },
                          ]}
                        >
                          {status.label}
                        </Text>
                      </View>
                      {pageLayoutMode === "list" ? (
                        <Text style={styles.pageMetaHint}>
                          {page.audioPath
                            ? "已生成朗读音频"
                            : hasGeneratedText(page)
                              ? "可继续生成语音"
                              : "待生成页面文本"}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="images-outline" size={26} color="#A59583" />
              <Text style={styles.emptyTitle}>还没有页面图片</Text>
              <Text style={styles.emptyDescription}>
                当前绘本未导入页面，后续可在新建或编辑流程中补充。
              </Text>
            </View>
          )}
        </ScrollView>

        {isMenuVisible ? (
          <View style={styles.menuOverlay}>
            <Pressable
              style={styles.menuBackdrop}
              onPress={() => setIsMenuVisible(false)}
            />
            <View style={styles.menuCard}>
              <Pressable style={styles.menuItem} onPress={handleOpenEdit}>
                <Ionicons name="create-outline" size={18} color="#4A4037" />
                <Text style={styles.menuItemText}>编辑</Text>
              </Pressable>
              <View style={styles.menuDivider} />
              <Pressable style={styles.menuItem} onPress={handleOpenDeleteDialog}>
                <Ionicons name="trash-outline" size={18} color="#B14D35" />
                <Text style={styles.menuItemDangerText}>删除</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <Dialog
        visible={isDeleteDialogVisible}
        title="删除绘本"
        message={`确认删除《${book.title}》吗？这会同时移除绘本记录、页面图片和已生成音频。`}
        confirmText={isDeleting ? "删除中..." : "删除"}
        cancelText="取消"
        onConfirm={() => {
          void handleConfirmDelete();
        }}
        onCancel={() => {
          if (isDeleting) {
            return;
          }

          setIsDeleteDialogVisible(false);
        }}
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
  screen: {
    flex: 1,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuCard: {
    position: "absolute",
    top: 12,
    right: 18,
    width: 132,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EADFD2",
    backgroundColor: "#FFFDF9",
    paddingVertical: 6,
    shadowColor: "#8A725A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4A4037",
  },
  menuItemDangerText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#B14D35",
  },
  menuDivider: {
    marginHorizontal: 12,
    height: 1,
    backgroundColor: "#EFE4D8",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 120,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#41372F",
  },
  stateText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    color: "#857766",
  },
  backHomeButton: {
    minWidth: 120,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#5F84D1",
  },
  backHomeButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
  },
  heroCard: {
    flexDirection: "row",
    gap: 14,
    padding: 14,
    borderRadius: 24,
    backgroundColor: "#FBF8F3",
    shadowColor: "#A58E79",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  coverImage: {
    width: 102,
    height: 138,
    borderRadius: 20,
    backgroundColor: "#E9E1D5",
  },
  heroBody: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  bookTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "800",
    color: "#2F2620",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  languagePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "#ECE9E1",
  },
  languagePillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6D6257",
  },
  metaDivider: {
    fontSize: 14,
    color: "#AA9A89",
  },
  metaText: {
    fontSize: 14,
    color: "#6E6257",
  },
  progressBlock: {
    marginTop: 8,
    gap: 6,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5A4C3E",
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#ECE5DC",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#5C8FDE",
  },
  recentReadText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#74675D",
  },
  actionSection: {
    gap: 12,
    marginTop: 18,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 15,
    borderRadius: 18,
    borderWidth: 1,
  },
  actionCardPressed: {
    opacity: 0.92,
  },
  actionCardDisabled: {
    opacity: 0.52,
  },
  actionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextWrap: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontSize: 19,
    fontWeight: "800",
  },
  actionSubtitle: {
    fontSize: 13,
    color: "#7A7067",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#41362E",
  },
  layoutSwitch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  layoutToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  layoutToggleActive: {
    backgroundColor: "#FFF3DF",
    borderRadius: 999,
    paddingHorizontal: 8,
  },
  layoutToggleText: {
    fontSize: 14,
    color: "#9B8B7D",
  },
  layoutToggleTextActive: {
    fontWeight: "700",
    color: "#E28B38",
  },
  pageCollection: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  pageCollectionList: {
    flexDirection: "column",
    flexWrap: "nowrap",
  },
  pageCard: {
    width: "31.5%",
    padding: 8,
    borderRadius: 16,
    backgroundColor: "#FBF8F3",
    borderWidth: 1,
    borderColor: "#EFE6DA",
    shadowColor: "#AB9882",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  pageCardList: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
  },
  pageThumbnailWrap: {
    position: "relative",
  },
  pageThumbnailWrapList: {
    width: 92,
  },
  pageThumbnail: {
    width: "100%",
    aspectRatio: 0.84,
    borderRadius: 12,
    backgroundColor: "#E9E1D5",
  },
  pageNumberBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  pageNumberText: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    color: "#5D4F43",
  },
  pageCardBody: {
    marginTop: 8,
    alignItems: "center",
  },
  pageCardBodyList: {
    flex: 1,
    alignItems: "flex-start",
    marginTop: 0,
    gap: 8,
  },
  pageCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#40352D",
  },
  pageStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  pageStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  pageMetaHint: {
    fontSize: 13,
    color: "#807468",
  },
  emptyCard: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 26,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8DED2",
    backgroundColor: "#FBF8F3",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#473B31",
  },
  emptyDescription: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#887B6E",
  },
  playerBar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E3D8CC",
    backgroundColor: "rgba(253, 251, 247, 0.98)",
    shadowColor: "#8A725A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 8,
  },
  playerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  playerThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#E9E1D5",
  },
  playerTextWrap: {
    flex: 1,
    gap: 2,
  },
  playerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#42372F",
  },
  playerSubtitle: {
    fontSize: 12,
    color: "#7D7165",
  },
  playerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  playerIconButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  playerPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F261F",
  },
  speedChip: {
    marginLeft: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F0ECE6",
  },
  speedChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5D5146",
  },
  illustrationFallback: {
    position: "relative",
    overflow: "hidden",
  },
  illustrationMoonBackground: {
    backgroundColor: "#5376A7",
  },
  illustrationBoatBackground: {
    backgroundColor: "#8BAED8",
  },
  illustrationTreeBackground: {
    backgroundColor: "#C9D88E",
  },
  illustrationFieldBackground: {
    backgroundColor: "#96C186",
  },
  illustrationGlow: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 246, 189, 0.28)",
  },
  illustrationMoon: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F6E39A",
  },
  illustrationHillBack: {
    position: "absolute",
    left: -8,
    right: -8,
    bottom: 16,
    height: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "rgba(95, 117, 72, 0.55)",
  },
  illustrationHillFront: {
    position: "absolute",
    left: -6,
    right: -6,
    bottom: -4,
    height: 34,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "rgba(74, 98, 58, 0.78)",
  },
  illustrationCharacterHead: {
    position: "absolute",
    left: 26,
    bottom: 40,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#E5B388",
  },
  illustrationCharacterBody: {
    position: "absolute",
    left: 25,
    bottom: 24,
    width: 16,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#D68547",
  },
  illustrationBoatBody: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 22,
    height: 12,
    borderRadius: 12,
    backgroundColor: "#8D6644",
  },
  illustrationBoatCharacterHead: {
    position: "absolute",
    left: 40,
    bottom: 36,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E6C098",
  },
  illustrationBoatCharacterBody: {
    position: "absolute",
    left: 38,
    bottom: 24,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#6E8FBE",
  },
  illustrationTreeCanopy: {
    position: "absolute",
    left: 22,
    bottom: 28,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#7EA25E",
  },
  illustrationTreeTrunk: {
    position: "absolute",
    left: 36,
    bottom: 18,
    width: 8,
    height: 20,
    borderRadius: 4,
    backgroundColor: "#7F5A38",
  },
  fallbackPageBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.88)",
  },
  fallbackPageBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    color: "#56483D",
  },
  disabled: {
    opacity: 0.42,
  },
});
