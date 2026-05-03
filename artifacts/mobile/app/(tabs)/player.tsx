import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
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

const TIMER_OPTIONS: { label: string; minutes: number | null }[] = [
  { label: "Off", minutes: null },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "60 min", minutes: 60 },
];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatSleepLabel(seconds: number) {
  const m = Math.ceil(seconds / 60);
  if (m <= 0) return "0m";
  return `${m}m`;
}

export default function PlayerScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    currentStory,
    isPlaying,
    isBuffering,
    progress,
    elapsedSeconds,
    sleepTimerSeconds,
    playStory,
    togglePlay,
    seekBy,
    setSleepTimer,
  } = useAudio();
  const { freePlayCount, isPremium, incrementPlayCount, unlockPremium, addToHistory } =
    useProfile();

  const [showPaywall, setShowPaywall] = useState(false);
  const [pendingStory, setPendingStory] = useState<Story | null>(null);
  const [showTimerSheet, setShowTimerSheet] = useState(false);
  const [seekFlashSide, setSeekFlashSide] = useState<"left" | "right" | null>(null);

  const seekFlashAnim = useRef(new Animated.Value(0)).current;
  const leftTapCount = useRef(0);
  const rightTapCount = useRef(0);
  const leftTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rightTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSeekFlash = useCallback(
    (side: "left" | "right") => {
      setSeekFlashSide(side);
      seekFlashAnim.setValue(1);
      Animated.timing(seekFlashAnim, {
        toValue: 0,
        duration: 650,
        useNativeDriver: true,
      }).start();
    },
    [seekFlashAnim],
  );

  const handleLeftDoubleTap = useCallback(() => {
    leftTapCount.current += 1;
    if (leftTapCount.current >= 2) {
      leftTapCount.current = 0;
      if (leftTapTimer.current) clearTimeout(leftTapTimer.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      seekBy(-10);
      triggerSeekFlash("left");
    } else {
      if (leftTapTimer.current) clearTimeout(leftTapTimer.current);
      leftTapTimer.current = setTimeout(() => {
        leftTapCount.current = 0;
      }, 300);
    }
  }, [seekBy, triggerSeekFlash]);

  const handleRightDoubleTap = useCallback(() => {
    rightTapCount.current += 1;
    if (rightTapCount.current >= 2) {
      rightTapCount.current = 0;
      if (rightTapTimer.current) clearTimeout(rightTapTimer.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      seekBy(10);
      triggerSeekFlash("right");
    } else {
      if (rightTapTimer.current) clearTimeout(rightTapTimer.current);
      rightTapTimer.current = setTimeout(() => {
        rightTapCount.current = 0;
      }, 300);
    }
  }, [seekBy, triggerSeekFlash]);

  const initStory = getStoryById(id ?? "");
  const story = currentStory ?? initStory;
  const category = story ? getCategoryById(story.category) : null;
  const remoteThumbnail = story?.thumbnailUrl ?? null;
  const coverImage = story ? (remoteThumbnail ? null : COVER_IMAGES[story.id] ?? null) : null;
  const hasImage = !!(remoteThumbnail || coverImage);
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

  const handleTimerOption = (minutes: number | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSleepTimer(minutes);
    setShowTimerSheet(false);
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
  const timerActive = sleepTimerSeconds !== null;

  return (
    <View style={styles.root}>
      {remoteThumbnail ? (
        <Image
          source={{ uri: remoteThumbnail }}
          style={[StyleSheet.absoluteFillObject]}
          resizeMode="cover"
        />
      ) : coverImage ? (
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

      {/* Double-tap seek zones */}
      <TouchableOpacity
        style={styles.seekZoneLeft}
        onPress={handleLeftDoubleTap}
        activeOpacity={1}
      />
      <TouchableOpacity
        style={styles.seekZoneRight}
        onPress={handleRightDoubleTap}
        activeOpacity={1}
      />

      {/* Seek flash feedback */}
      {seekFlashSide !== null && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.seekFlash,
            seekFlashSide === "left" ? styles.seekFlashLeft : styles.seekFlashRight,
            { opacity: seekFlashAnim },
          ]}
        >
          <View style={styles.seekFlashCircle}>
            <Ionicons
              name={seekFlashSide === "left" ? "play-back" : "play-forward"}
              size={26}
              color="#fff"
            />
            <Text style={styles.seekFlashLabel}>
              {seekFlashSide === "left" ? "−10s" : "+10s"}
            </Text>
          </View>
        </Animated.View>
      )}

      <TouchableOpacity
        onPress={handleBack}
        style={[styles.backBtn, { top: topPadding + 12 }]}
        hitSlop={12}
      >
        <Ionicons name="arrow-back" size={26} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setShowTimerSheet(true)}
        style={[
          styles.timerBtn,
          { top: topPadding + 12 },
          timerActive && styles.timerBtnActive,
        ]}
        hitSlop={12}
      >
        <Ionicons
          name="moon"
          size={20}
          color={timerActive ? cardBg : "rgba(255,255,255,0.75)"}
        />
        {timerActive && sleepTimerSeconds !== null && (
          <Text style={[styles.timerBadge, { color: "#fff" }]}>
            {formatSleepLabel(sleepTimerSeconds)}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.centerContent}>
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: "rgba(255,255,255,0.2)" },
          ]}
        >
          <Text style={styles.categoryText}>{category?.label ?? "Story"}</Text>
        </View>
        <Text style={styles.storyTitle}>{story.title}</Text>
        <Text style={styles.storyDesc} numberOfLines={2}>
          {story.description}
        </Text>
      </View>

      <View style={[styles.bottomControls, { paddingBottom: bottomPadding + 24 }]}>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(elapsedSeconds)}</Text>
          {timerActive && sleepTimerSeconds !== null ? (
            <View style={styles.sleepCountdown}>
              <Ionicons name="moon" size={11} color="rgba(255,255,255,0.6)" />
              <Text style={styles.timeText}>{formatTime(sleepTimerSeconds)}</Text>
            </View>
          ) : (
            <Text style={styles.timeText}>-{formatTime(remaining)}</Text>
          )}
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: "#fff" },
            ]}
          />
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity onPress={handlePrev} style={styles.skipBtn} hitSlop={10}>
            <Ionicons name="play-skip-back" size={30} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleToggle}
            activeOpacity={0.8}
            disabled={isBuffering}
          >
            <View
              style={[
                styles.playBtnInner,
                { backgroundColor: "rgba(255,255,255,0.95)" },
              ]}
            >
              {isBuffering ? (
                <ActivityIndicator size="large" color={cardBg} />
              ) : (
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={36}
                  color={cardBg}
                  style={isPlaying ? undefined : { marginLeft: 4 }}
                />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNext} style={styles.skipBtn} hitSlop={10}>
            <Ionicons name="play-skip-forward" size={30} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </View>
      </View>

      <PaywallModal
        visible={showPaywall}
        onClose={() => { setShowPaywall(false); setPendingStory(null); }}
        onUnlock={handlePaywallUnlock}
      />

      <Modal
        visible={showTimerSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimerSheet(false)}
      >
        <TouchableOpacity
          style={styles.timerOverlay}
          activeOpacity={1}
          onPress={() => setShowTimerSheet(false)}
        >
          <View
            style={[styles.timerSheet, { backgroundColor: "rgba(20,20,35,0.97)" }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.timerSheetHeader}>
              <Ionicons name="moon" size={18} color="rgba(255,255,255,0.7)" />
              <Text style={styles.timerSheetTitle}>Sleep Timer</Text>
            </View>

            {TIMER_OPTIONS.map((opt) => {
              const isSelected =
                opt.minutes === null
                  ? sleepTimerSeconds === null
                  : sleepTimerSeconds !== null &&
                    Math.abs(sleepTimerSeconds - opt.minutes * 60) < 30;
              return (
                <TouchableOpacity
                  key={opt.label}
                  style={[
                    styles.timerOption,
                    isSelected && { backgroundColor: cardBg + "33" },
                  ]}
                  onPress={() => handleTimerOption(opt.minutes)}
                >
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={18} color={cardBg} />
                  ) : (
                    <View style={styles.timerOptionDot} />
                  )}
                  <Text
                    style={[
                      styles.timerOptionText,
                      { color: isSelected ? "#fff" : "rgba(255,255,255,0.75)" },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && sleepTimerSeconds !== null && opt.minutes !== null && (
                    <Text style={[styles.timerOptionMeta, { color: cardBg }]}>
                      {formatTime(sleepTimerSeconds)} left
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
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
  timerBtn: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    height: 44,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 22,
  },
  timerBtnActive: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  timerBadge: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
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
    alignItems: "center",
  },
  sleepCountdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
  timerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  timerSheet: {
    width: 260,
    borderRadius: 20,
    paddingVertical: 8,
    overflow: "hidden",
  },
  timerSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
    marginBottom: 4,
  },
  timerSheetTitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  timerOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderRadius: 12,
    marginHorizontal: 6,
    marginVertical: 1,
  },
  timerOptionDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  timerOptionText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    flex: 1,
  },
  timerOptionMeta: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
  },
  seekZoneLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "50%",
    bottom: 160,
    zIndex: 5,
  },
  seekZoneRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "50%",
    bottom: 160,
    zIndex: 5,
  },
  seekFlash: {
    position: "absolute",
    top: 0,
    bottom: 160,
    width: "50%",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 6,
    pointerEvents: "none",
  },
  seekFlashLeft: {
    left: 0,
  },
  seekFlashRight: {
    right: 0,
  },
  seekFlashCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  seekFlashLabel: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
  },
});
