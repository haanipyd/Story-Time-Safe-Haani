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
  playStory: (story: Story) => void;
  togglePlay: () => void;
  stop: () => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
            return storyDurationSec;
          }
          return next;
        });
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
    setIsPlaying(false);
    setCurrentStory(null);
    setElapsedSeconds(0);
  }, [clearTimer]);

  return (
    <AudioContext.Provider
      value={{
        currentStory,
        isPlaying,
        progress,
        elapsedSeconds,
        playStory,
        togglePlay,
        stop,
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
