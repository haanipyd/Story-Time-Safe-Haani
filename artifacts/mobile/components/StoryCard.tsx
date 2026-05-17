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
  featured: { width: SCREEN_WIDTH - 32, height: 230 },
  card: { width: Math.floor(SCREEN_WIDTH * 0.44), height: 210 },
  small: { width: Math.floor((SCREEN_WIDTH - 48) / 2), height: 165 },
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

  const RADIUS = colors.radius;

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

        <View
          style={[
            styles.overlay,
            {
              borderRadius: RADIUS,
              backgroundColor: hasImage
                ? "rgba(0,0,0,0.30)"
                : "rgba(0,0,0,0.12)",
            },
          ]}
        />

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

        <View style={styles.textContainer}>
          <Text
            style={[
              styles.title,
              {
                fontSize: size === "featured" ? 22 : size === "card" ? 15 : 13,
                lineHeight: size === "featured" ? 29 : 21,
              },
            ]}
            numberOfLines={2}
          >
            {story.title}
          </Text>
          <View style={styles.meta}>
            <View style={[styles.badge, { backgroundColor: "rgba(255,255,255,0.28)" }]}>
              <Text style={styles.badgeText}>⏱ {durationLabel}</Text>
            </View>
            {!!story.playCount && story.playCount > 0 && (
              <View style={[styles.badge, { backgroundColor: "rgba(255,255,255,0.22)" }]}>
                <Text style={styles.badgeText}>
                  ▶{" "}
                  {story.playCount > 999
                    ? `${Math.floor(story.playCount / 1000)}k`
                    : story.playCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
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
  textContainer: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
  },
  title: {
    color: "#FFFFFF",
    fontFamily: "Nunito_800ExtraBold",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
    marginBottom: 6,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
  },
});
