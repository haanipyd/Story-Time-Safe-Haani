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

// Replace with your preferred ambient background music URL
const BG_MUSIC_URL =
  "https://cdn.pixabay.com/audio/2023/01/12/audio_4d01f66cb1.mp3";

interface AudioContextValue {
  currentStory: Story | null;
  isPlaying: boolean;
  isBuffering: boolean;
  progress: number;
  elapsedSeconds: number;
  sleepTimerSeconds: number | null;
  bgMusicEnabled: boolean;
  playStory: (story: Story) => void;
  togglePlay: () => void;
  seekBy: (seconds: number) => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  stop: () => void;
  setSleepTimer: (minutes: number | null) => void;
  toggleBgMusic: () => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sleepTimerSeconds, setSleepTimerSeconds] = useState<number | null>(null);
  const [bgMusicEnabled, setBgMusicEnabled] = useState(true);

  const soundRef = useRef<Audio.Sound | null>(null);
  const bgSoundRef = useRef<Audio.Sound | null>(null);
  const bgMusicEnabledRef = useRef(true);
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

  const pauseBgMusic = useCallback(async () => {
    try {
      if (bgSoundRef.current) {
        const status = await bgSoundRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await bgSoundRef.current.pauseAsync();
        }
      }
    } catch {}
  }, []);

  const resumeBgMusic = useCallback(async () => {
    if (!bgMusicEnabledRef.current) return;
    try {
      if (bgSoundRef.current) {
        const status = await bgSoundRef.current.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await bgSoundRef.current.playAsync();
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    // Load background ambient music silently — fails gracefully if URL is unreachable
    Audio.Sound.createAsync(
      { uri: BG_MUSIC_URL },
      { shouldPlay: true, isLooping: true, volume: 0.12 }
    )
      .then(({ sound }) => {
        bgSoundRef.current = sound;
      })
      .catch(() => { /* background music is optional */ });

    return () => {
      unloadSound();
      if (bgSoundRef.current) {
        bgSoundRef.current.stopAsync().catch(() => {});
        bgSoundRef.current.unloadAsync().catch(() => {});
        bgSoundRef.current = null;
      }
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
      await pauseBgMusic();
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
              resumeBgMusic();
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
    [clearInterval_, unloadSound, pauseBgMusic, resumeBgMusic]
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
    await resumeBgMusic();
  }, [clearInterval_, unloadSound, resumeBgMusic]);

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

  const seekTo = useCallback(async (seconds: number) => {
    const storyMax = currentStory ? currentStory.duration * 60 : 0;
    const clamped = Math.max(0, Math.min(seconds, storyMax));
    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        await soundRef.current.setPositionAsync(clamped * 1000);
        setElapsedSeconds(Math.floor(clamped));
      }
    } else {
      setElapsedSeconds(Math.floor(clamped));
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

  const toggleBgMusic = useCallback(() => {
    setBgMusicEnabled((prev) => {
      const next = !prev;
      bgMusicEnabledRef.current = next;
      if (next) {
        resumeBgMusic();
      } else {
        pauseBgMusic();
      }
      return next;
    });
  }, [resumeBgMusic, pauseBgMusic]);

  return (
    <AudioContext.Provider
      value={{
        currentStory,
        isPlaying,
        isBuffering,
        progress,
        elapsedSeconds,
        sleepTimerSeconds,
        bgMusicEnabled,
        playStory,
        togglePlay,
        seekBy,
        seekTo,
        stop,
        setSleepTimer,
        toggleBgMusic,
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
