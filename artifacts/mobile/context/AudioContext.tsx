import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { type Story } from "@/data/stories";

interface AudioContextValue {
  currentStory: Story | null;
  isPlaying: boolean;
  progress: number;
  elapsedSeconds: number;
  sleepTimerSeconds: number | null;
  playStory: (story: Story) => void;
  togglePlay: () => void;
  stop: () => void;
  setSleepTimer: (minutes: number | null) => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sleepTimerSeconds, setSleepTimerSeconds] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sleepTimerRef = useRef<number | null>(null);

  const totalSeconds = currentStory ? currentStory.duration * 60 : 1;
  const progress = Math.min(elapsedSeconds / totalSeconds, 1);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPlaying && currentStory) {
      const storyDurationSec = currentStory.duration * 60;
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          if (next >= storyDurationSec) {
            setIsPlaying(false);
            sleepTimerRef.current = null;
            setSleepTimerSeconds(null);
            return storyDurationSec;
          }
          return next;
        });

        if (sleepTimerRef.current !== null) {
          sleepTimerRef.current -= 1;
          const remaining = sleepTimerRef.current;
          setSleepTimerSeconds(remaining);
          if (remaining <= 0) {
            sleepTimerRef.current = null;
            setIsPlaying(false);
          }
        }
      }, 1000);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [isPlaying, currentStory, clearTimer]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const playStory = useCallback(
    (story: Story) => {
      clearTimer();
      sleepTimerRef.current = null;
      setSleepTimerSeconds(null);
      setCurrentStory(story);
      setElapsedSeconds(0);
      setIsPlaying(true);
    },
    [clearTimer]
  );

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    sleepTimerRef.current = null;
    setSleepTimerSeconds(null);
    setIsPlaying(false);
    setCurrentStory(null);
    setElapsedSeconds(0);
  }, [clearTimer]);

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
        progress,
        elapsedSeconds,
        sleepTimerSeconds,
        playStory,
        togglePlay,
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
