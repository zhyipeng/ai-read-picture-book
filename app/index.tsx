import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { Link, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { showAlert } from "@/lib/alert";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActionButton } from "@/components/ActionButton";
import { Dialog } from "@/components/Dialog";
import { PreviewImage } from "@/components/PreviewImage";
import { deleteBook, listBooks } from "@/lib/db/books";
import {
  deleteBookDirectory,
  getPersistedImageUri,
} from "@/lib/storage/files";
import type { Book } from "@/types/book";

type BookCardTheme = {
  accentColor: string;
  languageBackground: string;
  languageColor: string;
  fallbackTheme: "moon" | "bear" | "caterpillar";
};

type BookCardItem = Book & {
  coverUri: string | null;
  theme: BookCardTheme;
};

type CardMenuState = {
  anchorX: number;
  anchorY: number;
  book: BookCardItem;
};

const CARD_THEMES: BookCardTheme[] = [
  {
    accentColor: "#4C7EB5",
    languageBackground: "#E6F1D8",
    languageColor: "#587438",
    fallbackTheme: "moon",
  },
  {
    accentColor: "#BE8B58",
    languageBackground: "#F6E7D6",
    languageColor: "#8A5A2C",
    fallbackTheme: "bear",
  },
  {
    accentColor: "#B5CE7E",
    languageBackground: "#DFF4E4",
    languageColor: "#4E7A57",
    fallbackTheme: "caterpillar",
  },
];

function getThemeByIndex(index: number): BookCardTheme {
  return CARD_THEMES[index % CARD_THEMES.length] ?? CARD_THEMES[0];
}

function getLanguageLabel(language: Book["language"]): string {
  return language === "zh" ? "中文" : "英文";
}

function formatUpdatedAt(updatedAt: string): string {
  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return "最近更新";
  }

  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `最近更新 ${month}-${day}`;
}

function BookCoverFallback({
  theme,
  accentColor,
}: {
  theme: BookCardTheme["fallbackTheme"];
  accentColor: string;
}) {
  if (theme === "moon") {
    return (
      <View style={[styles.coverArt, { backgroundColor: accentColor }]}>
        <Text style={styles.coverVerticalText}>外婆讲童话</Text>
        <View style={styles.moonGlow} />
        <View style={styles.moonOuter}>
          <View style={styles.moonInner} />
        </View>
        <View style={styles.moonHill} />
        <View style={styles.childHead} />
        <View style={styles.childBody} />
        <View style={styles.childArm} />
      </View>
    );
  }

  if (theme === "bear") {
    return (
      <View style={[styles.coverArt, { backgroundColor: accentColor }]}>
        <View style={styles.bearEarLeft} />
        <View style={styles.bearEarRight} />
        <View style={styles.bearHead} />
        <View style={styles.bearSnout} />
        <View style={styles.bearBody} />
        <View style={styles.bearBib} />
      </View>
    );
  }

  return (
    <View style={[styles.coverArt, { backgroundColor: accentColor }]}>
      <View style={styles.caterpillarLeaf} />
      <View style={styles.caterpillarHead} />
      <View style={styles.caterpillarBodyRow}>
        <View style={styles.caterpillarSegment} />
        <View style={styles.caterpillarSegment} />
        <View style={styles.caterpillarSegment} />
        <View style={styles.caterpillarSegment} />
      </View>
      <View style={styles.caterpillarApple} />
    </View>
  );
}

