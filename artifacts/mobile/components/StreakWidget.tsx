import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useProgress } from "@/context/ProgressContext";
import { useColors } from "@/hooks/useColors";

export default function StreakWidget() {
  const colors = useColors();
  const { audioStreak, cardStreak } = useProgress();

  if (audioStreak.count === 0 && cardStreak.count === 0) return null;

  return (
    <View style={styles.row}>
      {audioStreak.count > 0 && (
        <View style={[styles.pill, { backgroundColor: "#FF6B3520" }]}>
          <Text style={styles.pillEmoji}>🔥</Text>
          <Text style={[styles.pillCount, { color: "#FF6B35" }]}>{audioStreak.count}</Text>
        </View>
      )}
      {cardStreak.count > 0 && (
        <View style={[styles.pill, { backgroundColor: colors.purple + "22" }]}>
          <Text style={styles.pillEmoji}>🃏</Text>
          <Text style={[styles.pillCount, { color: colors.purple ?? "#6C5CE7" }]}>{cardStreak.count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
  },
  pillEmoji: {
    fontSize: 14,
  },
  pillCount: {
    fontSize: 14,
    fontFamily: "Nunito_800ExtraBold",
  },
});
