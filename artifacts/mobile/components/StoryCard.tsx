import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAudio } from "@/context/AudioContext";
import { getCategoryById } from "@/data/preferences";
import { type Story } from "@/data/stories";
import { useColors } from "@/hooks/useColors";

const COVER_IMAGES: Record<string, ReturnType<typeof require>> = {
  s1: require("../assets/images/covers/sleepy-elephant.png"),
  s9: require("../assets/images/covers/krishna-butter.png"),
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type CardSize = "featured" | "card" | "small";

interface StoryCardProps {
  story: Story;
  size?: CardSize;
}

const SIZE_CONFIG = {
  featured: { width: SCREEN_WIDTH - 32, height: 220 },
  card: { width: Math.floor(SCREEN_WIDTH * 0.44), height: 200 },
  small: { width: Math.floor((SCREEN_WIDTH - 48) / 2), height: 160 },
};

export default function StoryCard({ story, size = "card" }: StoryCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { playStory } = useAudio();
  const category = getCategoryById(story.category);
  const coverImage = COVER_IMAGES[story.id];
  const { width, height } = SIZE_CONFIG[size];

  const durationLabel =
    story.duration < 5
      ? `${story.duration} min`
      : story.duration >= 10
        ? `${story.duration} min`
        : `${story.duration} min`;

  const handlePress = useCallback(() => {
    playStory(story);
    router.push({
      pathname: "/(tabs)/player",
      params: { id: story.id },
    });
  }, [story, playStory, router]);

  const cardBgColor = category?.color ?? colors.coral;
  const cardLightBg = category?.lightColor ?? "#FFF";

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.88}
      style={[styles.container, { width, height, borderRadius: colors.radius }]}
    >
      {coverImage ? (
        <Image
          source={coverImage}
          style={[styles.image, { borderRadius: colors.radius }]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.colorCard,
            { backgroundColor: cardBgColor, borderRadius: colors.radius },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: "rgba(255,255,255,0.25)" },
            ]}
          >
            <Ionicons
              name={(category?.icon as "moon-outline") ?? "book-outline"}
              size={size === "featured" ? 52 : size === "card" ? 40 : 30}
              color="#fff"
            />
          </View>
        </View>
      )}

      <View
        style={[
          styles.overlay,
          { borderRadius: colors.radius, backgroundColor: coverImage ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.18)" },
        ]}
      />

      <View style={styles.textContainer}>
        <Text
          style={[
            styles.title,
            {
              fontSize: size === "featured" ? 22 : size === "card" ? 15 : 13,
              lineHeight: size === "featured" ? 28 : 20,
            },
          ]}
          numberOfLines={2}
        >
          {story.title}
        </Text>
        <View style={styles.meta}>
          <View style={[styles.badge, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
            <Text style={styles.badgeText}>{durationLabel}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
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
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 6,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
  },
});
