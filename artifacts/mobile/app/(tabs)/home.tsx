import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ContinueListeningBar from "@/components/ContinueListeningBar";
import SectionRow from "@/components/SectionRow";
import StoryCard from "@/components/StoryCard";
import StoryGrid from "@/components/StoryGrid";
import { useAuth } from "@/context/AuthContext";
import { useProfile, type ChildProfile } from "@/context/ProfileContext";
import { useColors } from "@/hooks/useColors";
import { useStories, type RemoteStory } from "@/hooks/useStories";

const GUEST_PROFILE: ChildProfile = {
  id: "guest",
  name: "Little One",
  age: 3,
  preferences: ["bedtime", "adventure", "animals", "fairy_tales"],
  listeningHistory: [],
  favourites: [],
};

function getCurated(
  age: number,
  preferences: string[],
  stories: RemoteStory[],
) {
  const isAgeMatch = (s: RemoteStory) =>
    s.ageMin <= age + 1 && s.ageMax >= age - 1;

  const preferred = stories.filter(
    (s) => preferences.includes(s.category) && isAgeMatch(s),
  );
  const notPreferred = stories.filter(
    (s) => !preferences.includes(s.category),
  );

  const dayOfMonth = new Date().getDate();
  const featured =
    preferred.length > 0
      ? preferred[dayOfMonth % preferred.length]
      : stories[0];

  const favorites = preferred
    .filter((s) => s.id !== featured?.id)
    .slice(0, 8);

  const moreLikeThis = stories
    .filter((s) => preferences.includes(s.category) && s.id !== featured?.id)
    .slice(0, 6);

  const newForYou = notPreferred.slice(0, 8);
  const quickListens = stories.filter((s) => s.duration <= 5);
  const longStories = stories.filter((s) => s.duration >= 9);
  const ageMatched = stories.filter((s) => isAgeMatch(s)).slice(0, 6);

  return {
    featured,
    favorites,
    moreLikeThis,
    newForYou,
    quickListens,
    longStories,
    ageMatched,
  };
}

