import { LinearGradient } from "expo-linear-gradient";
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
  animal: "🐾",
  songs: "🎵",
  mythology: "✨",
  learning: "📚",
  yoga: "🦁",
  nature: "🌿",
  funny: "🤣",
  classic: "🏰",
  fairy_tales: "🦄",
  music: "🎶",
  friendship: "🤝",
  family: "👨‍👩‍👧",
  default: "📖",
};

const CATEGORY_GRADIENTS: Record<string, readonly [string, string, string]> = {
  bedtime:    ["#C4BAE8", "#7B6BA8", "#4A3D7A"],
  adventure:  ["#F7C99A", "#E87B3F", "#B54D12"],
  animal:     ["#A8D9A7", "#5B8C5A", "#2E5C2D"],
  songs:      ["#FAEAA0", "#D4A827", "#9A7410"],
  mythology:  ["#A0D4DF", "#3A7A8C", "#1A4A56"],
  learning:   ["#A8D0F7", "#4A90D9", "#1A5C9E"],
  yoga:       ["#E4C4EA", "#C48DC8", "#7A4A80"],
  nature:     ["#A8D4B4", "#4A7C59", "#1E4A2E"],
  funny:      ["#F9C4B8", "#E8826B", "#B54030"],
  classic:    ["#E4D0B0", "#A07040", "#603A10"],
  fairy_tales:["#F7D4E8", "#C4608A", "#7A2A50"],
  music:      ["#B4CEE8", "#4A6FA5", "#1A3A70"],
  friendship: ["#FFE8A0", "#E8921A", "#A85000"],
  family:     ["#F9C4A0", "#F4A261", "#B05A20"],
  default:    ["#FFBFA8", "#E87B5A", "#A8402A"],
};

const SPARKLE_CONFIGS = [
  { top: "12%", left: "8%",  size: 14, char: "✦", opacity: 0.55 },
  { top: "18%", right: "10%", size: 11, char: "·",  opacity: 0.70 },
  { top: "55%", left: "6%",  size: 10, char: "✦", opacity: 0.40 },
  { top: "70%", right: "8%", size: 13, char: "✦", opacity: 0.45 },
  { top: "35%", right: "6%", size: 9,  char: "·",  opacity: 0.55 },
];

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

const EMOJI_SIZE: Record<CardSize, number> = {
  featured: 96,
  card: 72,
  small: 56,
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
  const { width, height } = SIZE_CONFIG[size];

  const emoji = CATEGORY_EMOJI[story.category] ?? CATEGORY_EMOJI.default;
  const durationLabel = story.duration ? `${story.duration} min` : "";
  const gradient = CATEGORY_GRADIENTS[story.category] ?? CATEGORY_GRADIENTS.default;

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
  const emojiSize = EMOJI_SIZE[size];
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
            <LinearGradient
              colors={gradient}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={[styles.gradientCard, { borderRadius: RADIUS }]}
            >
              {SPARKLE_CONFIGS.map((s, i) => (
                <Text
                  key={i}
                  style={[
                    styles.sparkle,
                    {
                      top: s.top,
                      left: "left" in s ? s.left : undefined,
                      right: "right" in s ? s.right : undefined,
                      fontSize: s.size,
                      opacity: s.opacity,
                    } as object,
                  ]}
                >
                  {s.char}
                </Text>
              ))}

              <Text style={[styles.mainEmoji, { fontSize: emojiSize }]}>
                {emoji}
              </Text>

              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.52)"]}
                style={styles.bottomOverlay}
              >
                <Text
                  style={[styles.overlayTitle, { fontSize: size === "featured" ? 16 : 12 }]}
                  numberOfLines={2}
                >
                  {story.title}
                </Text>
                {category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{category.label}</Text>
                  </View>
                )}
              </LinearGradient>
            </LinearGradient>
          )}

          {(remoteThumbnail || localCover) && (
            <View
              style={[
                styles.overlay,
                { borderRadius: RADIUS, backgroundColor: "rgba(0,0,0,0.06)" },
              ]}
            />
          )}

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

        <Text
          style={[styles.cardTitle, { color: colors.navy, fontSize: titleSize }]}
          numberOfLines={2}
        >
          {story.title}
        </Text>

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
  gradientCard: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  sparkle: {
    position: "absolute",
    color: "rgba(255,255,255,0.85)",
    fontWeight: "700",
  },
  mainEmoji: {
    textAlign: "center",
    marginBottom: 32,
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingTop: 24,
    paddingBottom: 10,
  },
  overlayTitle: {
    color: "#fff",
    fontFamily: "Nunito_700Bold",
    lineHeight: 17,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  categoryBadgeText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 9,
    fontFamily: "Nunito_600SemiBold",
    letterSpacing: 0.3,
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
