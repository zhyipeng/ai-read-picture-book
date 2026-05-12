import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Audio } from "expo-av";
import { PLAYBACK_SPEED_OPTIONS } from "@/lib/settings/configs";
import { getPersistedAudioUri } from "@/lib/storage/files";

export type PlaybackState = "idle" | "loading" | "ready" | "playing" | "paused";

export interface TrackInfo {
  bookId: string;
  pageId: string;
  bookTitle: string;
  pageIndex: number;
  totalPages: number;
  imageUri: string | null;
}

export interface PlaylistItem extends TrackInfo {
  audioPath: string;
}

export interface PlayerBarActions {
  onPrev?: () => void;
  onPlayPause?: () => void;
  onNext?: () => void;
}

interface PlayerContextValue {
  playbackState: PlaybackState;
  speed: number;
  currentTrack: TrackInfo | null;
  playerBarActions: PlayerBarActions | null;
  playlist: PlaylistItem[];
  playlistIndex: number;
  load: (audioPath: string, onLoaded?: () => void) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  togglePlay: () => Promise<void>;
  cycleSpeed: (initialSpeed?: number) => Promise<void>;
  setOnEnd: (callback: (() => void) | null) => void;
  setSpeed: (n: number) => void;
  unload: () => Promise<void>;
  setCurrentTrack: (track: TrackInfo | null) => void;
  registerPlayerBarActions: (actions: PlayerBarActions | null) => void;
  startPlaylist: (items: PlaylistItem[], startIndex?: number) => void;
  playNext: () => void;
  playPrev: () => void;
  clearPlaylist: () => void;
  markAutoPlayNext: () => void;
  consumeAutoPlayNext: () => boolean;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

function isMockPath(uri: string): boolean {
  return uri.startsWith("mock://");
}

function nextSpeed(current: number): number {
  const idx = PLAYBACK_SPEED_OPTIONS.indexOf(current);
  if (idx < 0) return PLAYBACK_SPEED_OPTIONS[1] ?? 1;
  return PLAYBACK_SPEED_OPTIONS[(idx + 1) % PLAYBACK_SPEED_OPTIONS.length] ?? current;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [speed, setSpeed] = useState(1);
  const [currentTrack, setCurrentTrack] = useState<TrackInfo | null>(null);
  const [playerBarActions, setPlayerBarActions] = useState<PlayerBarActions | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [playlistIndex, setPlaylistIndex] = useState(-1);
  const soundRef = useRef<Audio.Sound | null>(null);
  const onEndRef = useRef<(() => void) | null>(null);
  const revokeRef = useRef<(() => void) | null>(null);
  const speedRef = useRef(speed);
  const stateRef = useRef(playbackState);
  const playlistRef = useRef(playlist);
  const playlistIndexRef = useRef(playlistIndex);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    stateRef.current = playbackState;
  }, [playbackState]);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    playlistIndexRef.current = playlistIndex;
  }, [playlistIndex]);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
      revokeRef.current?.();
    };
  }, []);

  const load = useCallback(async (audioPath: string, onLoaded?: () => void) => {
    if (isMockPath(audioPath)) return;

    revokeRef.current?.();

    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    setPlaybackState("loading");

    try {
      const result = await getPersistedAudioUri(audioPath);
      revokeRef.current = result.revoke ?? null;

      const { sound } = await Audio.Sound.createAsync(
        { uri: result.uri },
        { shouldPlay: false, rate: speedRef.current },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlaybackState("ready");
            const pl = playlistRef.current;
            const idx = playlistIndexRef.current;
            if (pl.length > 0 && idx >= 0 && idx < pl.length - 1) {
              setPlaylistIndex(idx + 1);
            } else {
              onEndRef.current?.();
            }
          }
        }
      );

      soundRef.current = sound;
      onLoaded?.();
      setPlaybackState("ready");
    } catch (error) {
      console.error("Failed to load audio", error);
      setPlaybackState("idle");
      throw error;
    }
  }, []);

  const play = useCallback(async () => {
    if (!soundRef.current) return;
    await soundRef.current.playAsync();
    setPlaybackState("playing");
  }, []);

  const pause = useCallback(async () => {
    if (!soundRef.current) return;
    await soundRef.current.pauseAsync();
    setPlaybackState("paused");
  }, []);

  const stop = useCallback(async () => {
    if (!soundRef.current) return;
    await soundRef.current.stopAsync();
    setPlaybackState("ready");
  }, []);

  const togglePlay = useCallback(async () => {
    const s = stateRef.current;
    if (s === "playing") {
      await pause();
    } else if (s === "ready" || s === "paused") {
      await play();
    }
  }, [play, pause]);

  const cycleSpeed = useCallback(async (initialSpeed?: number) => {
    const currentSpeed = initialSpeed ?? speedRef.current;
    const newSpeed = nextSpeed(currentSpeed);
    setSpeed(newSpeed);
    if (soundRef.current) {
      await soundRef.current.setRateAsync(newSpeed, true);
    }
  }, []);

  const setOnEnd = useCallback((callback: (() => void) | null) => {
    onEndRef.current = callback;
  }, []);

  const unload = useCallback(async () => {
    revokeRef.current?.();
    revokeRef.current = null;
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setPlaybackState("idle");
    setCurrentTrack(null);
    setPlaylist([]);
    setPlaylistIndex(-1);
  }, []);

  const startPlaylist = useCallback((items: PlaylistItem[], startIndex = 0) => {
    setPlaylist(items);
    setPlaylistIndex(startIndex);
  }, []);

  const playNext = useCallback(() => {
    const pl = playlistRef.current;
    const idx = playlistIndexRef.current;
    if (pl.length > 0 && idx < pl.length - 1) {
      setPlaylistIndex(idx + 1);
    }
  }, []);

  const playPrev = useCallback(() => {
    const idx = playlistIndexRef.current;
    if (idx > 0) {
      setPlaylistIndex(idx - 1);
    }
  }, []);

  const clearPlaylist = useCallback(() => {
    setPlaylist([]);
    setPlaylistIndex(-1);
  }, []);

  useEffect(() => {
    const item = playlist[playlistIndex];
    if (!item) return;
    const track: TrackInfo = {
      bookId: item.bookId,
      pageId: item.pageId,
      bookTitle: item.bookTitle,
      pageIndex: item.pageIndex,
      totalPages: item.totalPages,
      imageUri: item.imageUri,
    };
    setCurrentTrack(track);
    void load(item.audioPath, () => {
      void play();
    });
  }, [playlistIndex, playlist]);

  const autoPlayNextRef = useRef(false);

  const markAutoPlayNext = useCallback(() => {
    autoPlayNextRef.current = true;
  }, []);

  const consumeAutoPlayNext = useCallback(() => {
    if (autoPlayNextRef.current) {
      autoPlayNextRef.current = false;
      return true;
    }
    return false;
  }, []);

  const registerPlayerBarActions = useCallback((actions: PlayerBarActions | null) => {
    setPlayerBarActions(actions);
  }, []);

  const value = useMemo(() => ({
    playbackState,
    speed,
    currentTrack,
    playerBarActions,
    playlist,
    playlistIndex,
    load,
    play,
    pause,
    stop,
    togglePlay,
    cycleSpeed,
    setOnEnd,
    setSpeed,
    unload,
    setCurrentTrack,
    registerPlayerBarActions,
    startPlaylist,
    playNext,
    playPrev,
    clearPlaylist,
    markAutoPlayNext,
    consumeAutoPlayNext,
  }), [playbackState, speed, currentTrack, playerBarActions, playlist, playlistIndex, load, play, pause, stop, togglePlay, cycleSpeed, setOnEnd, unload, registerPlayerBarActions, startPlaylist, playNext, playPrev, clearPlaylist, markAutoPlayNext, consumeAutoPlayNext]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