function getGreetingEmoji() {
  const h = new Date().getHours();
  if (h < 7) return "🌙";
  if (h < 12) return "☀️";
  if (h < 17) return "🌤️";
  if (h < 20) return "🌅";
  return "🌙";
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentProfile } = useProfile();
  const { isPremium } = useAuth();
  const { stories, loading, getStoryById } = useStories();

  const effectiveProfile = currentProfile ?? GUEST_PROFILE;

  const curated = useMemo(() => {
    if (stories.length === 0) return null;
    return getCurated(effectiveProfile.age, effectiveProfile.preferences, stories);
  }, [effectiveProfile, stories]);

  const favouriteStories = useMemo(() => {
    return (effectiveProfile.favourites ?? [])
      .map((id) => getStoryById(id))
      .filter((s): s is RemoteStory => s !== undefined);
  }, [effectiveProfile, getStoryById]);

  const recentlyPlayed = useMemo(() => {
    return (effectiveProfile.listeningHistory ?? [])
      .map((id) => getStoryById(id))
      .filter((s): s is RemoteStory => s !== undefined)
      .slice(0, 8);
  }, [effectiveProfile, getStoryById]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const name = effectiveProfile.name;
  const greetEmoji = getGreetingEmoji();

  if (loading && stories.length === 0) {
    return (
      <View
        style={[
          styles.root,
          styles.center,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={styles.loadingEmoji}>📖</Text>
        <ActivityIndicator size="large" color={colors.coral} style={{ marginTop: 12 }} />
      </View>
    );
  }

  if (!curated) return null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />

      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 12,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.greetEmoji}>{greetEmoji}</Text>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              Story time for
            </Text>
            <Text style={[styles.childName, { color: colors.navy }]}>
              {name}!
            </Text>
          </View>
        </View>
        <View style={styles.headerBtns}>
          {isPremium && (
            <View style={[styles.premiumBadge, { backgroundColor: colors.amber + "22" }]}>
              <Text style={styles.premiumBadgeText}>⭐ Premium</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/settings")}
            style={[styles.iconBtn, { backgroundColor: colors.muted }]}
            hitSlop={8}
          >
            <Ionicons name="settings-outline" size={22} color={colors.navy} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Top Tab Bar */}
      <View style={[styles.topTabBar, { borderBottomColor: colors.muted }]}>
        <View style={styles.topTabActive}>
          <Text style={[styles.topTabText, { color: colors.coral }]}>🎧 AudioStory</Text>
          <View style={[styles.topTabUnderline, { backgroundColor: colors.coral }]} />
        </View>
        <TouchableOpacity
          style={styles.topTab}
          onPress={() => router.push("/(tabs)/flashcards" as Parameters<typeof router.push>[0])}
          activeOpacity={0.7}
        >
          <Text style={[styles.topTabText, { color: colors.mutedForeground }]}>🃏 Flashcards</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {curated.featured && (
          <View style={styles.featuredSection}>
            <View style={styles.featuredLabel}>
              <Text style={styles.featuredEmoji}>✨</Text>
              <Text style={[styles.featuredText, { color: colors.coral }]}>
                Today&apos;s Pick for {name}
              </Text>
            </View>
            <StoryCard story={curated.featured} size="featured" />
          </View>
        )}

        {favouriteStories.length > 0 && (
          <View style={styles.namedSection}>
            <View style={styles.namedHeader}>
              <Text style={styles.namedEmoji}>❤️</Text>
              <Text style={[styles.namedTitle, { color: colors.navy }]}>
                {name}&apos;s Favourites
              </Text>
            </View>
            <SectionRow title="" stories={favouriteStories} />
          </View>
        )}

        {recentlyPlayed.length > 0 && (
          <View style={styles.namedSection}>
            <View style={styles.namedHeader}>
              <Text style={styles.namedEmoji}>🎧</Text>
              <Text style={[styles.namedTitle, { color: colors.navy }]}>
                Recently Played
              </Text>
            </View>
            <SectionRow title="" stories={recentlyPlayed} size="small" />
          </View>
        )}

        {curated.favorites.length > 0 && (
          <SectionRow
            title="Picks for You"
            emoji="🌟"
            stories={curated.favorites}
          />
        )}

        {curated.moreLikeThis.length > 0 && (
          <StoryGrid title="More Like This" stories={curated.moreLikeThis} />
        )}

        {curated.newForYou.length > 0 && (
          <SectionRow
            title="New for You"
            emoji="🆕"
            stories={curated.newForYou}
          />
        )}

        {curated.quickListens.length > 0 && (
          <SectionRow
            title="Quick Listens · under 5 min"
            emoji="⚡"
            stories={curated.quickListens}
            size="small"
          />
        )}

        {curated.longStories.length > 0 && (
          <SectionRow
            title="Long Stories · 9+ min"
            emoji="📚"
            stories={curated.longStories}
          />
        )}

        {curated.ageMatched.length > 0 && (
          <StoryGrid
            title={`Loved by ${effectiveProfile.age}-year-olds`}
            stories={curated.ageMatched}
          />
        )}
      </ScrollView>
      <ContinueListeningBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingEmoji: {
    fontSize: 48,
  },
  scroll: {},
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  greetEmoji: {
    fontSize: 36,
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    marginBottom: 1,
  },
  childName: {
    fontSize: 28,
    fontFamily: "Nunito_800ExtraBold",
    lineHeight: 33,
  },
  headerBtns: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  premiumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    color: "#D97706",
  },
  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  topTabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  topTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  topTabActive: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  topTabText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
  },
  topTabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 8,
    right: 8,
    height: 3,
    borderRadius: 3,
  },
  featuredSection: {
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  featuredLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  featuredEmoji: {
    fontSize: 16,
  },
  featuredText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    letterSpacing: 0.2,
  },
  namedSection: {
    marginBottom: 4,
  },
  namedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  namedEmoji: {
    fontSize: 20,
  },
  namedTitle: {
    fontSize: 19,
    fontFamily: "Nunito_800ExtraBold",
  },
});
