import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useInteractiveStories, type FullInteractiveStory, type InteractiveStorySegment } from "@/context/InteractiveStoriesContext";
import { useProfile } from "@/context/ProfileContext";
import { useColors } from "@/hooks/useColors";

const { width: SW, height: SH } = Dimensions.get("window");

// Gradient palette for option tiles
const TILE_GRADIENTS: readonly [string, string][] = [
  ["#FF8C42", "#FFB347"],
  ["#74B9FF", "#A29BFE"],
  ["#55EFC4", "#00B894"],
  ["#FDCB6E", "#F0932B"],
];

const SCENE_GRADIENTS: readonly [string, string, string][] = [
  ["#C4BAE8", "#7B6BA8", "#4A3D7A"],
  ["#A8D0F7", "#4A90D9", "#1A5C9E"],
  ["#A8D9A7", "#5B8C5A", "#2E5C2D"],
  ["#F7C99A", "#E87B3F", "#B54D12"],
];

const WRONG_MESSAGES = [
  "Oops! Try again 🤔",
  "Not quite — look for the hint! 👀",
];
const HINT_MESSAGES = [
  "Look at the glowing one! ✨",
  "Almost there — see the hint? 🌟",
];

// ── Waveform ──────────────────────────────────────────────────────────────────

function WaveformBars() {
  const anims = useRef(Array.from({ length: 5 }, () => new Animated.Value(0.4))).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 100),
          Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: false }),
          Animated.timing(anim, { toValue: 0.3, duration: 350, useNativeDriver: false }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [anims]);

  return (
    <View style={styles.waveform}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.waveBar,
            {
              height: anim.interpolate({ inputRange: [0, 1], outputRange: [6, 22] }),
              opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
            },
          ]}
        />
      ))}
    </View>
  );
}

// ── Option Tile ───────────────────────────────────────────────────────────────

interface TileProps {
  option: { id: string; label: string; emoji: string; imageUrl: string; isCorrect: boolean };
  state: "idle" | "shaking" | "wrong" | "correct" | "hinting" | "disabled";
  onPress: () => void;
  colorIdx: number;
}

