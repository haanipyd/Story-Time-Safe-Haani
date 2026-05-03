import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
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
import { useProfile } from "@/context/ProfileContext";
import { STORIES, getStoryById } from "@/data/stories";
import { useColors } from "@/hooks/useColors";

function getCurated(age: number, preferences: string[]) {
  const isAgeMatch = (s: (typeof STORIES)[0]) =>
    s.ageMin <= age + 1 && s.ageMax >= age - 1;

  const preferred = STORIES.filter(
    (s) => preferences.includes(s.category) && isAgeMatch(s)
  );
  const notPreferred = STORIES.filter(
    (s) => !preferences.includes(s.category)
  );

  const dayOfMonth = new Date().getDate();
  const featured = preferred.length > 0
    ? preferred[dayOfMonth % preferred.length]
    : STORIES[0];

  const favorites = preferred.filter((s) => s.id !== featured.id).slice(0, 8);

  const moreLikeThis = STORIES.filter(
    (s) => preferences.includes(s.category) && s.id !== featured.id
  ).slice(0, 6);

  const newForYou = notPreferred.slice(0, 8);

  const quickListens = STORIES.filter((s) => s.duration <= 5);
  const longStories = STORIES.filter((s) => s.duration >= 9);
  const ageMatched = STORIES.filter((s) => isAgeMatch(s)).slice(0, 6);

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

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentProfile } = useProfile();

  const curated = useMemo(() => {
    if (!currentProfile) return null;
    return getCurated(currentProfile.age, currentProfile.preferences);
  }, [currentProfile]);

  const favouriteStories = useMemo(() => {
    if (!currentProfile) return [];
    const ids = currentProfile.favourites ?? [];
    return ids
      .map((id) => getStoryById(id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined);
  }, [currentProfile]);

  const recentlyPlayed = useMemo(() => {
    if (!currentProfile) return [];
    const history = currentProfile.listeningHistory ?? [];
    return history
      .map((id) => getStoryById(id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined)
      .slice(0, 8);
  }, [currentProfile]);

  if (!currentProfile || !curated) return null;

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const name = currentProfile.name;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      <ContinueListeningBar />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPadding + 16, paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              Hello!
            </Text>
            <Text style={[styles.title, { color: colors.navy }]}>
              {name}&apos;s Stories
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/settings")}
            style={[styles.gearBtn, { backgroundColor: colors.muted }]}
            hitSlop={8}
          >
            <Ionicons name="settings-outline" size={20} color={colors.navy} />
          </TouchableOpacity>
        </View>

        <View style={styles.featuredSection}>
          <View style={styles.featuredLabel}>
            <View style={[styles.dot, { backgroundColor: colors.coral }]} />
            <Text style={[styles.featuredText, { color: colors.coral }]}>
              Today&apos;s Pick for {name}
            </Text>
          </View>
          <StoryCard story={curated.featured} size="featured" />
        </View>

        {favouriteStories.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Ionicons name="heart" size={15} color={colors.coral} />
              <Text style={[styles.recentTitle, { color: colors.navy }]}>
                {name}&apos;s Favourites
              </Text>
            </View>
            <SectionRow title="" stories={favouriteStories} />
          </View>
        )}

        {recentlyPlayed.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Ionicons name="headset-outline" size={16} color={colors.navy} />
              <Text style={[styles.recentTitle, { color: colors.navy }]}>
                Recently Played
              </Text>
            </View>
            <SectionRow title="" stories={recentlyPlayed} size="small" />
          </View>
        )}

        {curated.favorites.length > 0 && (
          <SectionRow title="Picks for You" stories={curated.favorites} />
        )}

        {curated.moreLikeThis.length > 0 && (
          <StoryGrid title="More Like This" stories={curated.moreLikeThis} />
        )}

        {curated.newForYou.length > 0 && (
          <SectionRow title="New for You" stories={curated.newForYou} />
        )}

        {curated.quickListens.length > 0 && (
          <SectionRow
            title="Quick Listens · under 5 min"
            stories={curated.quickListens}
            size="small"
          />
        )}

        {curated.longStories.length > 0 && (
          <SectionRow
            title="Long Stories · 9+ min"
            stories={curated.longStories}
          />
        )}

        {curated.ageMatched.length > 0 && (
          <StoryGrid
            title={`Loved by ${currentProfile.age}-year-olds`}
            stories={curated.ageMatched}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {},
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    marginBottom: 2,
  },
  title: {
    fontSize: 28,
    fontFamily: "Nunito_800ExtraBold",
  },
  gearBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
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
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  featuredText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    letterSpacing: 0.3,
  },
  recentSection: {
    marginBottom: 4,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 18,
    fontFamily: "Nunito_800ExtraBold",
  },
});
