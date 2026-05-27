import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { STORIES, type Story } from "@/data/stories";

export interface RemoteStory extends Story {
  thumbnailUrl?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
  playCount?: number;
}

const EXPO_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API_URL: string = EXPO_DOMAIN ? `https://${EXPO_DOMAIN}` : "";

function mapRemote(raw: Record<string, unknown>): RemoteStory {
  const playCount =
    (raw.playCount as number) ||
    (raw.play_count as number) ||
    undefined;
  return {
    id: raw.id as string,
    title: raw.title as string,
    category: raw.category as string,
    duration: (raw.duration as number) || (raw.durationMin as number) || 0,
    ageMin: raw.ageMin as number,
    ageMax: raw.ageMax as number,
    description: raw.description as string,
    thumbnailUrl: (raw.thumbnailUrl as string) || null,
    audioUrl: (raw.audioUrl as string) || null,
    videoUrl: (raw.videoUrl as string) || null,
    hasCover: !!(raw.thumbnailUrl as string),
    playCount,
  };
}

interface StoriesContextValue {
  stories: RemoteStory[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  getStoryById: (id: string) => RemoteStory | undefined;
}

const StoriesContext = createContext<StoriesContextValue | null>(null);

export function StoriesProvider({ children }: { children: React.ReactNode }) {
  // Start empty — static stories only appear as an offline fallback, never as
  // "initial" data that gets replaced by production stories on screen.
  const [stories, setStories] = useState<RemoteStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!API_URL) {
      // No API URL configured — use static stories as permanent fallback
      setStories(
        STORIES.map((s) => ({ ...s, thumbnailUrl: null, audioUrl: null, videoUrl: null }))
      );
      setLoading(false);
      return;
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${API_URL}/api/stories`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Record<string, unknown>[];
      if (Array.isArray(data) && data.length > 0) {
        setStories(data.map(mapRemote));
      } else {
        // Empty API response — fall back to static
        setStories(
          STORIES.map((s) => ({ ...s, thumbnailUrl: null, audioUrl: null, videoUrl: null }))
        );
      }
    } catch {
      // Network error — fall back to static stories so app still works offline
      setStories(
        STORIES.map((s) => ({ ...s, thumbnailUrl: null, audioUrl: null, videoUrl: null }))
      );
      setError("Couldn't reach server — showing built-in stories. Pull to retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const getStoryById = useCallback(
    (id: string) => stories.find((s) => s.id === id),
    [stories]
  );

  return (
    <StoriesContext.Provider value={{ stories, loading, error, refresh: fetchStories, getStoryById }}>
      {children}
    </StoriesContext.Provider>
  );
}

export function useStoriesContext(): StoriesContextValue {
  const ctx = useContext(StoriesContext);
  if (!ctx) throw new Error("useStoriesContext must be used within StoriesProvider");
  return ctx;
}
