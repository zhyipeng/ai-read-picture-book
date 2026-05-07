import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionButton } from "@/components/ActionButton";
import { createBook, deleteBook, getBookById, updateBook } from "@/lib/db/books";
import {
  createPages,
  deletePageById,
  listPagesByBookId,
  updatePage,
} from "@/lib/db/pages";
import { createId } from "@/lib/db/utils";
import {
  deleteBookDirectory,
  deleteFileIfExists,
  getPersistedImageUri,
  persistImageToBook,
} from "@/lib/storage/files";
import type { Book } from "@/types/book";
import type { BookLanguage } from "@/types/common";
import type { Page } from "@/types/page";

const LANGUAGE_OPTIONS: {
  label: string;
  value: BookLanguage;
}[] = [
  { label: "中文", value: "zh" },
  { label: "英文", value: "en" },
];

type BookEditorMode = "create" | "edit";

type BookEditorScreenProps = {
  mode: BookEditorMode;
  bookId?: string;
};

type EditorImage = {
  id: string;
  uri: string;
  fileName: string | null;
  width: number | null;
  height: number | null;
  file?: File | null;
  imagePath?: string | null;
  pageId?: string;
  isExisting: boolean;
};

function mapPickedAsset(asset: ImagePicker.ImagePickerAsset): EditorImage {
  return {
    id: createId("import"),
    uri: asset.uri,
    fileName: asset.fileName ?? null,
    width: asset.width,
    height: asset.height,
    file: asset.file,
    isExisting: false,
  };
}

function normalizePickedAssets(
  assets: ImagePicker.ImagePickerAsset[]
): EditorImage[] {
  return assets.map(mapPickedAsset);
}

function clampCurrentPageIndex(currentPageIndex: number, pageCount: number): number {
  if (pageCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(currentPageIndex, 0), pageCount - 1);
}

function getImageMetaText(image: EditorImage, fallbackText: string): string {
  if (image.width && image.height) {
    return `${image.width} × ${image.height}`;
  }

  return fallbackText;
}

