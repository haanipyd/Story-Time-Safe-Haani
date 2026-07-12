import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface InteractiveStoryOption {
  id: string;
  segmentId: string;
  label: string;
  emoji: string;
  imageUrl: string;
  isCorrect: boolean;
  displayOrder: number;
}

export interface InteractiveStorySegment {
  id: string;
  storyId: string;
  orderIndex: number;
  type: "narration" | "checkpoint";
  audioUrl: string;
  sceneImageUrl: string;
  questionText: string;
  options: InteractiveStoryOption[];
}

export interface InteractiveStory {
  id: string;
  title: string;
  language: string;
  description: string;
  thumbnailUrl: string;
  ageMin: number;
  ageMax: number;
  published: boolean;
  segmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FullInteractiveStory extends InteractiveStory {
  segments: InteractiveStorySegment[];
}

const LIST_CACHE_KEY = "@storytime/interactive_stories_cache";
const STORY_CACHE_PREFIX = "@storytime/interactive_story_";

const EXPO_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API_BASE: string = EXPO_DOMAIN ? `https://${EXPO_DOMAIN}` : "";

async function fetchList(): Promise<InteractiveStory[] | null> {
  if (!API_BASE) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${API_BASE}/api/interactive-stories`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as InteractiveStory[];
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

async function fetchFull(id: string): Promise<FullInteractiveStory | null> {
  if (!API_BASE) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(`${API_BASE}/api/interactive-stories/${encodeURIComponent(id)}`, {
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as FullInteractiveStory;
  } catch {
    return null;
  }
}

interface ContextValue {
  stories: InteractiveStory[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  fetchFullStory: (id: string) => Promise<FullInteractiveStory | null>;
}

const InteractiveStoriesContext = createContext<ContextValue | null>(null);

export function InteractiveStoriesProvider({ children }: { children: React.ReactNode }) {
  const [stories, setStories] = useState<InteractiveStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // In-memory cache for full story trees (session-only for individual stories)
  const fullCache = useRef<Record<string, FullInteractiveStory>>({});

  const loadList = useCallback(async () => {
    setError(null);
    try {
      const raw = await AsyncStorage.getItem(LIST_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as InteractiveStory[];
        if (Array.isArray(cached) && cached.length > 0) {
          setStories(cached);
          setLoading(false);
        }
      }
    } catch { /* cache miss is fine */ }

    const fresh = await fetchList();
    if (fresh) {
      setStories(fresh);
      setLoading(false);
      setError(null);
      try {
        await AsyncStorage.setItem(LIST_CACHE_KEY, JSON.stringify(fresh));
      } catch { /* non-fatal */ }
    } else if (stories.length === 0) {
      setLoading(false);
      // don't show error if we already have something from cache
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const fetchFullStory = useCallback(async (id: string): Promise<FullInteractiveStory | null> => {
    // 1. In-memory first
    if (fullCache.current[id]) return fullCache.current[id];

    // 2. AsyncStorage cache
    try {
      const raw = await AsyncStorage.getItem(STORY_CACHE_PREFIX + id);
      if (raw) {
        const cached = JSON.parse(raw) as FullInteractiveStory;
        if (cached?.id) {
          fullCache.current[id] = cached;
          return cached;
        }
      }
    } catch { /* miss */ }

    // 3. API
    const fresh = await fetchFull(id);
    if (fresh) {
      fullCache.current[id] = fresh;
      try {
        await AsyncStorage.setItem(STORY_CACHE_PREFIX + id, JSON.stringify(fresh));
      } catch { /* non-fatal */ }
    }
    return fresh;
  }, []);

  return (
    <InteractiveStoriesContext.Provider
      value={{ stories, loading, error, refresh: loadList, fetchFullStory }}
    >
      {children}
    </InteractiveStoriesContext.Provider>
  );
}

export function useInteractiveStories(): ContextValue {
  const ctx = useContext(InteractiveStoriesContext);
  if (!ctx) throw new Error("useInteractiveStories must be used within InteractiveStoriesProvider");
  return ctx;
}