function OptionTile({ option, state, onPress, colorIdx }: TileProps) {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const gradient = TILE_GRADIENTS[colorIdx % TILE_GRADIENTS.length] ?? TILE_GRADIENTS[0];

  useEffect(() => {
    if (state === "shaking" || state === "wrong") {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [state, shakeAnim]);

  useEffect(() => {
    if (state === "hinting") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state, pulseAnim]);

  useEffect(() => {
    if (state === "correct") {
      Animated.spring(scaleAnim, { toValue: 1.05, useNativeDriver: true, friction: 5 }).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [state, scaleAnim]);

  const borderColor =
    state === "correct" ? "#3D9970"
      : state === "shaking" || state === "wrong" ? "#E05252"
      : state === "hinting" ? "#F9C74F"
      : "#E8D5B7";

  const bg =
    state === "correct" ? "#E8F5EF"
      : state === "shaking" || state === "wrong" ? "#FFF0F0"
      : "#FFFFFF";

  return (
    <Animated.View
      style={[
        styles.tileOuter,
        {
          transform: [
            { translateX: shakeAnim },
            { scale: state === "hinting" ? pulseAnim : scaleAnim },
          ],
          shadowColor: state === "hinting" ? "#F9C74F" : state === "correct" ? "#3D9970" : "#000",
          shadowOpacity: state === "hinting" || state === "correct" ? 0.4 : 0.06,
          shadowRadius: state === "hinting" ? 12 : 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: state === "hinting" || state === "correct" ? 8 : 2,
        },
      ]}
    >
      <TouchableOpacity
        onPress={state === "disabled" || state === "correct" ? undefined : onPress}
        activeOpacity={0.82}
        style={[
          styles.tile,
          {
            borderColor,
            backgroundColor: bg,
            borderWidth: state === "hinting" || state === "correct" ? 3 : 2,
          },
        ]}
      >
        {/* Image area */}
        {option.imageUrl ? (
          <Image source={{ uri: option.imageUrl }} style={styles.tileImage} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={gradient}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={styles.tileGradient}
          >
            <Text style={styles.tileEmoji}>{option.emoji || "❓"}</Text>
          </LinearGradient>
        )}

        {/* Label */}
        <Text
          style={[
            styles.tileLabel,
            {
              color:
                state === "correct" ? "#3D9970"
                  : state === "shaking" || state === "wrong" ? "#E05252"
                  : "#2D2016",
            },
          ]}
          numberOfLines={2}
        >
          {option.label}
        </Text>

        {/* State icon */}
        {state === "correct" && <Text style={styles.tileIcon}>✅</Text>}
        {(state === "shaking" || state === "wrong") && <Text style={styles.tileIcon}>❌</Text>}
        {state === "hinting" && <Text style={styles.tileIcon}>✨</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Completion Screen ─────────────────────────────────────────────────────────

function CompletionScreen({
  story,
  childName,
  onPlayAgain,
  onBack,
}: {
  story: FullInteractiveStory;
  childName: string;
  onPlayAgain: () => void;
  onBack: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const starAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.spring(starAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, [starAnim]);

  return (
    <View style={[styles.completionRoot, { backgroundColor: "#FDF7ED", paddingTop: insets.top + 20 }]}>
      <Animated.View style={[styles.completionContent, { transform: [{ scale: starAnim }] }]}>
        <Text style={styles.completionStars}>⭐️🌟⭐️</Text>
        <Text style={styles.completionEmoji}>🎉</Text>
        <Text style={[styles.completionTitle, { color: colors.navy }]}>
          Well done, {childName}!
        </Text>
        <Text style={[styles.completionSubtitle, { color: colors.mutedForeground }]}>
          You finished "{story.title}"!
        </Text>

        {story.thumbnailUrl ? (
          <Image source={{ uri: story.thumbnailUrl }} style={styles.completionCover} resizeMode="cover" />
        ) : (
          <View style={[styles.completionCover, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontSize: 64 }}>📖</Text>
          </View>
        )}

        <Text style={styles.completionMoreStars}>🌟 🌟 🌟 🌟 🌟</Text>
      </Animated.View>

      <View style={[styles.completionBtns, { paddingBottom: insets.bottom + 32 }]}>
        <TouchableOpacity
          onPress={onPlayAgain}
          style={[styles.playAgainBtn, { backgroundColor: colors.coral }]}
          activeOpacity={0.85}
        >
          <Text style={styles.playAgainText}>▶  Play again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backLink, { color: colors.mutedForeground }]}>← Back to Learn</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main Player ───────────────────────────────────────────────────────────────

export default function InteractivePlayerScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fetchFullStory } = useInteractiveStories();
  const { currentProfile } = useProfile();

  const childName = currentProfile?.name ?? "Little One";

  const [story, setStory] = useState<FullInteractiveStory | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [correctOptionId, setCorrectOptionId] = useState<string | null>(null);
  const [shakingOptionId, setShakingOptionId] = useState<string | null>(null);
  const [audioFinished, setAudioFinished] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);

  // ── Audio ──────────────────────────────────────────────────────────────────

  const unloadAudio = useCallback(async () => {
    if (soundRef.current) {
      try { await soundRef.current.unloadAsync(); } catch { /* ignore */ }
      soundRef.current = null;
    }
  }, []);

  const loadAudio = useCallback(async (url: string) => {
    await unloadAudio();
    if (!url) { setAudioFinished(true); return; }
    setIsAudioLoading(true);
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setAudioFinished(true);
          }
        }
      );
      soundRef.current = sound;
    } catch {
      setAudioFinished(true); // fail gracefully — let user tap Continue
    } finally {
      setIsAudioLoading(false);
    }
  }, [unloadAudio]);

  useEffect(() => {
    return () => { unloadAudio(); };
  }, [unloadAudio]);

  // ── Load story ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchFullStory(id).then((s) => {
      if (cancelled) return;
      if (!s) { setLoadError(true); return; }
      setStory(s);
    });
    return () => { cancelled = true; };
  }, [id, fetchFullStory]);

  // ── Load audio when segment changes ───────────────────────────────────────

  const currentSegment: InteractiveStorySegment | undefined = story?.segments[segmentIndex];

  useEffect(() => {
    if (!currentSegment) return;
    setCorrectOptionId(null);
    setShakingOptionId(null);
    setWrongAttempts(0);
    setFeedbackMsg(null);
    setAutoAdvancing(false);

    if (currentSegment.type === "narration") {
      setAudioFinished(false);
      loadAudio(currentSegment.audioUrl);
    } else {
      setAudioFinished(true); // checkpoints don't have narration audio to wait for
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentIndex, story?.id]);

  // ── Navigation helpers ────────────────────────────────────────────────────

  const advance = useCallback(() => {
    if (!story) return;
    const next = segmentIndex + 1;
    if (next >= story.segments.length) {
      setCompleted(true);
    } else {
      setSegmentIndex(next);
    }
  }, [segmentIndex, story]);

  const handleContinue = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    advance();
  }, [advance]);

  const handlePlayAgain = useCallback(() => {
    setCompleted(false);
    setSegmentIndex(0);
    setWrongAttempts(0);
    setCorrectOptionId(null);
    setShakingOptionId(null);
    setFeedbackMsg(null);
    setAutoAdvancing(false);
  }, []);

  // ── Checkpoint tap logic ──────────────────────────────────────────────────

  const handleOptionTap = useCallback(
    (optionId: string, isCorrect: boolean) => {
      if (autoAdvancing || correctOptionId) return;

      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCorrectOptionId(optionId);
        setFeedbackMsg("🎉 Yes! Great job!");
        setTimeout(() => advance(), 1000);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const nextWrong = wrongAttempts + 1;
      setWrongAttempts(nextWrong);
      setShakingOptionId(optionId);
      setTimeout(() => setShakingOptionId(null), 700);

      if (nextWrong >= 3) {
        // Auto-reveal correct answer
        setAutoAdvancing(true);
        const correct = currentSegment?.options.find((o) => o.isCorrect);
        if (correct) {
          setCorrectOptionId(correct.id);
          setFeedbackMsg("The right answer was " + correct.label + "! Let's keep going 😊");
          setTimeout(() => advance(), 1800);
        }
        return;
      }

      if (nextWrong === 2) {
        setFeedbackMsg(HINT_MESSAGES[0] ?? "Look at the hint!");
      } else {
        setFeedbackMsg(WRONG_MESSAGES[0] ?? "Try again!");
      }
    },
    [autoAdvancing, correctOptionId, wrongAttempts, advance, currentSegment]
  );

  // ── Render guards ─────────────────────────────────────────────────────────

  if (!story && loadError) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 48 }}>😟</Text>
        <Text style={[styles.errorTitle, { color: colors.navy }]}>Couldn't load this story</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.retryBtn, { backgroundColor: colors.coral }]}>
          <Text style={styles.retryText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!story) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 48 }}>📖</Text>
        <Text style={[{ fontSize: 16, color: colors.mutedForeground, fontFamily: "Nunito_600SemiBold", marginTop: 12 }]}>
          Loading story…
        </Text>
      </View>
    );
  }

  if (completed) {
    return (
      <CompletionScreen
        story={story}
        childName={childName}
        onPlayAgain={handlePlayAgain}
        onBack={() => router.back()}
      />
    );
  }

  if (!currentSegment) return null;

  const progress = story.segments.length > 0
    ? (segmentIndex + (correctOptionId ? 1 : 0)) / story.segments.length
    : 0;

  // ── Narration mode ────────────────────────────────────────────────────────

  if (currentSegment.type === "narration") {
    const sceneGrad = SCENE_GRADIENTS[segmentIndex % SCENE_GRADIENTS.length] ?? SCENE_GRADIENTS[0];

    return (
      <View style={[styles.root, { backgroundColor: "#FDF7ED" }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={colors.navy} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.navy }]} numberOfLines={1}>
            {story.title}
          </Text>
          <View style={{ width: 26 }} />
        </View>

        {/* Progress */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: colors.coral }]} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.narrationScroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Scene image */}
          <View style={styles.sceneWrap}>
            {currentSegment.sceneImageUrl ? (
              <Image source={{ uri: currentSegment.sceneImageUrl }} style={styles.sceneImage} resizeMode="cover" />
            ) : story.thumbnailUrl ? (
              <Image source={{ uri: story.thumbnailUrl }} style={styles.sceneImage} resizeMode="cover" />
            ) : (
              <LinearGradient colors={sceneGrad} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.sceneImage}>
                <Text style={{ fontSize: 80, textAlign: "center" }}>📖</Text>
              </LinearGradient>
            )}
          </View>

          {/* Audio indicator */}
          <View style={styles.audioRow}>
            {!audioFinished ? (
              <>
                <WaveformBars />
                <Text style={[styles.audioLabel, { color: colors.mutedForeground }]}>
                  {isAudioLoading ? "Loading…" : "Listening…"}
                </Text>
              </>
            ) : (
              <Text style={[styles.audioLabel, { color: colors.green }]}>✓ Done</Text>
            )}
          </View>

          {/* Caption */}
          {currentSegment.questionText ? (
            <View style={[styles.captionCard, { backgroundColor: "#FFF4E0" }]}>
              <Text style={[styles.captionText, { color: "#4A3728" }]}>
                {currentSegment.questionText}
              </Text>
            </View>
          ) : null}

          {/* Continue button */}
          {audioFinished && (
            <TouchableOpacity
              onPress={handleContinue}
              style={[styles.continueBtn, { backgroundColor: colors.coral }]}
              activeOpacity={0.85}
            >
              <Text style={styles.continueBtnText}>Continue  →</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Checkpoint mode ───────────────────────────────────────────────────────

  const isHinting = wrongAttempts >= 2 && !correctOptionId && !autoAdvancing;
  const totalTiles = Math.min(currentSegment.options.length, 4);
  const tileWidth = totalTiles <= 3
    ? Math.floor((SW - 32 - (totalTiles - 1) * 12) / totalTiles)
    : Math.floor((SW - 32 - 3 * 10) / 4);

  return (
    <View style={[styles.root, { backgroundColor: "#FDF7ED" }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.navy} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.navy }]} numberOfLines={1}>
          {story.title}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Progress */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: colors.coral }]} />
      </View>

      {/* Question */}
      <View style={styles.questionWrap}>
        <Text style={[styles.questionText, { color: colors.navy }]}>
          🤔 {currentSegment.questionText || "What's the right answer?"}
        </Text>
        {feedbackMsg ? (
          <Text style={[styles.feedbackText, { color: correctOptionId ? colors.green : isHinting ? "#D4A827" : "#E05252" }]}>
            {feedbackMsg}
          </Text>
        ) : (
          <Text style={[styles.feedbackText, { color: colors.mutedForeground }]}>
            Tap the right answer to continue!
          </Text>
        )}
      </View>

      {/* Option tiles */}
      <View style={[styles.tilesRow, { gap: totalTiles <= 3 ? 12 : 10 }]}>
        {currentSegment.options.slice(0, 4).map((opt, i) => {
          let tileState: TileProps["state"] = "idle";
          if (correctOptionId === opt.id) tileState = "correct";
          else if (correctOptionId && !opt.isCorrect) tileState = "disabled";
          else if (shakingOptionId === opt.id) tileState = "shaking";
          else if (isHinting && opt.isCorrect) tileState = "hinting";
          else if (autoAdvancing && !opt.isCorrect) tileState = "disabled";

          return (
            <View key={opt.id} style={{ width: tileWidth }}>
              <OptionTile
                option={opt}
                state={tileState}
                onPress={() => handleOptionTap(opt.id, opt.isCorrect)}
                colorIdx={i}
              />
            </View>
          );
        })}
      </View>

      {/* Progress label */}
      <Text style={[styles.segmentLabel, { color: colors.mutedForeground }]}>
        {segmentIndex + 1} / {story.segments.length}
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const SCENE_SIZE = Math.min(SW - 32, Math.round(SH * 0.38));

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    marginHorizontal: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#EDD9B8",
    marginHorizontal: 16,
    borderRadius: 3,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  narrationScroll: {
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 16,
  },
  sceneWrap: {
    borderRadius: 24,
    overflow: "hidden",
    width: SCENE_SIZE,
    height: SCENE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  sceneImage: {
    width: SCENE_SIZE,
    height: SCENE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 28,
  },
  waveform: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 28,
  },
  waveBar: {
    width: 4,
    backgroundColor: "#E07B39",
    borderRadius: 2,
  },
  audioLabel: {
    fontSize: 12,
    fontFamily: "Nunito_700Bold",
  },
  captionCard: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 1,
  },
  captionText: {
    fontSize: 16,
    fontFamily: "Nunito_600SemiBold",
    lineHeight: 24,
    textAlign: "center",
  },
  continueBtn: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 24,
    marginTop: 4,
  },
  continueBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Nunito_800ExtraBold",
  },
  questionWrap: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 6,
  },
  questionText: {
    fontSize: 20,
    fontFamily: "Nunito_800ExtraBold",
    textAlign: "center",
    lineHeight: 28,
  },
  feedbackText: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
    textAlign: "center",
  },
  tilesRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 16,
    flexWrap: "nowrap",
  },
  tileOuter: {
    borderRadius: 22,
  },
  tile: {
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 8,
  },
  tileGradient: {
    width: 70,
    height: 70,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tileImage: {
    width: 70,
    height: 70,
    borderRadius: 18,
  },
  tileEmoji: {
    fontSize: 38,
  },
  tileLabel: {
    fontSize: 13,
    fontFamily: "Nunito_800ExtraBold",
    textAlign: "center",
    lineHeight: 16,
  },
  tileIcon: {
    fontSize: 18,
  },
  segmentLabel: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    marginTop: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
    marginTop: 12,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
  },
  // Completion
  completionRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },
  completionContent: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    flex: 1,
    justifyContent: "center",
  },
  completionStars: {
    fontSize: 28,
  },
  completionEmoji: {
    fontSize: 80,
  },
  completionTitle: {
    fontSize: 30,
    fontFamily: "Nunito_800ExtraBold",
    textAlign: "center",
  },
  completionSubtitle: {
    fontSize: 16,
    fontFamily: "Nunito_600SemiBold",
    textAlign: "center",
  },
  completionCover: {
    width: 160,
    height: 160,
    borderRadius: 24,
    marginTop: 8,
  },
  completionMoreStars: {
    fontSize: 24,
    marginTop: 8,
  },
  completionBtns: {
    width: "100%",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  playAgainBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: "center",
  },
  playAgainText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Nunito_800ExtraBold",
  },
  backLink: {
    fontSize: 15,
    fontFamily: "Nunito_600SemiBold",
  },
});