export function BookEditorScreen({
  mode,
  bookId,
}: BookEditorScreenProps) {
  const revokeHandlersRef = useRef<(() => void)[]>([]);
  const [originalBook, setOriginalBook] = useState<Book | null>(null);
  const [originalPages, setOriginalPages] = useState<Page[]>([]);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<BookLanguage>("zh");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<EditorImage | null>(null);
  const [pendingImages, setPendingImages] = useState<EditorImage[]>([]);
  const [isPickingCoverImage, setIsPickingCoverImage] = useState(false);
  const [isPickingImages, setIsPickingImages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(mode === "edit");
  const [loadError, setLoadError] = useState<string | null>(null);

  const trimmedTitle = title.trim();
  const pageCount = pendingImages.length;
  const canSave = trimmedTitle.length > 0 && !isSaving && !isInitializing;
  const isEditMode = mode === "edit";

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
    if (!isEditMode) {
      return;
    }

    if (!bookId) {
      setLoadError("缺少绘本标识，无法编辑。");
      setIsInitializing(false);
      return;
    }

    const currentBookId = bookId;
    let isCancelled = false;

    async function loadInitialData() {
      try {
        setIsInitializing(true);
        setLoadError(null);
        cleanupResolvedImages();

        const [currentBook, currentPages] = await Promise.all([
          getBookById(currentBookId),
          listPagesByBookId(currentBookId),
        ]);

        if (isCancelled) {
          return;
        }

        if (!currentBook) {
          setLoadError("未找到该绘本，无法编辑。");
          setOriginalBook(null);
          setOriginalPages([]);
          setCoverImage(null);
          setPendingImages([]);
          return;
        }

        const imageRevokeHandlers: (() => void)[] = [];
        const resolvedPages = await Promise.all(
          currentPages.map(async (page) => {
            const imageResult = await getPersistedImageUri(page.imagePath);

            if (imageResult.revoke) {
              imageRevokeHandlers.push(imageResult.revoke);
            }

            return {
              id: page.id,
              pageId: page.id,
              uri: imageResult.uri,
              fileName: `页面 ${page.pageIndex + 1}`,
              width: null,
              height: null,
              imagePath: page.imagePath,
              isExisting: true,
            } satisfies EditorImage;
          })
        );

        let resolvedCoverImage: EditorImage | null = null;

        if (currentBook.coverImagePath) {
          const coverResult = await getPersistedImageUri(currentBook.coverImagePath);

          if (coverResult.revoke) {
            imageRevokeHandlers.push(coverResult.revoke);
          }

          resolvedCoverImage = {
            id: "cover-existing",
            uri: coverResult.uri,
            fileName: "当前封面",
            width: null,
            height: null,
            imagePath: currentBook.coverImagePath,
            isExisting: true,
          };
        }

        if (isCancelled) {
          imageRevokeHandlers.forEach((revoke) => revoke());
          return;
        }

        revokeHandlersRef.current = imageRevokeHandlers;
        setOriginalBook(currentBook);
        setOriginalPages(currentPages);
        setTitle(currentBook.title);
        setLanguage(currentBook.language);
        setCoverImage(resolvedCoverImage);
        setPendingImages(resolvedPages);
      } catch (error) {
        console.error("Failed to load book editor data", error);

        if (isCancelled) {
          return;
        }

        setLoadError("绘本编辑信息加载失败，请稍后重试。");
      } finally {
        if (!isCancelled) {
          setIsInitializing(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      isCancelled = true;
    };
  }, [bookId, isEditMode]);

  async function ensureMediaLibraryPermission(): Promise<boolean> {
    if (Platform.OS === "web") {
      return true;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.granted) {
      return true;
    }

    Alert.alert("需要相册权限", "请允许访问相册后再导入绘本封面或页面图片。");
    return false;
  }

  async function handlePickCoverImage() {
    if (isPickingCoverImage || isPickingImages || isSaving || isInitializing) {
      return;
    }

    try {
      setIsPickingCoverImage(true);

      const permissionGranted = await ensureMediaLibraryPermission();

      if (!permissionGranted) {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      setCoverImage(mapPickedAsset(result.assets[0]));
    } catch (error) {
      console.error("Failed to pick cover image", error);
      Alert.alert("导入失败", "绘本封面导入未完成，请稍后重试。");
    } finally {
      setIsPickingCoverImage(false);
    }
  }

  async function handlePickImages() {
    if (isPickingCoverImage || isPickingImages || isSaving || isInitializing) {
      return;
    }

    try {
      setIsPickingImages(true);

      const permissionGranted = await ensureMediaLibraryPermission();

      if (!permissionGranted) {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 0,
        orderedSelection: true,
        quality: 1,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      setPendingImages((current) => [
        ...current,
        ...normalizePickedAssets(result.assets),
      ]);
    } catch (error) {
      console.error("Failed to pick images", error);
      Alert.alert("导入失败", "页面图片导入未完成，请稍后重试。");
    } finally {
      setIsPickingImages(false);
    }
  }

  function handleRemovePendingImage(id: string) {
    setPendingImages((current) => current.filter((item) => item.id !== id));
  }

  async function handleCreateBook() {
    let createdBookId: string | null = null;

    try {
      setIsSaving(true);
      setTitleError(null);

      const book = await createBook({
        title: trimmedTitle,
        language,
        pageCount,
      });
      createdBookId = book.id;

      let coverImagePath: string | null = null;

      if (coverImage) {
        coverImagePath = await persistImageToBook({
          bookId: book.id,
          pageId: "cover",
          sourceUri: coverImage.uri,
          webFile: coverImage.file,
        });
      }

      if (pageCount > 0) {
        const pageInputs = await Promise.all(
          pendingImages.map(async (item, index) => {
            const pageId = createId("page");
            const imagePath = await persistImageToBook({
              bookId: book.id,
              pageId,
              sourceUri: item.uri,
              webFile: item.file,
            });

            return {
              id: pageId,
              bookId: book.id,
              pageIndex: index,
              imagePath,
            };
          })
        );

        await createPages(pageInputs);

        await updateBook(book.id, {
          coverImagePath,
          coverPageId: pageInputs[0]?.id ?? null,
          pageCount,
        });
      } else if (coverImagePath) {
        await updateBook(book.id, {
          coverImagePath,
        });
      }

      router.replace(`/books/${book.id}`);
    } catch (error) {
      console.error("Failed to create book", error);

      if (createdBookId) {
        await Promise.allSettled([
          deleteBook(createdBookId),
          deleteBookDirectory(createdBookId),
        ]);
      }

      Alert.alert("保存失败", "绘本保存未完成，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateBook() {
    if (!originalBook || !bookId) {
      Alert.alert("无法保存", "绘本信息缺失，请返回后重试。");
      return;
    }

    try {
      setIsSaving(true);
      setTitleError(null);

      let nextCoverImagePath = originalBook.coverImagePath ?? null;
      let removableOldCoverPath: string | null = null;

      if (!coverImage) {
        nextCoverImagePath = null;
        removableOldCoverPath = originalBook.coverImagePath ?? null;
      } else if (!coverImage.isExisting) {
        nextCoverImagePath = await persistImageToBook({
          bookId: originalBook.id,
          pageId: createId("cover"),
          sourceUri: coverImage.uri,
          webFile: coverImage.file,
        });
        removableOldCoverPath = originalBook.coverImagePath ?? null;
      }

      const keptExistingPages = pendingImages.filter(
        (item): item is EditorImage & { pageId: string; imagePath: string } =>
          item.isExisting && Boolean(item.pageId) && Boolean(item.imagePath)
      );
      const keptExistingPageIds = new Set(
        keptExistingPages.map((item) => item.pageId)
      );
      const removedPages = originalPages.filter(
        (page) => !keptExistingPageIds.has(page.id)
      );

      for (const page of removedPages) {
        await deletePageById(page.id);
        await deleteFileIfExists(page.imagePath);

        if (page.audioPath) {
          await deleteFileIfExists(page.audioPath);
        }
      }

      for (const [index, item] of keptExistingPages.entries()) {
        await updatePage(item.pageId, {
          pageIndex: index,
        });
      }

      const createdPageInputs = [];
      const createdPageIds: string[] = [];
      let nextIndex = keptExistingPages.length;

      for (const item of pendingImages) {
        if (item.isExisting) {
          continue;
        }

        const pageId = createId("page");
        const imagePath = await persistImageToBook({
          bookId: originalBook.id,
          pageId,
          sourceUri: item.uri,
          webFile: item.file,
        });

        createdPageInputs.push({
          id: pageId,
          bookId: originalBook.id,
          pageIndex: nextIndex,
          imagePath,
        });
        createdPageIds.push(pageId);
        nextIndex += 1;
      }

      if (createdPageInputs.length > 0) {
        await createPages(createdPageInputs);
      }

      const finalPageIds = [
        ...keptExistingPages.map((item) => item.pageId),
        ...createdPageIds,
      ];

      let nextCoverPageId = originalBook.coverPageId;

      if (!nextCoverPageId || !finalPageIds.includes(nextCoverPageId)) {
        nextCoverPageId = finalPageIds[0] ?? null;
      }

      await updateBook(originalBook.id, {
        title: trimmedTitle,
        language,
        coverImagePath: nextCoverImagePath,
        coverPageId: nextCoverPageId,
        pageCount: finalPageIds.length,
        currentPageIndex: clampCurrentPageIndex(
          originalBook.currentPageIndex,
          finalPageIds.length
        ),
      });

      if (
        removableOldCoverPath &&
        removableOldCoverPath !== nextCoverImagePath
      ) {
        await deleteFileIfExists(removableOldCoverPath);
      }

      router.replace(`/books/${originalBook.id}`);
    } catch (error) {
      console.error("Failed to update book", error);
      Alert.alert("保存失败", "绘本更新未完成，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    if (!trimmedTitle) {
      setTitleError("请输入绘本名称");
      return;
    }

    if (isEditMode) {
      await handleUpdateBook();
      return;
    }

    await handleCreateBook();
  }

  if (isInitializing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#5E84D1" />
          <Text style={styles.stateText}>正在加载绘本信息...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <View style={styles.centerState}>
          <Ionicons name="book-outline" size={34} color="#9E907F" />
          <Text style={styles.stateTitle}>绘本暂不可编辑</Text>
          <Text style={styles.stateText}>{loadError}</Text>
          <ActionButton
            label="返回上一页"
            onPress={() => router.back()}
            style={styles.backButton}
            textStyle={styles.backButtonText}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <View style={styles.section}>
              <Text style={styles.label}>
                书名 <Text style={styles.requiredMark}>*</Text>
              </Text>
              <TextInput
                placeholder="请输入绘本名称"
                placeholderTextColor="#c0c7d4"
                style={[
                  styles.textInput,
                  titleError ? styles.textInputError : null,
                ]}
                value={title}
                onChangeText={(value) => {
                  setTitle(value);

                  if (titleError && value.trim()) {
                    setTitleError(null);
                  }
                }}
                onBlur={() => {
                  if (!title.trim()) {
                    setTitleError("请输入绘本名称");
                  }
                }}
                maxLength={80}
                returnKeyType="done"
              />
              {titleError ? (
                <Text style={styles.errorText}>{titleError}</Text>
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>
                绘本语言 <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View style={styles.languageRow}>
                {LANGUAGE_OPTIONS.map((option) => {
                  const selected = option.value === language;

                  return (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.languageButton,
                        selected ? styles.languageButtonSelected : null,
                      ]}
                      onPress={() => setLanguage(option.value)}
                    >
                      <Text
                        style={[
                          styles.languageButtonText,
                          selected ? styles.languageButtonTextSelected : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.helperText}>默认已选中文，可随时切换。</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>绘本封面</Text>
              <View style={styles.importCard}>
                {coverImage ? (
                  <View style={styles.coverPreviewRow}>
                    <Image
                      source={{ uri: coverImage.uri }}
                      style={styles.coverPreviewImage}
                      contentFit="cover"
                    />
                    <View style={styles.coverPreviewMeta}>
                      <Text numberOfLines={1} style={styles.pageFileName}>
                        {coverImage.fileName ?? "已选封面"}
                      </Text>
                      <Text style={styles.pageSubText}>
                        {getImageMetaText(coverImage, "当前已保存封面")}
                      </Text>
                    </View>
                    <Pressable
                      hitSlop={8}
                      style={styles.deleteButton}
                      onPress={() => setCoverImage(null)}
                      disabled={isSaving}
                    >
                      <Ionicons name="trash-outline" size={18} color="#b67b4c" />
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.emptyCoverCard}>
                    <Ionicons name="image-outline" size={20} color="#c7ad8d" />
                    <Text style={styles.emptyPagesText}>
                      尚未设置单独封面，可上传一张图片作为绘本封面。
                    </Text>
                  </View>
                )}
                <Pressable
                  style={[
                    styles.importButton,
                    isPickingCoverImage ? styles.importButtonDisabled : null,
                    coverImage ? styles.secondaryImportButton : null,
                  ]}
                  onPress={() => {
                    void handlePickCoverImage();
                  }}
                  disabled={isPickingCoverImage || isPickingImages || isSaving}
                >
                  <Ionicons name="image-outline" size={18} color="#5a88d9" />
                  <Text style={styles.importButtonText}>
                    {isPickingCoverImage
                      ? "导入中..."
                      : coverImage
                        ? "重新选择封面"
                        : "上传封面"}
                  </Text>
                </Pressable>
                <Text style={styles.importHint}>
                  封面为单张图片，与页面列表分开保存。
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>
                {isEditMode ? "追加页面图片" : "导入页面图片"}
              </Text>
              <View style={styles.importCard}>
                <Pressable
                  style={[
                    styles.importButton,
                    isPickingImages ? styles.importButtonDisabled : null,
                  ]}
                  onPress={() => {
                    void handlePickImages();
                  }}
                  disabled={isPickingImages || isSaving}
                >
                  <Ionicons name="images-outline" size={18} color="#5a88d9" />
                  <Text style={styles.importButtonText}>
                    {isPickingImages ? "导入中..." : "从相册导入"}
                  </Text>
                </Pressable>
                <Text style={styles.importHint}>
                  {isEditMode
                    ? "可继续追加页面，删除已有页面会在保存后生效。"
                    : "支持多选，选择顺序会作为页面顺序保存。"}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.importedHeader}>
                <Text style={styles.label}>
                  {isEditMode ? "页面列表（保存后生效）" : "已导入页面（按选择顺序）"}
                </Text>
                <Text style={styles.importedCount}>共 {pageCount} 页</Text>
              </View>

              {pageCount === 0 ? (
                <View style={styles.emptyPagesCard}>
                  <Ionicons name="albums-outline" size={20} color="#c7ad8d" />
                  <Text style={styles.emptyPagesText}>
                    尚未导入页面图片，可一次选择多张。
                  </Text>
                </View>
              ) : (
                <View style={styles.pagesList}>
                  {pendingImages.map((item, index) => (
                    <View key={item.id} style={styles.pageRow}>
                      <Ionicons
                        name="reorder-three-outline"
                        size={20}
                        color="#b79f85"
                      />
                      <Image
                        source={{ uri: item.uri }}
                        style={styles.pageThumbnail}
                        contentFit="cover"
                      />
                      <View style={styles.pageRowMeta}>
                        <Text numberOfLines={1} style={styles.pageFileName}>
                          {item.fileName ?? `页面 ${index + 1}`}
                        </Text>
                        <Text style={styles.pageSubText}>
                          {getImageMetaText(
                            item,
                            item.isExisting ? "已保存页面" : "待保存页面"
                          )}
                        </Text>
                      </View>
                      <View style={styles.pageIndexBadge}>
                        <Text style={styles.pageIndexText}>{index + 1}</Text>
                      </View>
                      <Pressable
                        hitSlop={8}
                        style={styles.deleteButton}
                        onPress={() => handleRemovePendingImage(item.id)}
                        disabled={isSaving}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#b67b4c"
                        />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          <ActionButton
            label={
              isSaving
                ? isEditMode
                  ? "保存中..."
                  : "保存中..."
                : isEditMode
                  ? "保存修改"
                  : "保存绘本"
            }
            style={styles.saveButton}
            disabledStyle={styles.saveButtonDisabled}
            textStyle={styles.saveButtonText}
            onPress={() => {
              void handleSave();
            }}
            disabled={!canSave}
          />

          <Text style={styles.footerHint}>
            {isEditMode
              ? "保存时会更新绘本信息、封面和页面列表；已删除页面会同步移除本地图片与音频。"
              : pageCount > 0 || coverImage
                ? "保存时会持久化封面与已选页面图片，并为每张页面图创建记录。"
                : "可先保存基础信息，也可先上传封面、导入页面图片后再保存。"}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f2e9",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
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
  backButton: {
    minWidth: 120,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#5F84D1",
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
  },
  formCard: {
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: "#fffdf9",
    shadowColor: "#b78758",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  section: {
    marginTop: 8,
  },
  label: {
    marginBottom: 10,
    fontSize: 15,
    fontWeight: "600",
    color: "#3f2d1f",
  },
  requiredMark: {
    color: "#e06b2d",
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e7ddcf",
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    fontSize: 16,
    color: "#2f241a",
  },
  textInputError: {
    borderColor: "#d85d43",
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: "#d85d43",
  },
  languageRow: {
    flexDirection: "row",
    gap: 12,
  },
  languageButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e7ddcf",
    backgroundColor: "#fff",
  },
  languageButtonSelected: {
    borderColor: "#ea7e33",
    backgroundColor: "#fff4eb",
  },
  languageButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4f4a43",
  },
  languageButtonTextSelected: {
    color: "#a95516",
  },
  helperText: {
    marginTop: 8,
    fontSize: 13,
    color: "#8e7b69",
  },
  importCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#fffaf2",
    borderWidth: 1,
    borderColor: "#f1e3cd",
  },
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#edf4ff",
  },
  secondaryImportButton: {
    marginTop: 4,
  },
  importButtonDisabled: {
    opacity: 0.7,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4f78c8",
  },
  importHint: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 13,
    color: "#9c8c7d",
  },
  emptyCoverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f4e8d8",
    backgroundColor: "#fffdf9",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  coverPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  coverPreviewImage: {
    width: 72,
    height: 96,
    borderRadius: 14,
    backgroundColor: "#f2ebdf",
  },
  coverPreviewMeta: {
    flex: 1,
    gap: 6,
  },
  importedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  importedCount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8e7b69",
  },
  emptyPagesCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f4e8d8",
    backgroundColor: "#fffdf9",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  emptyPagesText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#8e7b69",
  },
  pagesList: {
    gap: 10,
  },
  pageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1e3cd",
    backgroundColor: "#fffaf2",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  pageThumbnail: {
    width: 56,
    height: 74,
    borderRadius: 10,
    backgroundColor: "#f2ebdf",
  },
  pageRowMeta: {
    flex: 1,
    gap: 4,
  },
  pageFileName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3f2d1f",
  },
  pageSubText: {
    fontSize: 13,
    color: "#8e7b69",
  },
  pageIndexBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ecdcc4",
  },
  pageIndexText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6e5a48",
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    marginTop: 20,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#ea7e33",
    shadowColor: "#ea7e33",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: "#f2c19a",
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  footerHint: {
    marginTop: 14,
    paddingHorizontal: 6,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color: "#8e7b69",
  },
});
