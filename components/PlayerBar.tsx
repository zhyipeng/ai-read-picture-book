import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PreviewImage } from "@/components/PreviewImage";
import { formatPlaybackSpeed } from "@/lib/settings/configs";
import { usePlayer } from "@/lib/services/PlayerContext";

export function PlayerBar() {
  const { playbackState, speed, currentTrack, playerBarActions, playlist, playlistIndex, playNext, playPrev, togglePlay, cycleSpeed } = usePlayer();

  if (!currentTrack) return null;

  const inPlaylist = playlist.length > 0 && playlistIndex >= 0;
  const onPrev = inPlaylist && playlistIndex > 0 ? playPrev : playerBarActions?.onPrev;
  const onNext = inPlaylist && playlistIndex < playlist.length - 1 ? playNext : playerBarActions?.onNext;
  const prevDisabled = !onPrev;
  const nextDisabled = !onNext;
  const playDisabled = playbackState === "loading";

  return (
    <View style={styles.playerBar}>
      <View style={styles.playerLeft}>
        <View style={styles.thumbnailWrap}>
          {currentTrack.imageUri ? (
            <PreviewImage
              source={{ uri: currentTrack.imageUri }}
              style={styles.thumbnail}
              contentFit="cover"
            />
          ) : (
            <View style={styles.fallbackThumb}>
              <Ionicons name="musical-notes" size={16} color="#A28A75" />
            </View>
          )}
        </View>
        <View style={styles.playerTextWrap}>
          <Text numberOfLines={1} style={styles.playerTitle}>{currentTrack.bookTitle}</Text>
          <Text numberOfLines={1} style={styles.playerSubtitle}>
            第 {currentTrack.pageIndex + 1} / {currentTrack.totalPages} 页
          </Text>
        </View>
      </View>

      <View style={styles.playerControls}>
        <Pressable
          style={[styles.playerIconButton, prevDisabled && styles.disabled]}
          onPress={onPrev}
          disabled={prevDisabled}
        >
          <Ionicons name="play-skip-back" size={18} color="#3B312A" />
        </Pressable>
        <Pressable
          style={[styles.playerPlayButton, playDisabled && styles.disabled]}
          onPress={playerBarActions?.onPlayPause ?? (() => { void togglePlay(); })}
          disabled={playDisabled || (!playerBarActions?.onPlayPause && playbackState === "idle")}
        >
          <Ionicons
            name={playbackState === "playing" ? "pause" : "play"}
            size={18}
            color="#FFFFFF"
          />
        </Pressable>
        <Pressable
          style={[styles.playerIconButton, nextDisabled && styles.disabled]}
          onPress={onNext}
          disabled={nextDisabled}
        >
          <Ionicons name="play-skip-forward" size={18} color="#3B312A" />
        </Pressable>
        <Pressable style={styles.speedChip} onPress={() => { void cycleSpeed(speed); }}>
          <Text style={styles.speedChipText}>{formatPlaybackSpeed(speed)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    zIndex: 10,
  },
  playerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  thumbnailWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  fallbackThumb: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0ECE6",
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
  disabled: {
    opacity: 0.42,
  },
});
