import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PaywallModal from "@/components/PaywallModal";
import { useAudio } from "@/context/AudioContext";
import { useProfile } from "@/context/ProfileContext";
import { useProgress } from "@/context/ProgressContext";
import { getCategoryById } from "@/data/preferences";
import { type Story } from "@/data/stories";
import { useStoriesContext } from "@/context/StoriesContext";
import { useColors } from "@/hooks/useColors";

const COVER_IMAGES: Record<string, ReturnType<typeof require>> = {
  s1: require("../../assets/images/covers/sleepy-elephant.png"),
  s9: require("../../assets/images/covers/krishna-butter.png"),
};

const CATEGORY_EMOJI: Record<string, string> = {
  bedtime: "🌙", adventure: "🗺️", animal: "🐾", songs: "🎵",
  mythology: "✨", learning: "📚", yoga: "🦁", nature: "🌿",
  funny: "🤣", classic: "🏰", fairy_tales: "🦄", music: "🎶",
  friendship: "🤝", family: "👨‍👩‍👧", default: "📖",
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
  { top: "10%", left: "8%",  size: 18, char: "✦", opacity: 0.50 },
  { top: "15%", right: "10%", size: 13, char: "·",  opacity: 0.65 },
  { top: "60%", left: "6%",  size: 12, char: "✦", opacity: 0.35 },
  { top: "72%", right: "8%", size: 16, char: "✦", opacity: 0.40 },
  { top: "38%", right: "7%", size: 10, char: "·",  opacity: 0.50 },
  { top: "50%", left: "10%", size: 10, char: "·",  opacity: 0.40 },
];

const TIMER_OPTIONS: { label: string; minutes: number | null }[] = [
  { label: "Off", minutes: null },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "60 min", minutes: 60 },
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ART_WIDTH = SCREEN_WIDTH - 56;
// Cap art height so everything fits on screen without scrolling
const ART_HEIGHT = Math.min(Math.round(ART_WIDTH * 0.82), Math.round(SCREEN_HEIGHT * 0.31));

