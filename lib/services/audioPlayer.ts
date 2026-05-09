import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import { PLAYBACK_SPEED_OPTIONS } from "@/lib/settings/configs";
import { getPersistedAudioUri } from "@/lib/storage/files";

export type PlaybackState = "idle" | "loading" | "ready" | "playing" | "paused";

function isMockPath(uri: string): boolean {
  return uri.startsWith("mock://");
}

function nextSpeed(current: number): number {
  const idx = PLAYBACK_SPEED_OPTIONS.indexOf(current);
  if (idx < 0) return PLAYBACK_SPEED_OPTIONS[1] ?? 1;
  return PLAYBACK_SPEED_OPTIONS[(idx + 1) % PLAYBACK_SPEED_OPTIONS.length] ?? current;
}

export function useAudioPlayer() {
  const [state, setState] = useState<PlaybackState>("idle");
  const [speed, setSpeed] = useState(1);
  const soundRef = useRef<Audio.Sound | null>(null);
  const onEndRef = useRef<(() => void) | null>(null);
  const revokeRef = useRef<(() => void) | null>(null);
  const [_loadedPath, setLoadedPath] = useState<string | null>(null);

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

    setState("loading");

    try {
      const result = await getPersistedAudioUri(audioPath);
      revokeRef.current = result.revoke ?? null;

      const { sound } = await Audio.Sound.createAsync(
        { uri: result.uri },
        { shouldPlay: false, rate: speed },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setState("ready");
            onEndRef.current?.();
          }
        }
      );

      soundRef.current = sound;
      setLoadedPath(audioPath);
      onLoaded?.();
      setState("ready");
    } catch (error) {
      console.error("Failed to load audio", error);
      setState("idle");
      throw error;
    }
  }, [speed]);

  const play = useCallback(async () => {
    if (!soundRef.current) return;
    await soundRef.current.playAsync();
    setState("playing");
  }, []);

  const pause = useCallback(async () => {
    if (!soundRef.current) return;
    await soundRef.current.pauseAsync();
    setState("paused");
  }, []);

  const stop = useCallback(async () => {
    if (!soundRef.current) return;
    await soundRef.current.stopAsync();
    setState("ready");
  }, []);

  const togglePlay = useCallback(async () => {
    if (state === "playing") {
      await pause();
    } else if (state === "ready" || state === "paused") {
      await play();
    }
  }, [state, play, pause]);

  const cycleSpeed = useCallback(async (initialSpeed?: number) => {
    const currentSpeed = initialSpeed ?? speed;
    const newSpeed = nextSpeed(currentSpeed);
    setSpeed(newSpeed);
    if (soundRef.current) {
      await soundRef.current.setRateAsync(newSpeed, true);
    }
  }, [speed]);

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
    setState("idle");
    setLoadedPath(null);
  }, []);

  return { state, speed, load, play, pause, stop, togglePlay, cycleSpeed, setOnEnd, setSpeed, unload };
}
