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

export default function ContinueListeningBar() {
  const { currentStory, isPlaying, togglePlay } = useAudio();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [dismissed, setDismissed] = useState(false);

  if (!currentStory || dismissed) return null;

  const category = getCategoryById(currentStory.category);
  const catColor = category?.color ?? colors.coral;

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
          borderColor: catColor,
          shadowColor: catColor,
        },
      ]}
      onPress={handleBarPress}
      activeOpacity={0.93}
    >
      <View style={[styles.accentStrip, { backgroundColor: catColor }]} />

      <View style={[styles.iconWrap, { backgroundColor: catColor + "22" }]}>
        <Ionicons
          name={(category?.icon as "moon-outline") ?? "headset-outline"}
          size={20}
          color={catColor}
        />
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
          size={18}
          color="#fff"
          style={isPlaying ? undefined : { marginLeft: 2 }}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.closeBtn}
        onPress={handleDismiss}
        hitSlop={10}
      >
        <Ionicons name="close" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 68,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
  accentStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  textBlock: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  storyTitle: {
    fontSize: 14,
    fontFamily: "Nunito_800ExtraBold",
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
