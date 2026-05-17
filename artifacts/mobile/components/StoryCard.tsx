import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import PaywallModal from "@/components/PaywallModal";
import { useAudio } from "@/context/AudioContext";
import { useProfile } from "@/context/ProfileContext";
import { getCategoryById } from "@/data/preferences";
import { type Story } from "@/data/stories";
import { useColors } from "@/hooks/useColors";

const COVER_IMAGES: Record<string, ReturnType<typeof require>> = {
  s1: require("../assets/images/covers/sleepy-elephant.png"),
  s9: require("../assets/images/covers/krishna-butter.png"),
};

const CATEGORY_EMOJI: Record<string, string> = {
  bedtime: "🌙",
  adventure: "🗺️",
  animals: "🐾",
  fairy_tales: "✨",
  nature: "🌿",
  music: "🎵",
  friendship: "🤝",
  family: "👨‍👩‍👧",
  learning: "🌟",
  fantasy: "🦄",
  default: "📖",
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type CardSize = "featured" | "card" | "small";

interface StoryCardProps {
  story: Story;
  size?: CardSize;
}

const SIZE_CONFIG = {
  featured: { width: SCREEN_WIDTH - 32, height: 350 },
  card: { width: Math.floor(SCREEN_WIDTH * 0.44), height: 200 },
  small: { width: Math.floor((SCREEN_WIDTH - 48) / 2), height: 155 },
};

export default function StoryCard({ story, size = "card" }: StoryCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { playStory } = useAudio();
  const { addToHistory, freePlayCount, isPremium, incrementPlayCount, unlockPremium, toggleFavourite, currentProfile } = useProfile();
  const [showPaywall, setShowPaywall] = useState(false);
  const isFavourited = currentProfile?.favourites?.includes(story.id) ?? false;
  const category = getCategoryById(story.category);
  const remoteThumbnail = story.thumbnailUrl ?? null;
  const localCover = COVER_IMAGES[story.id] ?? null;
  const hasImage = !!(remoteThumbnail || localCover);
  const { width, height } = SIZE_CONFIG[size];

  const emoji = CATEGORY_EMOJI[story.category] ?? CATEGORY_EMOJI.default;
  const durationLabel = story.duration ? `${story.duration} min` : "";
  const cardBgColor = category?.color ?? colors.coral;

  const doPlay = useCallback(() => {
    incrementPlayCount();
    addToHistory(story.id);
    playStory(story);
    router.push({ pathname: "/(tabs)/player", params: { id: story.id } });
  }, [story, playStory, addToHistory, incrementPlayCount, router]);

  const handlePress = useCallback(() => {
    if (freePlayCount >= 5 && !isPremium) {
      setShowPaywall(true);
      return;
    }
    doPlay();
  }, [freePlayCount, isPremium, doPlay]);

  const RADIUS = size === "featured" ? 20 : colors.radius;

  const titleSize = size === "featured" ? 17 : size === "card" ? 13 : 12;
  const metaSize = size === "featured" ? 12 : 11;

  return (
    <>
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUnlock={() => {
          unlockPremium();
          setShowPaywall(false);
          doPlay();
        }}
      />
      <View style={{ width }}>
        {/* Thumbnail */}
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.88}
          style={[styles.container, { width, height, borderRadius: RADIUS }]}
        >
          {remoteThumbnail ? (
            <Image
              source={{ uri: remoteThumbnail }}
              style={[styles.image, { borderRadius: RADIUS }]}
              resizeMode="cover"
            />
          ) : localCover ? (
            <Image
              source={localCover}
              style={[styles.image, { borderRadius: RADIUS }]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.colorCard,
                { backgroundColor: cardBgColor, borderRadius: RADIUS },
              ]}
            >
              <View style={styles.emojiCircle}>
                <Text
                  style={[
                    styles.emojiText,
                    { fontSize: size === "featured" ? 64 : size === "card" ? 52 : 38 },
                  ]}
                >
                  {emoji}
                </Text>
              </View>
            </View>
          )}

          {/* Minimal overlay — just enough for heart button visibility */}
          <View
            style={[
              styles.overlay,
              {
                borderRadius: RADIUS,
                backgroundColor: hasImage ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.06)",
              },
            ]}
          />

          {/* Heart button */}
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => {
              Haptics.impactAsync(
                isFavourited
                  ? Haptics.ImpactFeedbackStyle.Light
                  : Haptics.ImpactFeedbackStyle.Medium
              );
              toggleFavourite(story.id);
            }}
            hitSlop={8}
          >
            <Text style={styles.heartEmoji}>
              {isFavourited ? "❤️" : "🤍"}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Title below thumbnail */}
        <Text
          style={[styles.cardTitle, { color: colors.navy, fontSize: titleSize }]}
          numberOfLines={size === "featured" ? 2 : 2}
        >
          {story.title}
        </Text>

        {/* Duration + play count row */}
        {(durationLabel || (story.playCount && story.playCount > 0)) ? (
          <View style={styles.metaRow}>
            {durationLabel ? (
              <Text style={[styles.metaText, { color: colors.mutedForeground, fontSize: metaSize }]}>
                ⏱ {durationLabel}
              </Text>
            ) : null}
            {!!story.playCount && story.playCount > 0 ? (
              <Text style={[styles.metaText, { color: colors.mutedForeground, fontSize: metaSize }]}>
                ▶{" "}
                {story.playCount > 999
                  ? `${Math.floor(story.playCount / 1000)}k`
                  : story.playCount}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    position: "relative",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  colorCard: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    textAlign: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heartBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  heartEmoji: {
    fontSize: 16,
  },
  cardTitle: {
    fontFamily: "Nunito_700Bold",
    marginTop: 7,
    marginBottom: 2,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  metaText: {
    fontFamily: "Nunito_600SemiBold",
  },
});
