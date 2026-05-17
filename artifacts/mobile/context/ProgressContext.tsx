import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
  category: "audio" | "cards" | "general";
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_listen",    emoji: "🎧", title: "First Listen",     description: "Play your first story",          category: "audio" },
  { id: "streak_3",        emoji: "🔥", title: "On Fire",          description: "3-day audio streak",             category: "audio" },
  { id: "streak_7",        emoji: "⚡", title: "Week Warrior",     description: "7-day audio streak",             category: "audio" },
  { id: "streak_30",       emoji: "🏆", title: "Story Champion",   description: "30-day audio streak",            category: "audio" },
  { id: "stories_10",      emoji: "📚", title: "Bookworm",         description: "Listen to 10 stories",           category: "audio" },
  { id: "stories_50",      emoji: "🌈", title: "Story Star",       description: "Listen to 50 stories",           category: "audio" },
  { id: "minutes_60",      emoji: "⏰", title: "Story Marathon",   description: "60 minutes of total listening",  category: "audio" },
  { id: "bedtime",         emoji: "🌙", title: "Bedtime Buddy",    description: "Listen to a story after 8 PM",  category: "audio" },
  { id: "early_bird",      emoji: "☀️", title: "Early Bird",       description: "Listen to a story before 7 AM", category: "audio" },
  { id: "first_cards",     emoji: "🃏", title: "Card Curious",     description: "Flip your first flashcard",     category: "cards" },
  { id: "cards_50",        emoji: "💡", title: "Word Wizard",      description: "Flip 50 flashcards",            category: "cards" },
  { id: "cards_200",       emoji: "🧠", title: "Brain Builder",    description: "Flip 200 flashcards",           category: "cards" },
  { id: "card_streak_7",   emoji: "🎯", title: "Card Champion",    description: "7-day flashcard streak",        category: "cards" },
  { id: "card_sessions_5", emoji: "🌟", title: "Deck Master",      description: "Complete 5 card sessions",      category: "cards" },
];

export interface DailyStreak {
  count: number;
  longestCount: number;
  lastActivityDate: string | null;
}

interface ProgressState {
  audioStreak: DailyStreak;
  cardStreak: DailyStreak;
  totalStoriesListened: number;
  totalMinutesListened: number;
  totalCardsFlipped: number;
  totalCardSessions: number;
  unlockedAchievements: Record<string, string>;
  activityLog: Record<string, { audio: boolean; cards: boolean }>;
}

interface ProgressContextValue extends ProgressState {
  pendingCelebration: Achievement | null;
  dismissCelebration: () => void;
  recordAudioPlay: (durationMinutes?: number) => void;
  recordCardSession: (cardsFlipped: number) => void;
  hasAchievement: (id: string) => boolean;
  getRecentActivity: (days: number) => Array<{ date: string; audio: boolean; cards: boolean }>;
}

const STORAGE_KEY = "storytime_progress_v1";

const defaultStreak: DailyStreak = { count: 0, longestCount: 0, lastActivityDate: null };

