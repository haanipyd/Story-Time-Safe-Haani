/**
 * AudioContext — hardened audio player with full concurrency safety.
 *
 * Protocols implemented:
 *  1. Single sound instance: unloadSound() always nulls soundRef before stopping
 *  2. isLoading exposed for UI to disable buttons (no code-level hard lock — gen counter
 *     handles all races without breaking React Strict Mode double-invoke)
 *  3. Generation counter: every playStory() increments loadGenRef; async callbacks bail
 *     on gen mismatch, preventing stale loads from touching state or soundRef
 *  4. Stale-instance guard: status callback checks `sound === soundRef.current` before
 *     updating any state
 *  5. UI disabling: isLoading prevents double-taps via disabled={isLoading || isBuffering}
 *  6. Idempotent pause/play/stop: all null-check soundRef, check isLoaded before calling
 *  7. Seek safety: isSeekingRef suppresses position updates during scrub; clamp to [0,dur]
 *  8. Lifecycle: proper listener removal before unload; no setState after context disposal
 *  9. Audio mode: set once on mount; staysActiveInBackground for background playback
 * 10. Error handling: catch resets state cleanly; never leaves a half-loaded instance
 */
import { Audio, type AVPlaybackStatus } from "expo-av";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { STORY_AUDIO } from "@/data/audioMap";
import { type Story } from "@/data/stories";

