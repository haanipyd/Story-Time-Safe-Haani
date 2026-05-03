import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PaywallModal from "@/components/PaywallModal";
import { useAudio } from "@/context/AudioContext";
import { useProfile } from "@/context/ProfileContext";
import { getCategoryById } from "@/data/preferences";
import { STORIES, getStoryById, type Story } from "@/data/stories";
import { useColors } from "@/hooks/useColors";

const COVER_IMAGES: Record<string, ReturnType<typeof require>> = {
  s1: require("../../assets/images/covers/sleepy-elephant.png"),
  s9: require("../../assets/images/covers/krishna-butter.png"),
};

const { width: W, height: H } = Dimensions.get("window");

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PlayerScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentStory, isPlaying, progress, elapsedSeconds, playStory, togglePlay } =
    useAudio();
  const { freePlayCount, isPremium, incrementPlayCount, unlockPremium, addToHistory } = useProfile();

  const [showPaywall, setShowPaywall] = useState(false);
  const [pendingStory, setPendingStory] = useState<Story | null>(null);

  const initStory = getStoryById(id ?? "");
  const story = currentStory ?? initStory;
  const category = story ? getCategoryById(story.category) : null;
  const coverImage = story ? COVER_IMAGES[story.id] : null;
  const cardBg = category?.color ?? colors.coral;

  useEffect(() => {
    if (initStory && (!currentStory || currentStory.id !== initStory.id)) {
      playStory(initStory);
    }
  }, [initStory?.id]);

  const totalSeconds = story ? story.duration * 60 : 0;
  const remaining = totalSeconds - elapsedSeconds;

  const currentIdx = story ? STORIES.findIndex((s) => s.id === story.id) : -1;
  const prevStory =
    currentIdx > 0 ? STORIES[currentIdx - 1] : STORIES[STORIES.length - 1];
  const nextStory =
    currentIdx >= 0 && currentIdx < STORIES.length - 1
      ? STORIES[currentIdx + 1]
      : STORIES[0];

  const doPlayStory = useCallback(
    (s: Story) => {
      if (freePlayCount >= 5 && !isPremium) {
        setPendingStory(s);
        setShowPaywall(true);
        return;
      }
      incrementPlayCount();
      addToHistory(s.id);
      playStory(s);
    },
    [freePlayCount, isPremium, incrementPlayCount, addToHistory, playStory]
  );

  const handlePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    doPlayStory(prevStory);
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    doPlayStory(nextStory);
  };

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    togglePlay();
  };

  const handleBack = () => {
    router.back();
  };

  const handlePaywallUnlock = useCallback(() => {
    unlockPremium();
    setShowPaywall(false);
    if (pendingStory) {
      incrementPlayCount();
      addToHistory(pendingStory.id);
      playStory(pendingStory);
      setPendingStory(null);
    }
  }, [pendingStory, unlockPremium, incrementPlayCount, addToHistory, playStory]);

  if (!story) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.backBtn, { top: insets.top + 12 }]}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={styles.root}>
      {coverImage ? (
        <Image
          source={coverImage}
          style={[StyleSheet.absoluteFillObject]}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: cardBg }]}>
          <View style={styles.bgIconContainer}>
            <Ionicons
              name={(category?.icon as "moon-outline") ?? "book-outline"}
              size={180}
              color="rgba(255,255,255,0.15)"
            />
          </View>
        </View>
      )}

      <View style={[StyleSheet.absoluteFillObject, styles.dimOverlay]} />

      <TouchableOpacity
        onPress={handleBack}
        style={[styles.backBtn, { top: topPadding + 12 }]}
        hitSlop={12}
      >
        <Ionicons name="arrow-back" size={26} color="#fff" />
      </TouchableOpacity>

      <View style={styles.centerContent}>
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: "rgba(255,255,255,0.2)" },
          ]}
        >
          <Text style={styles.categoryText}>
            {category?.label ?? "Story"}
          </Text>
        </View>
        <Text style={styles.storyTitle}>{story.title}</Text>
        <Text style={styles.storyDesc} numberOfLines={2}>
          {story.description}
        </Text>
      </View>

      <View style={[styles.bottomControls, { paddingBottom: bottomPadding + 24 }]}>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(elapsedSeconds)}</Text>
          <Text style={styles.timeText}>-{formatTime(remaining)}</Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(progress * 100, 100)}%`,
                backgroundColor: "#fff",
              },
            ]}
          />
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity
            onPress={handlePrev}
            style={styles.skipBtn}
            hitSlop={10}
          >
            <Ionicons
              name="play-skip-back"
              size={30}
              color="rgba(255,255,255,0.85)"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleToggle}
            style={styles.playBtn}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.playBtnInner,
                { backgroundColor: "rgba(255,255,255,0.95)" },
              ]}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={36}
                color={cardBg}
                style={isPlaying ? undefined : { marginLeft: 4 }}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNext}
            style={styles.skipBtn}
            hitSlop={10}
          >
            <Ionicons
              name="play-skip-forward"
              size={30}
              color="rgba(255,255,255,0.85)"
            />
          </TouchableOpacity>
        </View>
      </View>

      <PaywallModal
        visible={showPaywall}
        onClose={() => { setShowPaywall(false); setPendingStory(null); }}
        onUnlock={handlePaywallUnlock}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  dimOverlay: {
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  bgIconContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  categoryBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  categoryText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    letterSpacing: 0.5,
  },
  storyTitle: {
    color: "#fff",
    fontSize: 30,
    fontFamily: "Nunito_800ExtraBold",
    textAlign: "center",
    marginBottom: 12,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  storyDesc: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  bottomControls: {
    paddingHorizontal: 32,
    alignItems: "center",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 8,
  },
  timeText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
  },
  progressTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 2,
    marginBottom: 32,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    marginBottom: 8,
  },
  skipBtn: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {},
  playBtnInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});
