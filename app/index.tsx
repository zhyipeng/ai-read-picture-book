import { Feather, Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type BookCardItem = {
  id: string;
  title: string;
  language: string;
  pages: string;
  progressText: string;
  progressValue: number;
  recentPage: string;
  accentColor: string;
  progressColor: string;
  languageBackground: string;
  languageColor: string;
  coverTheme: "moon" | "bear" | "caterpillar";
};

const books: BookCardItem[] = [
  {
    id: "moonlight-flavor",
    title: "月亮的味道",
    language: "中文",
    pages: "16 页",
    progressText: "12/16 (75%)",
    progressValue: 0.75,
    recentPage: "第 8 页",
    accentColor: "#4C7EB5",
    progressColor: "#AAB7CA",
    languageBackground: "#E6F1D8",
    languageColor: "#587438",
    coverTheme: "moon",
  },
  {
    id: "bear-breakfast",
    title: "小熊的早餐",
    language: "中文",
    pages: "20 页",
    progressText: "20/20 (100%)",
    progressValue: 1,
    recentPage: "第 20 页",
    accentColor: "#BE8B58",
    progressColor: "#4DA55A",
    languageBackground: "#E6F1D8",
    languageColor: "#587438",
    coverTheme: "bear",
  },
  {
    id: "hungry-caterpillar",
    title: "The Very Hungry Caterpillar",
    language: "English",
    pages: "28 页",
    progressText: "18/28 (64%)",
    progressValue: 0.64,
    recentPage: "第 12 页",
    accentColor: "#B5CE7E",
    progressColor: "#C7C7C7",
    languageBackground: "#DFF4E4",
    languageColor: "#4E7A57",
    coverTheme: "caterpillar",
  },
];

function BookCover({ theme, accentColor }: { theme: BookCardItem["coverTheme"]; accentColor: string }) {
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

function BookCard({ item }: { item: BookCardItem }) {
  return (
    <Link href={`/books/${item.id}`} asChild>
      <Pressable style={styles.card}>
        <BookCover theme={item.coverTheme} accentColor={item.accentColor} />

        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text numberOfLines={2} style={styles.cardTitle}>
              {item.title}
            </Text>
            <Feather name="more-horizontal" size={18} color="#1f2937" />
          </View>

          <View style={styles.metaRow}>
            <View
              style={[
                styles.languageTag,
                { backgroundColor: item.languageBackground },
              ]}
            >
              <Text style={[styles.languageTagText, { color: item.languageColor }]}>
                {item.language}
              </Text>
            </View>
            <Text style={styles.pageCount}>{item.pages}</Text>
          </View>

          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>
              生成进度 <Text style={styles.progressValueText}>{item.progressText}</Text>
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${item.progressValue * 100}%`,
                    backgroundColor: item.progressColor,
                  },
                ]}
              />
            </View>
          </View>

          <Text style={styles.recentRead}>最近阅读: {item.recentPage}</Text>
        </View>
      </Pressable>
    </Link>
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
      <Link href="/books/new" asChild>
        <Pressable style={styles.emptyButton}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.emptyButtonText}>新建绘本</Text>
        </Pressable>
      </Link>
    </View>
  );
}

function MiniPlayer() {
  return (
    <View style={styles.bottomArea}>
      <View style={styles.playerCard}>
        <View style={styles.playerLeft}>
          <View style={styles.playerCover}>
            <View style={styles.playerCoverArt}>
              <View style={styles.playerMoon} />
              <View style={styles.playerHill} />
            </View>
          </View>
          <View style={styles.playerMeta}>
            <Text numberOfLines={1} style={styles.playerTitle}>
              月亮的味道
            </Text>
            <Text style={styles.playerSubtitle}>第 8 / 16 页</Text>
          </View>
        </View>

        <View style={styles.playerControls}>
          <Ionicons name="play-skip-back" size={18} color="#1f2937" />
          <View style={styles.playButton}>
            <Ionicons name="play" size={16} color="#fff" />
          </View>
          <Ionicons name="play-skip-forward" size={18} color="#1f2937" />
        </View>

        <Pressable style={styles.speedBadge}>
          <Text style={styles.speedText}>1.0x</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function Index() {
  const hasBooks = books.length > 0;

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

          <Link href="/books/new" asChild>
            <Pressable style={styles.createButton}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>新建绘本</Text>
            </Pressable>
          </Link>

          {hasBooks ? (
            <View style={styles.listSection}>
              {books.map((item) => (
                <BookCard key={item.id} item={item} />
              ))}
            </View>
          ) : (
            <EmptyStateCard />
          )}
        </ScrollView>

        <MiniPlayer />
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
    paddingBottom: 164,
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
    justifyContent: "space-between",
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
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
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
  progressSection: {
    marginTop: 12,
    gap: 4,
  },
  progressLabel: {
    fontSize: 13,
    color: "#6b7280",
  },
  progressValueText: {
    color: "#4b5563",
    fontWeight: "600",
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: "#ece7e1",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  recentRead: {
    marginTop: 8,
    fontSize: 13,
    color: "#4b5563",
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
  bottomArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "rgba(247, 243, 238, 0.95)",
  },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e7dfd5",
    backgroundColor: "#fffaf6",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 10,
  },
  playerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playerCover: {
    width: 28,
    height: 28,
    borderRadius: 6,
    overflow: "hidden",
  },
  playerCoverArt: {
    flex: 1,
    backgroundColor: "#4C7EB5",
  },
  playerMoon: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#f5d06f",
  },
  playerHill: {
    position: "absolute",
    left: -2,
    right: -2,
    bottom: 0,
    height: 10,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 10,
    backgroundColor: "#7fb16b",
  },
  playerMeta: {
    flex: 1,
    gap: 1,
  },
  playerTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  playerSubtitle: {
    fontSize: 11,
    color: "#6b7280",
  },
  playerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  playButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#30343b",
    alignItems: "center",
    justifyContent: "center",
  },
  speedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#f3ede5",
  },
  speedText: {
    fontSize: 12,
    color: "#374151",
  },
  deleteHint: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
    color: "#3f3f46",
  },
});