function formatTime(seconds: number) {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function formatSleepLabel(seconds: number) {
  const m = Math.ceil(seconds / 60);
  return m <= 0 ? "0m" : `${m}m`;
}

export default function PlayerScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    currentStory, isPlaying, isBuffering, progress, elapsedSeconds,
    sleepTimerSeconds, playStory, togglePlay, seekBy, seekTo, stop, setSleepTimer,
  } = useAudio();

  const trackWidthRef = useRef(0);
  const initialLocalXRef = useRef(0);
  const progressViewRef = useRef<View>(null);
  const isDraggingRef = useRef(false);
  const { stories: allStories, getStoryById } = useStoriesContext();
  const { freePlayCount, isPremium, incrementPlayCount, unlockPremium, addToHistory } = useProfile();
  const { recordAudioPlay } = useProgress();
  const playRecordedRef = React.useRef(false);

  const [showPaywall, setShowPaywall] = useState(false);
  const [pendingStory, setPendingStory] = useState<Story | null>(null);
  const [showTimerSheet, setShowTimerSheet] = useState(false);
  const [seekFlashSide, setSeekFlashSide] = useState<"left" | "right" | null>(null);

  const seekFlashAnim = useRef(new Animated.Value(0)).current;
  const leftTapCount = useRef(0);
  const rightTapCount = useRef(0);
  const leftTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rightTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSeekFlash = useCallback((side: "left" | "right") => {
    setSeekFlashSide(side);
    seekFlashAnim.setValue(1);
    Animated.timing(seekFlashAnim, { toValue: 0, duration: 650, useNativeDriver: true }).start();
  }, [seekFlashAnim]);

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
      leftTapTimer.current = setTimeout(() => { leftTapCount.current = 0; }, 300);
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
      rightTapTimer.current = setTimeout(() => { rightTapCount.current = 0; }, 300);
    }
  }, [seekBy, triggerSeekFlash]);

  const initStory = getStoryById(id ?? "") ?? undefined;
  const story = currentStory ?? initStory;
  const category = story ? getCategoryById(story.category) : null;
  const remoteThumbnail = story?.thumbnailUrl ?? null;
  const coverImage = story ? (remoteThumbnail ? null : COVER_IMAGES[story.id] ?? null) : null;
  const gradient = story ? (CATEGORY_GRADIENTS[story.category] ?? CATEGORY_GRADIENTS.default) : CATEGORY_GRADIENTS.default;
  const emoji = story ? (CATEGORY_EMOJI[story.category] ?? CATEGORY_EMOJI.default) : "📖";
  const accentColor = category?.color ?? colors.coral;

  useEffect(() => {
    if (initStory && (!currentStory || currentStory.id !== initStory.id)) {
      playStory(initStory);
      playRecordedRef.current = false;
    }
  }, [initStory?.id]);

  useEffect(() => {
    if (progress >= 0.9 && story && !playRecordedRef.current) {
      playRecordedRef.current = true;
      recordAudioPlay(story.duration);
    }
  }, [progress, story, recordAudioPlay]);

  const totalSeconds = story ? (Number(story.duration) || 0) * 60 : 0;
  const remaining = totalSeconds - elapsedSeconds;

  const seekFromLocalX = useCallback((localX: number) => {
    const w = trackWidthRef.current;
    if (!w || !isFinite(localX)) return;
    const ratio = Math.max(0, Math.min(localX / w, 1));
    const target = ratio * totalSeconds;
    if (!isFinite(target)) return;
    seekTo(target);
  }, [seekTo, totalSeconds]);

  // Keep a mutable ref so PanResponder (created once) always calls the latest seekFromLocalX
  const seekFromLocalXRef = useRef(seekFromLocalX);
  useEffect(() => { seekFromLocalXRef.current = seekFromLocalX; }, [seekFromLocalX]);

  const progressPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        initialLocalXRef.current = evt.nativeEvent.locationX;
        seekFromLocalXRef.current(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (_evt, gestureState) => {
        seekFromLocalXRef.current(initialLocalXRef.current + gestureState.dx);
      },
      onPanResponderRelease: () => { isDraggingRef.current = false; },
    })
  ).current;

  // Web: document-level pointermove/pointerup so drag keeps working when
  // the pointer leaves the element or the ScrollView intercepts events.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const domEl = progressViewRef.current as unknown as HTMLElement | null;
    if (!domEl) return;

    domEl.style.cursor = "pointer";
    (domEl.style as CSSStyleDeclaration & { touchAction: string }).touchAction = "none";

    const getX = (e: PointerEvent) => {
      const rect = domEl.getBoundingClientRect();
      return Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    };

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = true;
      seekFromLocalXRef.current(getX(e));

      const onDocMove = (ev: PointerEvent) => {
        if (!isDraggingRef.current) return;
        const rect = domEl.getBoundingClientRect();
        seekFromLocalXRef.current(
          Math.max(0, Math.min(ev.clientX - rect.left, rect.width))
        );
      };
      const onDocUp = () => {
        isDraggingRef.current = false;
        document.removeEventListener("pointermove", onDocMove);
        document.removeEventListener("pointerup", onDocUp);
        document.removeEventListener("pointercancel", onDocUp);
      };
      document.addEventListener("pointermove", onDocMove);
      document.addEventListener("pointerup", onDocUp);
      document.addEventListener("pointercancel", onDocUp);
    };

    domEl.addEventListener("pointerdown", onDown);
    return () => { domEl.removeEventListener("pointerdown", onDown); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const storyList = allStories.length > 0 ? allStories : [];
  const currentIdx = story ? storyList.findIndex((s) => s.id === story.id) : -1;
  const prevStory = storyList.length > 0
    ? (currentIdx > 0 ? storyList[currentIdx - 1] : storyList[storyList.length - 1])
    : null;
  const nextStory = storyList.length > 0
    ? (currentIdx >= 0 && currentIdx < storyList.length - 1 ? storyList[currentIdx + 1] : storyList[0])
    : null;

  const doPlayStory = useCallback((s: Story) => {
    if (freePlayCount >= 3 && !isPremium) { setPendingStory(s); setShowPaywall(true); return; }
    incrementPlayCount(); addToHistory(s.id); playStory(s);
  }, [freePlayCount, isPremium, incrementPlayCount, addToHistory, playStory]);

  const handlePrev = () => { if (prevStory) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); doPlayStory(prevStory); } };
  const handleNext = () => { if (nextStory) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); doPlayStory(nextStory); } };
  const handleToggle = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); togglePlay(); };
  const handleBack = useCallback(async () => { await stop(); router.back(); }, [stop]);
  const handleTimerOption = (minutes: number | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSleepTimer(minutes);
    setShowTimerSheet(false);
  };
  const handlePaywallUnlock = useCallback(() => {
    unlockPremium(); setShowPaywall(false);
    if (pendingStory) { incrementPlayCount(); addToHistory(pendingStory.id); playStory(pendingStory); setPendingStory(null); }
  }, [pendingStory, unlockPremium, incrementPlayCount, addToHistory, playStory]);

  const topPadding = Platform.OS === "web" ? 20 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 20 : insets.bottom;
  const timerActive = sleepTimerSeconds !== null;

  if (!story) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={handleBack} style={[styles.backBtn, { top: topPadding + 8 }]}>
          <Ionicons name="chevron-back" size={26} color={colors.navy} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Ambient glow behind art */}
      <View
        style={[styles.ambientGlow, { backgroundColor: accentColor + "28", top: topPadding + 52 }]}
      />

      {/* Header */}
      <View style={[styles.header, { top: topPadding + 8 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.navy} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerLabel, { color: colors.mutedForeground }]}>Now Playing</Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowTimerSheet(true)}
          style={[styles.headerBtn, styles.timerBtnRight, timerActive && { backgroundColor: accentColor + "22" }]}
          hitSlop={12}
        >
          <Ionicons name="moon" size={18} color={timerActive ? accentColor : colors.mutedForeground} />
          {timerActive && sleepTimerSeconds !== null && (
            <Text style={[styles.timerBadge, { color: accentColor }]}>{formatSleepLabel(sleepTimerSeconds)}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        scrollEnabled={false}
        bounces={false}
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 64, paddingBottom: bottomPadding + 16 }]}
      >
        {/* ── Art Card ── */}
        <View style={styles.artWrapper}>
          <View style={[styles.artCard, { width: ART_WIDTH, height: ART_HEIGHT }]}>
            {remoteThumbnail ? (
              <Image source={{ uri: remoteThumbnail }} style={styles.artImage} resizeMode="cover" />
            ) : coverImage ? (
              <Image source={coverImage} style={styles.artImage} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={gradient}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={styles.artGradient}
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
                <Text style={styles.artEmoji}>{emoji}</Text>
              </LinearGradient>
            )}

            {/* Double-tap seek zones on art card */}
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

            {/* Seek flash */}
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
                    size={24} color="#fff"
                  />
                  <Text style={styles.seekFlashLabel}>
                    {seekFlashSide === "left" ? "−10s" : "+10s"}
                  </Text>
                </View>
              </Animated.View>
            )}
          </View>
        </View>

        {/* ── Story Info ── */}
        <View style={styles.infoSection}>
          {category && (
            <View style={[styles.categoryPill, { backgroundColor: accentColor + "1A" }]}>
              <Text style={[styles.categoryPillText, { color: accentColor }]}>{category.label}</Text>
            </View>
          )}
          <Text style={[styles.storyTitle, { color: colors.navy }]} numberOfLines={2}>
            {story.title}
          </Text>
          {story.description ? (
            <Text style={[styles.storyDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
              {story.description}
            </Text>
          ) : null}
        </View>

        {/* ── Progress ── */}
        <View style={styles.progressSection}>
          <View
            ref={progressViewRef}
            style={styles.progressTrack}
            onLayout={(e) => {
              trackWidthRef.current = e.nativeEvent.layout.width;
            }}
            {...(Platform.OS !== "web" ? progressPanResponder.panHandlers : {})}
          >
            <View style={styles.progressTrackBg} />
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(progress * 100, 100)}%` as unknown as number, backgroundColor: accentColor },
              ]}
            />
            <View
              style={[
                styles.progressThumb,
                {
                  left: `${Math.min(progress * 100, 100)}%` as unknown as number,
                  backgroundColor: accentColor,
                },
              ]}
            />
          </View>

          <View style={styles.timeRow}>
            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
              {formatTime(elapsedSeconds)}
            </Text>
            {timerActive && sleepTimerSeconds !== null ? (
              <View style={styles.sleepCountdown}>
                <Ionicons name="moon" size={10} color={accentColor} />
                <Text style={[styles.timeText, { color: accentColor }]}>
                  {formatTime(sleepTimerSeconds)}
                </Text>
              </View>
            ) : (
              <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
                -{formatTime(remaining)}
              </Text>
            )}
          </View>
        </View>

        {/* ── Controls ── */}
        <View style={styles.controlsRow}>
          <TouchableOpacity onPress={handlePrev} style={styles.skipBtn} hitSlop={10}>
            <Ionicons name="play-skip-back" size={28} color={colors.navy} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleToggle}
            activeOpacity={0.82}
            disabled={isBuffering}
          >
            <View style={[styles.playBtn, { backgroundColor: accentColor }]}>
              {isBuffering ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={36}
                  color="#fff"
                  style={isPlaying ? undefined : { marginLeft: 4 }}
                />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNext} style={styles.skipBtn} hitSlop={10}>
            <Ionicons name="play-skip-forward" size={28} color={colors.navy} />
          </TouchableOpacity>
        </View>

        {/* Duration / age tag row */}
        {(story.duration || story.ageMin) ? (
          <View style={styles.metaRow}>
            {story.duration ? (
              <View style={[styles.metaChip, { backgroundColor: colors.muted }]}>
                <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
                <Text style={[styles.metaChipText, { color: colors.mutedForeground }]}>
                  {story.duration} min
                </Text>
              </View>
            ) : null}
            {story.ageMin ? (
              <View style={[styles.metaChip, { backgroundColor: colors.muted }]}>
                <Ionicons name="happy-outline" size={12} color={colors.mutedForeground} />
                <Text style={[styles.metaChipText, { color: colors.mutedForeground }]}>
                  Ages {story.ageMin}–{story.ageMax}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

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
          <View style={[styles.timerSheet, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
            <View style={styles.timerSheetHeader}>
              <Ionicons name="moon" size={16} color={accentColor} />
              <Text style={[styles.timerSheetTitle, { color: colors.navy }]}>Sleep Timer</Text>
            </View>
            {TIMER_OPTIONS.map((opt) => {
              const isSelected = opt.minutes === null
                ? sleepTimerSeconds === null
                : sleepTimerSeconds !== null && Math.abs(sleepTimerSeconds - opt.minutes * 60) < 30;
              return (
                <TouchableOpacity
                  key={opt.label}
                  style={[styles.timerOption, isSelected && { backgroundColor: accentColor + "18" }]}
                  onPress={() => handleTimerOption(opt.minutes)}
                >
                  {isSelected
                    ? <Ionicons name="checkmark-circle" size={18} color={accentColor} />
                    : <View style={[styles.timerOptionDot, { borderColor: colors.mutedForeground + "60" }]} />
                  }
                  <Text style={[styles.timerOptionText, { color: isSelected ? accentColor : colors.navy }]}>
                    {opt.label}
                  </Text>
                  {isSelected && sleepTimerSeconds !== null && opt.minutes !== null && (
                    <Text style={[styles.timerOptionMeta, { color: accentColor }]}>
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
  root: { flex: 1 },
  ambientGlow: {
    position: "absolute",
    alignSelf: "center",
    width: ART_WIDTH + 60,
    height: ART_HEIGHT + 60,
    borderRadius: (ART_WIDTH + 60) / 2,
  },
  header: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  timerBtnRight: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    width: "auto",
  },
  timerBadge: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerLabel: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  content: {
    paddingHorizontal: 28,
    alignItems: "center",
  },
  artWrapper: {
    alignItems: "center",
    marginBottom: 20,
  },
  artCard: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  artImage: {
    ...StyleSheet.absoluteFillObject,
  },
  artGradient: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  sparkle: {
    position: "absolute",
    color: "rgba(255,255,255,0.85)",
    fontWeight: "700",
  },
  artEmoji: {
    fontSize: 110,
    textAlign: "center",
  },
  seekZoneLeft: {
    position: "absolute",
    top: 0, left: 0, bottom: 0,
    width: "50%",
    zIndex: 5,
  },
  seekZoneRight: {
    position: "absolute",
    top: 0, right: 0, bottom: 0,
    width: "50%",
    zIndex: 5,
  },
  seekFlash: {
    position: "absolute",
    top: 0, bottom: 0,
    width: "50%",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 6,
  },
  seekFlashLeft: { left: 0 },
  seekFlashRight: { right: 0 },
  seekFlashCircle: {
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  seekFlashLabel: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
  },
  infoSection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  categoryPillText: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
    letterSpacing: 0.4,
  },
  storyTitle: {
    fontSize: 26,
    fontFamily: "Nunito_800ExtraBold",
    textAlign: "center",
    lineHeight: 33,
    marginBottom: 6,
  },
  storyDesc: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  progressSection: {
    width: "100%",
    marginBottom: 16,
  },
  progressTrack: {
    width: "100%",
    height: 30,
    justifyContent: "center",
    marginBottom: 4,
  },
  progressTrackBg: {
    position: "absolute",
    left: 0, right: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.10)",
  },
  progressFill: {
    position: "absolute",
    left: 0,
    height: 4,
    borderRadius: 2,
  },
  progressThumb: {
    position: "absolute",
    width: 16, height: 16,
    borderRadius: 8,
    marginLeft: -8,
    top: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  sleepCountdown: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeText: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
    marginBottom: 16,
    width: "100%",
  },
  skipBtn: {
    width: 52, height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 80, height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  metaChipText: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
  },
  timerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  timerSheet: {
    width: 260,
    borderRadius: 20,
    paddingVertical: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  timerSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
    marginBottom: 4,
  },
  timerSheetTitle: {
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
    width: 18, height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
  timerOptionText: { fontSize: 16, fontFamily: "Nunito_700Bold", flex: 1 },
  timerOptionMeta: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 44, height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
