import { useState, useEffect, useCallback } from "react";
import { STORIES, type Story } from "@/data/stories";

const EXPO_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API_URL: string = EXPO_DOMAIN ? `https://${EXPO_DOMAIN}` : "";

export interface RemoteStory extends Story {
  thumbnailUrl?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
}

function mapRemote(raw: Record<string, unknown>): RemoteStory {
  return {
    id: raw.id as string,
    title: raw.title as string,
    category: raw.category as string,
    duration: raw.duration as number,
    ageMin: raw.ageMin as number,
    ageMax: raw.ageMax as number,
    description: raw.description as string,
    thumbnailUrl: (raw.thumbnailUrl as string) || null,
    audioUrl: (raw.audioUrl as string) || null,
    videoUrl: (raw.videoUrl as string) || null,
    hasCover: !!(raw.thumbnailUrl as string),
  };
}

export function useStories() {
  const [stories, setStories] = useState<RemoteStory[]>(
    STORIES.map((s) => ({
      ...s,
      thumbnailUrl: null,
      audioUrl: null,
      videoUrl: null,
    })),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/stories`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Record<string, unknown>[];
      if (Array.isArray(data) && data.length > 0) {
        setStories(data.map(mapRemote));
      }
    } catch {
      setError("Could not reach server — showing cached content.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const getStoryById = useCallback(
    (id: string) => stories.find((s) => s.id === id),
    [stories],
  );

  return { stories, loading, error, refresh: fetchStories, getStoryById };
}