function BookCard({
  item,
  onOpenMenu,
}: {
  item: BookCardItem;
  onOpenMenu: (book: BookCardItem, anchorX: number, anchorY: number) => void;
}) {
  const suppressNextPressRef = useRef(false);
  const languageLabel = getLanguageLabel(item.language);
  const pageCountText = `${item.pageCount} 页`;
  const updatedAtText = formatUpdatedAt(item.updatedAt);

  return (
    <Pressable
      style={styles.card}
      onPress={() => {
        if (suppressNextPressRef.current) {
          suppressNextPressRef.current = false;
          return;
        }

        router.push(`/books/${item.id}`);
      }}
      onLongPress={(event) => {
        suppressNextPressRef.current = true;
        onOpenMenu(item, event.nativeEvent.pageX, event.nativeEvent.pageY);
      }}
      delayLongPress={260}
    >
      {item.coverUri ? (
        <PreviewImage
          source={{ uri: item.coverUri }}
          style={styles.coverImage}
          contentFit="cover"
        />
      ) : (
        <BookCoverFallback
          theme={item.theme.fallbackTheme}
          accentColor={item.theme.accentColor}
        />
      )}

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text numberOfLines={2} style={styles.cardTitle}>
            {item.title}
          </Text>
          <Pressable
            hitSlop={8}
            style={styles.moreButton}
            onPress={(event) => {
              event.stopPropagation();
              onOpenMenu(item, event.nativeEvent.pageX, event.nativeEvent.pageY);
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#8b7d6f" />
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          <View
            style={[
              styles.languageTag,
              { backgroundColor: item.theme.languageBackground },
            ]}
          >
            <Text
              style={[
                styles.languageTagText,
                { color: item.theme.languageColor },
              ]}
            >
              {languageLabel}
            </Text>
          </View>
          <Text style={styles.pageCount}>{pageCountText}</Text>
        </View>

        <Text style={styles.metaHint}>{updatedAtText}</Text>

        <View style={styles.statusRow}>
          <Ionicons name="images-outline" size={14} color="#9c8c7d" />
          <Text style={styles.statusText}>
            {item.coverImagePath ? "已设置封面" : "未设置封面"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function CardMenu({
  menuState,
  isDeleting,
  onClose,
  onDelete,
}: {
  menuState: CardMenuState;
  isDeleting: boolean;
  onClose: () => void;
  onDelete: (book: BookCardItem) => void;
}) {
  const { width, height } = useWindowDimensions();
  const menuWidth = 164;
  const horizontalPadding = 12;
  const menuLeft = Math.min(
    Math.max(horizontalPadding, menuState.anchorX - menuWidth + 16),
    width - menuWidth - horizontalPadding
  );
  const menuTop = Math.min(menuState.anchorY + 10, height - 88);

  return (
    <View style={styles.menuOverlay}>
      <Pressable style={styles.menuBackdrop} onPress={onClose} />
      <View style={[styles.menuCard, { top: menuTop, left: menuLeft }]}>
        <Pressable
          style={styles.menuItem}
          onPress={() => onDelete(menuState.book)}
          disabled={isDeleting}
        >
          <Ionicons name="trash-outline" size={16} color="#b14d35" />
          <Text style={styles.menuItemDeleteText}>
            {isDeleting ? "删除中..." : "删除绘本"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyStateCard() {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIllustration}>
        <View style={styles.emptyLeafLeft} />
        <View style={styles.emptyLeafRight} />
        <View style={styles.emptyBoxBase} />
        <View style={styles.emptyBoxLeftFlap} />
        <View style={styles.emptyBoxRightFlap} />
      </View>
      <Text style={styles.emptyTitle}>还没有绘本，先创建一本吧</Text>
      <ActionButton
        href="/books/new"
        label="新建绘本"
        iconName="add"
        iconSize={16}
        style={styles.emptyButton}
        textStyle={styles.emptyButtonText}
      />
    </View>
  );
}

export default function Index() {
  const isFocused = useIsFocused();
  const [books, setBooks] = useState<BookCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [menuState, setMenuState] = useState<CardMenuState | null>(null);
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);
  const [pendingDeleteBook, setPendingDeleteBook] = useState<BookCardItem | null>(
    null
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    let active = true;
    const revokers: (() => void)[] = [];

    async function loadBooks() {
      setIsLoading(true);

      try {
        const databaseBooks = await listBooks();
        const items = await Promise.all(
          databaseBooks.map(async (book, index) => {
            const theme = getThemeByIndex(index);

            if (!book.coverImagePath) {
              return {
                ...book,
                coverUri: null,
                theme,
              };
            }

            const resolvedCover = await getPersistedImageUri(book.coverImagePath);

            if (!active) {
              resolvedCover.revoke?.();
              return null;
            }

            if (resolvedCover.revoke) {
              revokers.push(resolvedCover.revoke);
            }

            return {
              ...book,
              coverUri: resolvedCover.uri,
              theme,
            };
          })
        );

        if (!active) {
          return;
        }

        setBooks(items.filter((item): item is BookCardItem => item !== null));
        setErrorText(null);
      } catch (error) {
        console.error("Failed to load books", error);

        if (!active) {
          return;
        }

        setBooks([]);
        setErrorText("绘本列表加载失败，请稍后重试。");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadBooks();

    return () => {
      active = false;
      revokers.forEach((revoke) => revoke());
    };
  }, [isFocused, reloadKey]);

  function handleOpenMenu(
    book: BookCardItem,
    anchorX: number,
    anchorY: number
  ) {
    setMenuState({
      book,
      anchorX,
      anchorY,
    });
  }

  function handleCloseMenu() {
    setMenuState(null);
  }

  function handleDeleteMenuPress(book: BookCardItem) {
    setMenuState(null);
    setPendingDeleteBook(book);
  }

  function handleCancelDeleteDialog() {
    if (deletingBookId) {
      return;
    }

    setPendingDeleteBook(null);
  }

  function handleDeleteDialogConfirm() {
    if (!pendingDeleteBook) {
      return;
    }

    void handleConfirmDelete(pendingDeleteBook);
  }

  async function handleConfirmDelete(book: BookCardItem) {
    try {
      setDeletingBookId(book.id);

      await deleteBook(book.id);

      try {
        await deleteBookDirectory(book.id);
      } catch (cleanupError) {
        console.error("Failed to clean book files", cleanupError);
      }

      setReloadKey((current) => current + 1);
      setPendingDeleteBook(null);
    } catch (error) {
      console.error("Failed to delete book", error);
      showAlert("删除失败", "绘本删除未完成，请稍后重试。");
    } finally {
      setDeletingBookId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.pageTitle}>我的绘本</Text>
            <Link href="/settings" asChild>
              <Pressable hitSlop={8}>
                <Text style={styles.settingsText}>设置</Text>
              </Pressable>
            </Link>
          </View>

          <ActionButton
            href="/books/new"
            label="新建绘本"
            iconName="add"
            iconSize={20}
            style={styles.createButton}
            textStyle={styles.createButtonText}
          />

          {isLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#ef8f38" />
              <Text style={styles.loadingText}>正在加载绘本列表...</Text>
            </View>
          ) : errorText ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{errorText}</Text>
            </View>
          ) : books.length > 0 ? (
            <View style={styles.listSection}>
              {books.map((item) => (
                <BookCard
                  key={item.id}
                  item={item}
                  onOpenMenu={handleOpenMenu}
                />
              ))}
            </View>
          ) : (
            <EmptyStateCard />
          )}
        </ScrollView>

        {menuState ? (
          <CardMenu
            menuState={menuState}
            isDeleting={deletingBookId === menuState.book.id}
            onClose={handleCloseMenu}
            onDelete={handleDeleteMenuPress}
          />
        ) : null}

        <Dialog
          visible={pendingDeleteBook !== null}
          title="删除绘本"
          message={
            pendingDeleteBook
              ? `确定删除《${pendingDeleteBook.title}》吗？\n此绘本不可恢复。`
              : ""
          }
          cancelText="取消"
          confirmText={deletingBookId ? "删除中..." : "删除"}
          onCancel={handleCancelDeleteDialog}
          onRequestClose={handleCancelDeleteDialog}
          onConfirm={handleDeleteDialogConfirm}
          confirmDisabled={pendingDeleteBook === null || deletingBookId !== null}
          cancelDisabled={deletingBookId !== null}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f3ee",
  },
  container: {
    flex: 1,
    backgroundColor: "#f7f3ee",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -1,
  },
  settingsText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
  },
  createButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#ef8f38",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
    shadowColor: "#e08b32",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 2,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  loadingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 24,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#efe8df",
    backgroundColor: "#fffaf6",
  },
  loadingText: {
    fontSize: 15,
    color: "#6b7280",
  },
  errorCard: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#efd2c8",
    backgroundColor: "#fff7f4",
  },
  errorText: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    color: "#a14b38",
  },
  listSection: {
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#fffaf6",
    borderWidth: 1,
    borderColor: "#efe8df",
    shadowColor: "#ae9e8a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
  },
  coverArt: {
    width: 76,
    height: 104,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    marginRight: 12,
  },
  coverImage: {
    width: 76,
    height: 104,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: "#efe4d3",
  },
  coverVerticalText: {
    position: "absolute",
    top: 8,
    left: 8,
    color: "#fef3c7",
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "700",
  },
  moonGlow: {
    position: "absolute",
    top: 12,
    right: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255, 228, 153, 0.2)",
  },
  moonOuter: {
    position: "absolute",
    top: 16,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f7d66b",
    alignItems: "center",
    justifyContent: "center",
  },
  moonInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f3ce58",
  },
  moonHill: {
    position: "absolute",
    left: -6,
    right: -6,
    bottom: 0,
    height: 32,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 28,
    backgroundColor: "#7fb16b",
  },
  childHead: {
    position: "absolute",
    bottom: 28,
    left: 24,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#5f4026",
  },
  childBody: {
    position: "absolute",
    bottom: 16,
    left: 26,
    width: 5,
    height: 15,
    borderRadius: 3,
    backgroundColor: "#f5d06f",
  },
  childArm: {
    position: "absolute",
    bottom: 24,
    left: 30,
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#f5d06f",
    transform: [{ rotate: "-25deg" }],
  },
  bearEarLeft: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#8a5d32",
  },
  bearEarRight: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#8a5d32",
  },
  bearHead: {
    position: "absolute",
    top: 20,
    left: 14,
    width: 48,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#9a6838",
  },
  bearSnout: {
    position: "absolute",
    top: 38,
    left: 25,
    width: 26,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#d9b48b",
  },
  bearBody: {
    position: "absolute",
    bottom: 12,
    left: 18,
    width: 40,
    height: 42,
    borderRadius: 18,
    backgroundColor: "#9a6838",
  },
  bearBib: {
    position: "absolute",
    bottom: 14,
    left: 24,
    width: 28,
    height: 30,
    borderRadius: 12,
    backgroundColor: "#f6f3e4",
  },
  caterpillarLeaf: {
    position: "absolute",
    top: 18,
    left: 8,
    width: 60,
    height: 30,
    borderRadius: 22,
    backgroundColor: "#5b9f57",
    transform: [{ rotate: "-12deg" }],
  },
  caterpillarHead: {
    position: "absolute",
    bottom: 24,
    left: 16,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#b85231",
  },
  caterpillarBodyRow: {
    position: "absolute",
    bottom: 22,
    left: 28,
    flexDirection: "row",
    gap: 2,
  },
  caterpillarSegment: {
    width: 12,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#8bc25b",
  },
  caterpillarApple: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#dc4d41",
  },
  cardBody: {
    flex: 1,
    justifyContent: "center",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "700",
    color: "#1f2937",
  },
  moreButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  languageTag: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  languageTagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  pageCount: {
    fontSize: 14,
    color: "#6b7280",
  },
  metaHint: {
    marginTop: 10,
    fontSize: 13,
    color: "#6b7280",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  statusText: {
    fontSize: 13,
    color: "#4b5563",
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  menuCard: {
    position: "absolute",
    width: 164,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#efe0d2",
    backgroundColor: "#fffdf9",
    shadowColor: "#9f8365",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuItemDeleteText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#b14d35",
  },
  emptyCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#efe8df",
    backgroundColor: "#fffaf6",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 18,
  },
  emptyIllustration: {
    width: 116,
    height: 78,
    position: "relative",
    marginBottom: 10,
  },
  emptyLeafLeft: {
    position: "absolute",
    left: 8,
    top: 18,
    width: 26,
    height: 44,
    borderRadius: 18,
    backgroundColor: "#d8e6c8",
    transform: [{ rotate: "-28deg" }],
  },
  emptyLeafRight: {
    position: "absolute",
    right: 8,
    top: 16,
    width: 26,
    height: 44,
    borderRadius: 18,
    backgroundColor: "#d8e6c8",
    transform: [{ rotate: "24deg" }],
  },
  emptyBoxBase: {
    position: "absolute",
    left: 34,
    bottom: 10,
    width: 48,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#f0d2a3",
  },
  emptyBoxLeftFlap: {
    position: "absolute",
    left: 30,
    bottom: 30,
    width: 28,
    height: 18,
    borderRadius: 4,
    backgroundColor: "#f8dfb8",
    transform: [{ rotate: "-18deg" }],
  },
  emptyBoxRightFlap: {
    position: "absolute",
    right: 30,
    bottom: 30,
    width: 28,
    height: 18,
    borderRadius: 4,
    backgroundColor: "#f8dfb8",
    transform: [{ rotate: "18deg" }],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 12,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#ef8f38",
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
