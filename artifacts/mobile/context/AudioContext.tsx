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

  const totalSeconds = currentStory ? currentStory.duration * 60 : 1;
  const progress = Math.min(elapsedSeconds / totalSeconds, 1);

  const clearInterval_ = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const unloadSound = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
  }, []);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });
    return () => {
      unloadSound();
      clearInterval_();
    };
  }, []);

  useEffect(() => {
    if (!isPlaying || !currentStory) {
      clearInterval_();
      return;
    }

    intervalRef.current = setInterval(() => {
      if (sleepTimerRef.current !== null) {
        sleepTimerRef.current -= 1;
        const remaining = sleepTimerRef.current;
        setSleepTimerSeconds(remaining);
        if (remaining <= 0) {
          sleepTimerRef.current = null;
          setIsPlaying(false);
          soundRef.current?.pauseAsync().catch(() => {});
          return;
        }
      }

      if (!soundRef.current) {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          const storyMax = (currentStory?.duration ?? 1) * 60;
          if (next >= storyMax) {
            setIsPlaying(false);
            return storyMax;
          }
          return next;
        });
      }
    }, 1000);

    return clearInterval_;
  }, [isPlaying, currentStory, clearInterval_]);

  const playStory = useCallback(
    async (story: Story) => {
      clearInterval_();
      await unloadSound();
      sleepTimerRef.current = null;
      setSleepTimerSeconds(null);
      setCurrentStory(story);
      setElapsedSeconds(0);
      setIsBuffering(false);

      const remoteUri = story.audioUrl ?? null;
      const source = remoteUri ? { uri: remoteUri } : STORY_AUDIO[story.id];

      if (source) {
        setIsBuffering(true);
        try {
          const { sound } = await Audio.Sound.createAsync(source, {
            shouldPlay: true,
            progressUpdateIntervalMillis: 500,
          });
          soundRef.current = sound;

          sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
            if (!status.isLoaded) return;
            setIsBuffering(status.isBuffering ?? false);
            setElapsedSeconds(Math.floor(status.positionMillis / 1000));
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setIsBuffering(false);
            }
          });

          setIsPlaying(true);
          setIsBuffering(false);
        } catch {
          setIsBuffering(false);
          setIsPlaying(true);
        }
      } else {
        setIsPlaying(true);
      }
    },
    [clearInterval_, unloadSound]
  );

  const togglePlay = useCallback(async () => {
    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await soundRef.current.pauseAsync();
        } else {
          await soundRef.current.playAsync();
        }
      }
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, []);

  const stop = useCallback(async () => {
    clearInterval_();
    await unloadSound();
    sleepTimerRef.current = null;
    setSleepTimerSeconds(null);
    setIsPlaying(false);
    setIsBuffering(false);
    setCurrentStory(null);
    setElapsedSeconds(0);
  }, [clearInterval_, unloadSound]);

  const seekBy = useCallback(async (seconds: number) => {
    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        const newMs = Math.max(0, status.positionMillis + seconds * 1000);
        await soundRef.current.setPositionAsync(newMs);
        setElapsedSeconds(Math.floor(newMs / 1000));
      }
    } else {
      setElapsedSeconds((prev) => {
        const storyMax = currentStory ? currentStory.duration * 60 : 0;
        return Math.max(0, Math.min(prev + seconds, storyMax));
      });
    }
  }, [currentStory]);

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
