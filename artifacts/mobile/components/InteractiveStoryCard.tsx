import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { type InteractiveStory } from "@/context/InteractiveStoriesContext";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 32;

const LEARN_GRADIENTS: readonly [string, string, string][] = [
  ["#A8D0F7", "#4A90D9", "#1A5C9E"],
  ["#A8D9A7", "#5B8C5A", "#2E5C2D"],
  ["#F7C99A", "#E87B3F", "#B54D12"],
  ["#E4C4EA", "#C48DC8", "#7A4A80"],
  ["#FAEAA0", "#D4A827", "#9A7410"],
  ["#A0D4DF", "#3A7A8C", "#1A4A56"],
];

interface Props {
  story: InteractiveStory;
  index?: number;
}

export default function InteractiveStoryCard({ story, index = 0 }: Props) {
  const colors = useColors();
  const router = useRouter();
  const gradient = LEARN_GRADIENTS[index % LEARN_GRADIENTS.length] ?? LEARN_GRADIENTS[0];
  const checkpoints = story.segmentCount > 0 ? story.segmentCount : 0;

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push({ pathname: "/(tabs)/interactive-player" as any, params: { id: story.id } });
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.88}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* Cover */}
      <View style={styles.coverWrap}>
        {story.thumbnailUrl ? (
          <Image source={{ uri: story.thumbnailUrl }} style={styles.cover} resizeMode="cover" />
        ) : (
          <LinearGradient colors={gradient} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.cover}>
            <Text style={styles.coverEmoji}>📖</Text>
          </LinearGradient>
        )}

        {/* Language badge */}
        <View style={[styles.langBadge, { backgroundColor: colors.navy + "DD" }]}>
          <Text style={styles.langText}>{story.language.toUpperCase()}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.navy }]} numberOfLines={2}>
          {story.title}
        </Text>

        <View style={styles.badgeRow}>
          {/* Age badge */}
          <View style={[styles.badge, { backgroundColor: colors.yellow + "55" }]}>
            <Text style={[styles.badgeText, { color: colors.navy }]}>
              Age {story.ageMin}–{story.ageMax}
            </Text>
          </View>

          {/* Checkpoint count */}
          {checkpoints > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.coral + "22" }]}>
              <Text style={[styles.badgeText, { color: colors.coral }]}>
                📚 {checkpoints} {checkpoints === 1 ? "question" : "questions"}
              </Text>
            </View>
          )}
        </View>

        {story.description ? (
          <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {story.description}
          </Text>
        ) : null}
      </View>

      {/* Play button */}
      <View style={[styles.playBtn, { backgroundColor: colors.coral }]}>
        <Text style={styles.playText}>▶</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    width: CARD_WIDTH,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  coverWrap: {
    width: 96,
    height: 96,
    position: "relative",
  },
  cover: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  coverEmoji: {
    fontSize: 40,
  },
  langBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  langText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Nunito_700Bold",
    letterSpacing: 0.5,
  },
  info: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontFamily: "Nunito_800ExtraBold",
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
  },
  desc: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
    lineHeight: 16,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  playText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 2,
  },
});
