import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { type Story } from "@/data/stories";

export interface RemoteStory extends Story {
  thumbnailUrl?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
  playCount?: number;
}

const CACHE_KEY = "@storytime/stories_cache";
const EXPO_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API_URL: string = EXPO_DOMAIN ? `https://${EXPO_DOMAIN}` : "";

function mapRemote(raw: Record<string, unknown>): RemoteStory {
  const playCount =
    (raw.playCount as number) || (raw.play_count as number) || undefined;
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

async function readCache(): Promise<RemoteStory[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RemoteStory[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

async function writeCache(stories: RemoteStory[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(stories));
  } catch {
    // Cache write failure is non-fatal
  }
}

interface StoriesContextValue {
  stories: RemoteStory[];
  /** True only on first ever launch with no cache and no connection yet */
  loading: boolean;
  /** Non-null only when there is no data at all (no cache, no API) */
  error: string | null;
  /** Whether a background refresh is in flight (cache already showing) */
  refreshing: boolean;
  refresh: () => void;
  getStoryById: (id: string) => RemoteStory | undefined;
}

const StoriesContext = createContext<StoriesContextValue | null>(null);

export function StoriesProvider({ children }: { children: React.ReactNode }) {
  const [stories, setStories] = useState<RemoteStory[]>([]);
  // loading = true only when there is nothing to show yet
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFromApi = useCallback(async (hasCache: boolean): Promise<RemoteStory[] | null> => {
    if (!API_URL) return null;
    try {
      if (hasCache) setRefreshing(true);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${API_URL}/api/stories`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Record<string, unknown>[];
      if (Array.isArray(data) && data.length > 0) {
        return data.map(mapRemote);
      }
      return null;
    } catch {
      return null;
    } finally {
      if (hasCache) setRefreshing(false);
    }
  }, []);

  const loadStories = useCallback(async () => {
    setError(null);

    // Step 1: load cache immediately — no spinner if we have real data
    const cached = await readCache();
    if (cached) {
      setStories(cached);
      setLoading(false);
    }

    // Step 2: fetch fresh from API in the background
    const fresh = await fetchFromApi(!!cached);

    if (fresh) {
      // API returned real data — update display and persist
      setStories(fresh);
      await writeCache(fresh);
      setLoading(false);
      setError(null);
    } else if (!cached) {
      // No cache AND no API — show error with retry
      setLoading(false);
      setError("No connection. Check your internet and tap retry.");
    }
    // If cache exists but API failed — silently keep showing cache, no error
  }, [fetchFromApi]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const getStoryById = useCallback(
    (id: string) => stories.find((s) => s.id === id),
    [stories]
  );

  return (
    <StoriesContext.Provider
      value={{ stories, loading, error, refreshing, refresh: loadStories, getStoryById }}
    >
      {children}
    </StoriesContext.Provider>
  );
}

export function useStoriesContext(): StoriesContextValue {
  const ctx = useContext(StoriesContext);
  if (!ctx) throw new Error("useStoriesContext must be used within StoriesProvider");
  return ctx;
}