const defaultState: ProgressState = {
  audioStreak: defaultStreak,
  cardStreak: defaultStreak,
  totalStoriesListened: 0,
  totalMinutesListened: 0,
  totalCardsFlipped: 0,
  totalCardSessions: 0,
  unlockedAchievements: {},
  activityLog: {},
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function bumpStreak(streak: DailyStreak): DailyStreak {
  const today = todayStr();
  const yesterday = yesterdayStr();
  if (streak.lastActivityDate === today) return streak;
  const count = streak.lastActivityDate === yesterday ? streak.count + 1 : 1;
  return { count, longestCount: Math.max(count, streak.longestCount), lastActivityDate: today };
}

function checkAchievements(state: ProgressState, hour: number): Achievement[] {
  const { unlockedAchievements: ua } = state;
  const earned: Achievement[] = [];
  const maybe = (id: string, cond: boolean) => {
    if (!ua[id] && cond) earned.push(ACHIEVEMENTS.find((a) => a.id === id)!);
  };
  maybe("first_listen",    state.totalStoriesListened >= 1);
  maybe("streak_3",        state.audioStreak.count >= 3);
  maybe("streak_7",        state.audioStreak.count >= 7);
  maybe("streak_30",       state.audioStreak.count >= 30);
  maybe("stories_10",      state.totalStoriesListened >= 10);
  maybe("stories_50",      state.totalStoriesListened >= 50);
  maybe("minutes_60",      state.totalMinutesListened >= 60);
  maybe("bedtime",         hour >= 20);
  maybe("early_bird",      hour < 7);
  maybe("first_cards",     state.totalCardsFlipped >= 1);
  maybe("cards_50",        state.totalCardsFlipped >= 50);
  maybe("cards_200",       state.totalCardsFlipped >= 200);
  maybe("card_streak_7",   state.cardStreak.count >= 7);
  maybe("card_sessions_5", state.totalCardSessions >= 5);
  return earned.filter(Boolean);
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProgressState>(defaultState);
  const [loaded, setLoaded] = useState(false);
  const [pendingCelebration, setPendingCelebration] = useState<Achievement | null>(null);
  const celebrationQueue = React.useRef<Achievement[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<ProgressState>;
          setState((prev) => ({ ...prev, ...saved }));
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const persist = useCallback((next: ProgressState) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const queueCelebration = useCallback((achievements: Achievement[]) => {
    if (achievements.length === 0) return;
    celebrationQueue.current.push(...achievements);
    if (!pendingCelebration) {
      setPendingCelebration(celebrationQueue.current.shift() ?? null);
    }
  }, [pendingCelebration]);

  const dismissCelebration = useCallback(() => {
    const next = celebrationQueue.current.shift() ?? null;
    setPendingCelebration(next);
  }, []);

  const recordAudioPlay = useCallback((durationMinutes = 0) => {
    const hour = new Date().getHours();
    const today = todayStr();
    setState((prev) => {
      const audioStreak = bumpStreak(prev.audioStreak);
      const totalStoriesListened = prev.totalStoriesListened + 1;
      const totalMinutesListened = prev.totalMinutesListened + durationMinutes;
      const activityLog = {
        ...prev.activityLog,
        [today]: { audio: true, cards: prev.activityLog[today]?.cards ?? false },
      };
      const next: ProgressState = {
        ...prev,
        audioStreak,
        totalStoriesListened,
        totalMinutesListened,
        activityLog,
      };
      const newBadges = checkAchievements(next, hour);
      if (newBadges.length > 0) {
        const unlockedAt = new Date().toISOString();
        const unlockedAchievements = { ...next.unlockedAchievements };
        newBadges.forEach((b) => { unlockedAchievements[b.id] = unlockedAt; });
        next.unlockedAchievements = unlockedAchievements;
        setTimeout(() => queueCelebration(newBadges), 800);
      }
      persist(next);
      return next;
    });
  }, [persist, queueCelebration]);

  const recordCardSession = useCallback((cardsFlipped: number) => {
    const today = todayStr();
    const hour = new Date().getHours();
    setState((prev) => {
      const cardStreak = bumpStreak(prev.cardStreak);
      const totalCardsFlipped = prev.totalCardsFlipped + cardsFlipped;
      const totalCardSessions = prev.totalCardSessions + 1;
      const activityLog = {
        ...prev.activityLog,
        [today]: { audio: prev.activityLog[today]?.audio ?? false, cards: true },
      };
      const next: ProgressState = {
        ...prev,
        cardStreak,
        totalCardsFlipped,
        totalCardSessions,
        activityLog,
      };
      const newBadges = checkAchievements(next, hour);
      if (newBadges.length > 0) {
        const unlockedAt = new Date().toISOString();
        const unlockedAchievements = { ...next.unlockedAchievements };
        newBadges.forEach((b) => { unlockedAchievements[b.id] = unlockedAt; });
        next.unlockedAchievements = unlockedAchievements;
        setTimeout(() => queueCelebration(newBadges), 800);
      }
      persist(next);
      return next;
    });
  }, [persist, queueCelebration]);

  const hasAchievement = useCallback((id: string) => !!state.unlockedAchievements[id], [state.unlockedAchievements]);

  const getRecentActivity = useCallback((days: number) => {
    const result: Array<{ date: string; audio: boolean; cards: boolean }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const log = state.activityLog[date] ?? { audio: false, cards: false };
      result.push({ date, audio: log.audio, cards: log.cards });
    }
    return result;
  }, [state.activityLog]);

  if (!loaded) return <>{children}</>;

  return (
    <ProgressContext.Provider
      value={{
        ...state,
        pendingCelebration,
        dismissCelebration,
        recordAudioPlay,
        recordCardSession,
        hasAchievement,
        getRecentActivity,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}