// ── Public interface ──────────────────────────────────────────────────────────
interface AudioContextValue {
  currentStory: Story | null;
  isPlaying: boolean;
  isBuffering: boolean;
  /** true while createAsync is in flight — use to disable play/prev/next buttons */
  isLoading: boolean;
  progress: number;
  elapsedSeconds: number;
  sleepTimerSeconds: number | null;
  playStory: (story: Story) => void;
  togglePlay: () => void;
  seekBy: (seconds: number) => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  /** Call with true on scrubber drag-start, false on drag-end.
   *  Suppresses position updates from the status callback for the entire drag. */
  setIsSeeking: (seeking: boolean) => void;
  stop: () => void;
  setSleepTimer: (minutes: number | null) => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sleepTimerSeconds, setSleepTimerSeconds] = useState<number | null>(null);

  // ── Internal refs ────────────────────────────────────────────────────────
  /** The one and only active Audio.Sound instance. Nulled before any unload. */
  const soundRef    = useRef<Audio.Sound | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sleepTimerRef = useRef<number | null>(null);

  /**
   * Protocol 3 — generation counter.
   * Incremented at the start of every playStory() call and by stop().
   * Any async path that resumed after the counter changed silently discards its work.
   */
  const loadGenRef = useRef(0);

  /**
   * Protocol 7 — seeking guard.
   * Set true by the player on scrubber drag-start; cleared on drag-end.
   * The status callback skips elapsedSeconds updates while this is true.
   */
  const isSeekingRef = useRef(false);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const clearTick = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  /**
   * Protocol 1 — single instance cleanup.
   * Nulls soundRef FIRST so any in-flight status callback sees no active sound,
   * then removes the listener, stops, and unloads.
   */
  const unloadSound = useCallback(async () => {
    const s = soundRef.current;
    soundRef.current = null;                           // null first — stale callbacks bail
    if (!s) return;
    try { s.setOnPlaybackStatusUpdate(null); } catch {}
    try { await s.stopAsync(); }   catch {}
    try { await s.unloadAsync(); } catch {}
  }, []);

  // ── Protocol 9 — audio mode configured once on mount ─────────────────────
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    }).catch(() => {});

    return () => {
      // Invalidate any in-flight load and fire-and-forget teardown.
      // We do NOT call setState here because the component may already be unmounted.
      loadGenRef.current += 1;
      clearTick();
      const s = soundRef.current;
      soundRef.current = null;
      if (s) {
        try { s.setOnPlaybackStatusUpdate(null); } catch {}
        s.stopAsync().catch(() => {}).finally(() => s.unloadAsync().catch(() => {}));
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sleep-timer fallback tick ─────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || !currentStory) { clearTick(); return; }

    intervalRef.current = setInterval(() => {
      // Sleep timer countdown
      if (sleepTimerRef.current !== null) {
        sleepTimerRef.current -= 1;
        const rem = sleepTimerRef.current;
        setSleepTimerSeconds(rem);
        if (rem <= 0) {
          sleepTimerRef.current = null;
          setIsPlaying(false);
          soundRef.current?.pauseAsync().catch(() => {});
          return;
        }
      }
      // Fallback position tick when expo-av has no loaded sound (missing audio file)
      if (!soundRef.current) {
        setElapsedSeconds((prev) => {
          const max = (Number(currentStory?.duration) || 1) * 60;
          const next = prev + 1;
          if (next >= max) { setIsPlaying(false); return max; }
          return next;
        });
      }
    }, 1000);

    return clearTick;
  }, [isPlaying, currentStory, clearTick]);

  // ── playStory ─────────────────────────────────────────────────────────────
  const playStory = useCallback(async (story: Story) => {
    /**
     * Protocol 3: advance generation before any await.
     * Any prior in-flight load will see a gen mismatch and abort.
     * We do NOT hard-return early here — that would break React Strict Mode's
     * double-invoke of effects, causing audio to silently never start.
     * Instead, the gen counter discards stale async results, and the UI's
     * isLoading flag prevents user double-taps (protocol 5).
     */
    const gen = ++loadGenRef.current;

    // Reset UI immediately so the player shows a loading state
    setIsPlaying(false);
    setIsLoading(true);
    setIsBuffering(true);

    try {
      clearTick();
      await unloadSound();                // protocol 1: stop previous before starting new

      if (gen !== loadGenRef.current) return;   // invalidated during unload

      sleepTimerRef.current = null;
      setSleepTimerSeconds(null);
      setCurrentStory(story);
      setElapsedSeconds(0);

      const remoteUri = story.audioUrl ?? null;
      const source = remoteUri ? { uri: remoteUri } : STORY_AUDIO[story.id];

      if (!source) {
        // No audio file: fall back to timer-driven progress
        setIsLoading(false);
        setIsBuffering(false);
        setIsPlaying(true);
        return;
      }

      /**
       * Protocol 3: shouldPlay:false so we can do the gen check before playback starts.
       * If we used shouldPlay:true and then saw a gen mismatch, the sound would already
       * be playing — we'd have to stop it, causing an audible glitch.
       */
      const { sound } = await Audio.Sound.createAsync(source, {
        shouldPlay: false,
        progressUpdateIntervalMillis: 500,
      });

      // Protocol 3 + Protocol 4: gen check AFTER the await; discard stale sound
      if (gen !== loadGenRef.current) {
        try { sound.setOnPlaybackStatusUpdate(null); } catch {}
        sound.unloadAsync().catch(() => {});
        return;
      }

      soundRef.current = sound;

      /**
       * Protocol 4: stale-instance guard.
       * We close over both `sound` (the specific object) and `gen`.
       * If soundRef.current is replaced or gen advances, this callback is ignored.
       */
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (sound !== soundRef.current) return;   // protocol 4: not the active instance
        if (gen !== loadGenRef.current) return;    // protocol 3: stale generation
        if (!status.isLoaded) return;

        setIsBuffering(status.isBuffering ?? false);

        // Protocol 7: suppress position updates while the scrubber is held down
        if (!isSeekingRef.current) {
          setElapsedSeconds(Math.floor((status.positionMillis ?? 0) / 1000));
        }

        setIsPlaying(status.isPlaying);

        if (status.didJustFinish) {
          setIsPlaying(false);
          setIsBuffering(false);
        }
      });

      // Protocol 10: wrap playAsync in try/catch
      await sound.playAsync();

      if (gen === loadGenRef.current) {
        setIsPlaying(true);
        setIsBuffering(false);
        setIsLoading(false);
      }
    } catch {
      // Protocol 10: error → clean reset; never leave a half-loaded instance
      if (gen === loadGenRef.current) {
        await unloadSound();
        setIsPlaying(false);
        setIsBuffering(false);
        setIsLoading(false);
      }
    } finally {
      /**
       * The finally always runs. Only clear isLoading for OUR gen.
       * If a newer gen is running, it will clear isLoading when it finishes.
       * If stop() was called (which advances gen), stop() clears isLoading directly.
       */
      if (gen === loadGenRef.current) {
        setIsLoading(false);
      }
    }
  }, [clearTick, unloadSound]);

  // ── togglePlay ────────────────────────────────────────────────────────────
  const togglePlay = useCallback(async () => {
    // Protocol 6: no-op while loading; no-op if already in the desired state
    if (isLoading) return;
    const s = soundRef.current;
    if (!s) {
      // No real sound yet (e.g. timer-only fallback): toggle state directly
      setIsPlaying((prev) => !prev);
      return;
    }
    try {
      const status = await s.getStatusAsync();
      if (!status.isLoaded) return;       // protocol 6: idempotent guard
      if (status.isPlaying) {
        await s.pauseAsync();
        setIsPlaying(false);
      } else {
        await s.playAsync();
        setIsPlaying(true);
      }
    } catch {}
  }, [isLoading]);

  // ── stop ──────────────────────────────────────────────────────────────────
  const stop = useCallback(async () => {
    loadGenRef.current += 1;             // invalidate any in-flight load
    clearTick();
    await unloadSound();
    sleepTimerRef.current = null;
    setSleepTimerSeconds(null);
    setIsPlaying(false);
    setIsBuffering(false);
    setIsLoading(false);
    setCurrentStory(null);
    setElapsedSeconds(0);
  }, [clearTick, unloadSound]);

  // ── Seek helpers ─────────────────────────────────────────────────────────
  /**
   * Protocol 7: clamped setPositionAsync.
   * Returns true if the seek succeeded.
   */
  const safeSetPosition = useCallback(async (positionMs: number): Promise<boolean> => {
    if (!isFinite(positionMs) || isNaN(positionMs) || positionMs < 0) return false;
    const s = soundRef.current;
    if (!s) return false;
    try {
      const status = await s.getStatusAsync();
      if (!status.isLoaded) return false;
      const dur = status.durationMillis;
      const max = (dur !== undefined && isFinite(dur)) ? dur : positionMs;
      await s.setPositionAsync(Math.max(0, Math.min(Math.round(positionMs), max)));
      return true;
    } catch {
      return false;
    }
  }, []);

  const seekBy = useCallback(async (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return;
    isSeekingRef.current = true;
    try {
      const s = soundRef.current;
      if (s) {
        const status = await s.getStatusAsync();
        if (!status.isLoaded) return;
        const currentMs = Math.max(0, isFinite(status.positionMillis ?? NaN)
          ? status.positionMillis! : 0);
        const newMs = Math.max(0, currentMs + seconds * 1000);
        const ok = await safeSetPosition(newMs);
        if (ok) setElapsedSeconds(Math.floor(newMs / 1000));
      } else {
        setElapsedSeconds((prev) => {
          const storyMax = currentStory ? (Number(currentStory.duration) || 0) * 60 : 0;
          const next = prev + seconds;
          return Math.max(0, storyMax > 0 ? Math.min(next, storyMax) : next);
        });
      }
    } finally {
      isSeekingRef.current = false;
    }
  }, [currentStory, safeSetPosition]);

  const seekTo = useCallback(async (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return;
    const storyMax = currentStory ? (Number(currentStory.duration) || 0) * 60 : 0;
    const clamped = Math.max(0, storyMax > 0 ? Math.min(seconds, storyMax) : seconds);
    const positionMs = Math.round(clamped * 1000);
    if (!isFinite(positionMs) || isNaN(positionMs) || positionMs < 0) return;
    isSeekingRef.current = true;
    try {
      if (soundRef.current) {
        const ok = await safeSetPosition(positionMs);
        if (ok) setElapsedSeconds(Math.floor(clamped));
      } else {
        setElapsedSeconds(Math.floor(clamped));
      }
    } finally {
      isSeekingRef.current = false;
    }
  }, [currentStory, safeSetPosition]);

  /** Protocol 7: called by player scrubber on drag-start / drag-end */
  const setIsSeeking = useCallback((seeking: boolean) => {
    isSeekingRef.current = seeking;
  }, []);

  // ── Sleep timer setter ────────────────────────────────────────────────────
  const setSleepTimer = useCallback((minutes: number | null) => {
    if (minutes === null) {
      sleepTimerRef.current = null;
      setSleepTimerSeconds(null);
    } else {
      const secs = minutes * 60;
      sleepTimerRef.current = secs;
      setSleepTimerSeconds(secs);
    }
  }, []);

  const totalSeconds = currentStory ? (Number(currentStory.duration) || 1) * 60 : 1;
  const progress = Math.min(elapsedSeconds / totalSeconds, 1);

  return (
    <AudioContext.Provider value={{
      currentStory,
      isPlaying,
      isBuffering,
      isLoading,
      progress,
      elapsedSeconds,
      sleepTimerSeconds,
      playStory,
      togglePlay,
      seekBy,
      seekTo,
      setIsSeeking,
      stop,
      setSleepTimer,
    }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error("useAudio must be used within AudioProvider");
  return ctx;
}
