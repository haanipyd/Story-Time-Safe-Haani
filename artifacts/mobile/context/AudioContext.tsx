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

interface AudioContextValue {
  currentStory: Story | null;
  isPlaying: boolean;
  isBuffering: boolean;
  progress: number;
  elapsedSeconds: number;
  sleepTimerSeconds: number | null;
  playStory: (story: Story) => void;
  togglePlay: () => void;
  seekBy: (seconds: number) => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  stop: () => void;
  setSleepTimer: (minutes: number | null) => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sleepTimerSeconds, setSleepTimerSeconds] = useState<number | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sleepTimerRef = useRef<number | null>(null);
  // Monotonically increasing generation counter — every new playStory call gets a unique gen.
  // The async createAsync callback checks gen === loadGenRef.current before touching state/refs.
  const loadGenRef = useRef(0);

  const totalSeconds = currentStory ? (Number(currentStory.duration) || 1) * 60 : 1;
  const progress = Math.min(elapsedSeconds / totalSeconds, 1);

  const clearInterval_ = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const unloadSound = useCallback(async () => {
    const s = soundRef.current;
    soundRef.current = null;
    if (s) {
      try { await s.stopAsync(); } catch {}
      try { await s.unloadAsync(); } catch {}
    }
  }, []);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });
    return () => {
      loadGenRef.current += 1; // invalidate any in-flight load
      unloadSound();
      clearInterval_();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isPlaying || !currentStory) {
      clearInterval_();
      return;
    }

    intervalRef.current = setInterval(() => {
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

      // Fallback tick when no real sound is loaded (e.g. missing audio file)
      if (!soundRef.current) {
        setElapsedSeconds((prev) => {
          const storyMax = (Number(currentStory?.duration) || 1) * 60;
          const next = prev + 1;
          if (next >= storyMax) { setIsPlaying(false); return storyMax; }
          return next;
        });
      }
    }, 1000);

    return clearInterval_;
  }, [isPlaying, currentStory, clearInterval_]);

  const playStory = useCallback(
    async (story: Story) => {
      // Advance generation — any in-flight createAsync from a previous call will see gen mismatch and bail
      const gen = ++loadGenRef.current;

      clearInterval_();
      await unloadSound();

      sleepTimerRef.current = null;
      setSleepTimerSeconds(null);
      setCurrentStory(story);
      setElapsedSeconds(0);
      setIsPlaying(false);
      setIsBuffering(false);

      const remoteUri = story.audioUrl ?? null;
      const source = remoteUri ? { uri: remoteUri } : STORY_AUDIO[story.id];

      if (!source) {
        // No audio file — just run the progress timer
        if (gen === loadGenRef.current) setIsPlaying(true);
        return;
      }

      setIsBuffering(true);
      try {
        // shouldPlay: false — we manually call playAsync after the gen check
        const { sound } = await Audio.Sound.createAsync(source, {
          shouldPlay: false,
          progressUpdateIntervalMillis: 500,
        });

        // If a newer playStory call already started while we were awaiting, discard this sound
        if (gen !== loadGenRef.current) {
          sound.unloadAsync().catch(() => {});
          return;
        }

        soundRef.current = sound;

        sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          if (gen !== loadGenRef.current) return; // stale — ignore
          if (!status.isLoaded) return;
          setIsBuffering(status.isBuffering ?? false);
          setElapsedSeconds(Math.floor((status.positionMillis ?? 0) / 1000));
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setIsBuffering(false);
          }
        });

        await sound.playAsync();
        if (gen === loadGenRef.current) {
          setIsPlaying(true);
          setIsBuffering(false);
        }
      } catch {
        if (gen === loadGenRef.current) {
          setIsBuffering(false);
          setIsPlaying(false);
        }
      }
    },
    [clearInterval_, unloadSound]
  );

  const togglePlay = useCallback(async () => {
    if (soundRef.current) {
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
          } else {
            await soundRef.current.playAsync();
            setIsPlaying(true);
          }
        }
      } catch {}
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, []);

  const stop = useCallback(async () => {
    loadGenRef.current += 1; // invalidate any in-flight load
    clearInterval_();
    await unloadSound();
    sleepTimerRef.current = null;
    setSleepTimerSeconds(null);
    setIsPlaying(false);
    setIsBuffering(false);
    setCurrentStory(null);
    setElapsedSeconds(0);
  }, [clearInterval_, unloadSound]);

  const safeSetPosition = useCallback(async (positionMs: number): Promise<boolean> => {
    if (!isFinite(positionMs) || isNaN(positionMs) || positionMs < 0) return false;
    if (!soundRef.current) return false;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return false;
      if (status.durationMillis !== undefined && !isFinite(status.durationMillis)) return false;
      await soundRef.current.setPositionAsync(Math.round(positionMs));
      return true;
    } catch {
      return false;
    }
  }, []);

  const seekBy = useCallback(async (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return;
    if (soundRef.current) {
      try {
        const status = await soundRef.current.getStatusAsync();
        if (!status.isLoaded) return;
        const currentMs = (isFinite(status.positionMillis) && status.positionMillis >= 0)
          ? status.positionMillis : 0;
        const newMs = Math.max(0, currentMs + seconds * 1000);
        const ok = await safeSetPosition(newMs);
        if (ok) setElapsedSeconds(Math.floor(newMs / 1000));
      } catch {}
    } else {
      setElapsedSeconds((prev) => {
        const raw = currentStory ? Number(currentStory.duration) * 60 : 0;
        const storyMax = isFinite(raw) && raw > 0 ? raw : 0;
        return Math.max(0, storyMax > 0 ? Math.min(prev + seconds, storyMax) : prev + seconds);
      });
    }
  }, [currentStory, safeSetPosition]);

  const seekTo = useCallback(async (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return;
    const raw = currentStory ? Number(currentStory.duration) * 60 : 0;
    const storyMax = isFinite(raw) && raw > 0 ? raw : 0;
    const clamped = Math.max(0, storyMax > 0 ? Math.min(seconds, storyMax) : seconds);
    const positionMs = Math.round(clamped * 1000);
    if (!isFinite(positionMs) || isNaN(positionMs) || positionMs < 0) return;
    if (soundRef.current) {
      const ok = await safeSetPosition(positionMs);
      if (ok) setElapsedSeconds(Math.floor(clamped));
    } else {
      setElapsedSeconds(Math.floor(clamped));
    }
  }, [currentStory, safeSetPosition]);

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

  return (
    <AudioContext.Provider
      value={{
        currentStory,
        isPlaying,
        isBuffering,
        progress,
        elapsedSeconds,
        sleepTimerSeconds,
        playStory,
        togglePlay,
        seekBy,
        seekTo,
        stop,
        setSleepTimer,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error("useAudio must be used within AudioProvider");
  return ctx;
}
