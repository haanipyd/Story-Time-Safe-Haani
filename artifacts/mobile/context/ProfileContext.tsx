import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  preferences: string[];
  listeningHistory?: string[];
  favourites?: string[];
}

export interface AppSettings {
  sleepTimer: 15 | 30 | 60 | null;
  volumeCap: boolean;
}

interface ProfileState {
  profiles: ChildProfile[];
  currentProfileId: string | null;
  onboardingComplete: boolean;
  settings: AppSettings;
  isLoading: boolean;
}

interface ProfileContextValue extends ProfileState {
  currentProfile: ChildProfile | null;
  addProfile: (profile: Omit<ChildProfile, "id">) => void;
  updateProfile: (id: string, updates: Partial<Omit<ChildProfile, "id">>) => void;
  switchProfile: (id: string) => void;
  completeOnboarding: (profile: Omit<ChildProfile, "id">) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  addToHistory: (storyId: string) => void;
  toggleFavourite: (storyId: string) => void;
  freePlayCount: number;
  isPremium: boolean;
  incrementPlayCount: () => void;
  unlockPremium: () => void;
}

const STORAGE_KEY = "storytime_profiles_v1";
const SUBSCRIPTION_KEY = "storytime_subscription_v1";

const defaultSettings: AppSettings = {
  sleepTimer: null,
  volumeCap: false,
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProfileState>({
    profiles: [],
    currentProfileId: null,
    onboardingComplete: false,
    settings: defaultSettings,
    isLoading: true,
  });
  const [subscription, setSubscription] = useState({ freePlayCount: 0, isPremium: false });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<ProfileState>;
          setState((prev) => ({
            ...prev,
            profiles: saved.profiles ?? [],
            currentProfileId: saved.currentProfileId ?? null,
            onboardingComplete: saved.onboardingComplete ?? false,
            settings: saved.settings ?? defaultSettings,
            isLoading: false,
          }));
        } catch {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    });
    AsyncStorage.getItem(SUBSCRIPTION_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as { freePlayCount: number; isPremium: boolean };
          setSubscription(saved);
        } catch {}
      }
    });
  }, []);

  const persist = useCallback((next: Partial<ProfileState>) => {
    setState((prev) => {
      const updated = { ...prev, ...next };
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          profiles: updated.profiles,
          currentProfileId: updated.currentProfileId,
          onboardingComplete: updated.onboardingComplete,
          settings: updated.settings,
        })
      );
      return updated;
    });
  }, []);

  const completeOnboarding = useCallback(
    (profile: Omit<ChildProfile, "id">) => {
      const id =
        Date.now().toString() + Math.random().toString(36).substring(2, 7);
      const newProfile: ChildProfile = { id, ...profile };
      persist({
        profiles: [newProfile],
        currentProfileId: id,
        onboardingComplete: true,
      });
    },
    [persist]
  );

  const addProfile = useCallback(
    (profile: Omit<ChildProfile, "id">) => {
      const id =
        Date.now().toString() + Math.random().toString(36).substring(2, 7);
      const newProfile: ChildProfile = { id, ...profile };
      setState((prev) => {
        const updated = {
          profiles: [...prev.profiles, newProfile],
          currentProfileId: newProfile.id,
        };
        AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...prev,
            ...updated,
          })
        );
        return { ...prev, ...updated };
      });
    },
    []
  );

  const updateProfile = useCallback(
    (id: string, updates: Partial<Omit<ChildProfile, "id">>) => {
      setState((prev) => {
        const profiles = prev.profiles.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        );
        const next = { ...prev, profiles };
        AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            profiles: next.profiles,
            currentProfileId: next.currentProfileId,
            onboardingComplete: next.onboardingComplete,
            settings: next.settings,
          })
        );
        return next;
      });
    },
    []
  );

  const switchProfile = useCallback(
    (id: string) => {
      persist({ currentProfileId: id });
    },
    [persist]
  );

  const updateSettings = useCallback(
    (updates: Partial<AppSettings>) => {
      setState((prev) => {
        const settings = { ...prev.settings, ...updates };
        const next = { ...prev, settings };
        AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            profiles: next.profiles,
            currentProfileId: next.currentProfileId,
            onboardingComplete: next.onboardingComplete,
            settings: next.settings,
          })
        );
        return next;
      });
    },
    []
  );

  const incrementPlayCount = useCallback(() => {
    setSubscription((prev) => {
      const next = { ...prev, freePlayCount: prev.freePlayCount + 1 };
      AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const unlockPremium = useCallback(() => {
    setSubscription((prev) => {
      const next = { ...prev, isPremium: true };
      AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleFavourite = useCallback((storyId: string) => {
    setState((prev) => {
      const currentId = prev.currentProfileId;
      if (!currentId) return prev;
      const profiles = prev.profiles.map((p) => {
        if (p.id !== currentId) return p;
        const existing = p.favourites ?? [];
        const updated = existing.includes(storyId)
          ? existing.filter((id) => id !== storyId)
          : [...existing, storyId];
        return { ...p, favourites: updated };
      });
      const next = { ...prev, profiles };
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          profiles: next.profiles,
          currentProfileId: next.currentProfileId,
          onboardingComplete: next.onboardingComplete,
          settings: next.settings,
        })
      );
      return next;
    });
  }, []);

  const addToHistory = useCallback((storyId: string) => {
    setState((prev) => {
      const currentId = prev.currentProfileId;
      if (!currentId) return prev;
      const profiles = prev.profiles.map((p) => {
        if (p.id !== currentId) return p;
        const existing = p.listeningHistory ?? [];
        const deduped = [storyId, ...existing.filter((id) => id !== storyId)];
        return { ...p, listeningHistory: deduped.slice(0, 20) };
      });
      const next = { ...prev, profiles };
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          profiles: next.profiles,
          currentProfileId: next.currentProfileId,
          onboardingComplete: next.onboardingComplete,
          settings: next.settings,
        })
      );
      return next;
    });
  }, []);

  const currentProfile =
    state.profiles.find((p) => p.id === state.currentProfileId) ?? null;

  return (
    <ProfileContext.Provider
      value={{
        ...state,
        currentProfile,
        addProfile,
        updateProfile,
        switchProfile,
        completeOnboarding,
        updateSettings,
        addToHistory,
        toggleFavourite,
        freePlayCount: subscription.freePlayCount,
        isPremium: true,
        incrementPlayCount,
        unlockPremium,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
