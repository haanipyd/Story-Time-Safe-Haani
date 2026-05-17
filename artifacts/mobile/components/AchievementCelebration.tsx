import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { type Achievement } from "@/context/ProgressContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  achievement: Achievement;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 3200;

export default function AchievementCelebration({ achievement, onDismiss }: Props) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const star1 = useRef(new Animated.Value(0)).current;
  const star2 = useRef(new Animated.Value(0)).current;
  const star3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 7 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(150),
      Animated.stagger(120, [
        Animated.spring(star1, { toValue: 1, useNativeDriver: true, tension: 120, friction: 6 }),
        Animated.spring(star2, { toValue: 1, useNativeDriver: true, tension: 120, friction: 6 }),
        Animated.spring(star3, { toValue: 1, useNativeDriver: true, tension: 120, friction: 6 }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(400),
      Animated.timing(progressAnim, { toValue: 0, duration: AUTO_DISMISS_MS - 400, useNativeDriver: false }),
    ]).start();

    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [achievement.id]);

  const makeStar = (anim: Animated.Value, dx: number, dy: number, emoji: string) => (
    <Animated.Text
      style={[
        styles.floatingStar,
        {
          transform: [
            { translateX: Animated.multiply(anim, dx) },
            { translateY: Animated.multiply(anim, dy) },
            { scale: anim },
          ],
          opacity: anim,
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );

  return (
    <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onDismiss} />

      <Animated.View
        style={[
          styles.card,
          { backgroundColor: colors.card, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {makeStar(star1, -60, -70, "⭐")}
        {makeStar(star2,  60, -60, "✨")}
        {makeStar(star3,   0, -80, "🎉")}

        <View style={[styles.emojiCircle, { backgroundColor: colors.coral + "20" }]}>
          <Text style={styles.emoji}>{achievement.emoji}</Text>
        </View>

        <Text style={[styles.unlocked, { color: colors.coral }]}>Achievement Unlocked!</Text>
        <Text style={[styles.title, { color: colors.navy }]}>{achievement.title}</Text>
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>{achievement.description}</Text>

        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: colors.coral, width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) },
            ]}
          />
        </View>

        <Text style={[styles.hint, { color: colors.mutedForeground }]}>Tap to continue</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  card: {
    width: 300,
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
    overflow: "visible",
  },
  floatingStar: {
    position: "absolute",
    fontSize: 26,
    top: "30%",
    left: "50%",
    zIndex: 10,
  },
  emojiCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emoji: {
    fontSize: 54,
  },
  unlocked: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontFamily: "Nunito_800ExtraBold",
    textAlign: "center",
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  progressTrack: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  hint: {
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
  },
});
