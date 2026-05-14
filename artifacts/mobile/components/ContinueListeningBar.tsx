import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudio } from "@/context/AudioContext";
import { getCategoryById } from "@/data/preferences";
import { useColors } from "@/hooks/useColors";

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

export default function ContinueListeningBar() {
  const { currentStory, isPlaying, togglePlay } = useAudio();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [dismissed, setDismissed] = useState(false);

  if (!currentStory || dismissed) return null;

  const category = getCategoryById(currentStory.category);
  const catColor = category?.color ?? colors.coral;
  const catEmoji = CATEGORY_EMOJI[currentStory.category] ?? CATEGORY_EMOJI.default;

  const handleBarPress = () => {
    router.push({
      pathname: "/(tabs)/player",
      params: { id: currentStory.id },
    });
  };

  const handlePlayToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    togglePlay();
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDismissed(true);
  };

  return (
    <TouchableOpacity
      style={[
        styles.bar,
        {
          bottom: insets.bottom + 16,
          backgroundColor: colors.card,
          borderColor: catColor + "55",
          shadowColor: catColor,
        },
      ]}
      onPress={handleBarPress}
      activeOpacity={0.93}
    >
      <View style={[styles.accentStrip, { backgroundColor: catColor }]} />

      <View style={[styles.emojiWrap, { backgroundColor: catColor + "22" }]}>
        <Text style={styles.emojiText}>{catEmoji}</Text>
      </View>

      <View style={styles.textBlock}>
        <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>
          Continue listening
        </Text>
        <Text style={[styles.storyTitle, { color: colors.navy }]} numberOfLines={1}>
          {currentStory.title}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.playBtn, { backgroundColor: catColor }]}
        onPress={handlePlayToggle}
        hitSlop={10}
      >
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={20}
          color="#fff"
          style={isPlaying ? undefined : { marginLeft: 2 }}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.closeBtn}
        onPress={handleDismiss}
        hitSlop={10}
      >
        <Ionicons name="close-circle" size={22} color={colors.mutedForeground + "88"} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 14,
    right: 14,
    height: 72,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 100,
  },
  accentStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  emojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  emojiText: {
    fontSize: 22,
  },
  textBlock: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  storyTitle: {
    fontSize: 14,
    fontFamily: "Nunito_800ExtraBold",
  },
  playBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
