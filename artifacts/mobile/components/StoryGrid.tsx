import React from "react";
import { StyleSheet, Text, View } from "react-native";
import StoryCard from "@/components/StoryCard";
import { type Story } from "@/data/stories";
import { useColors } from "@/hooks/useColors";

interface StoryGridProps {
  title: string;
  stories: Story[];
  maxItems?: number;
}

export default function StoryGrid({
  title,
  stories,
  maxItems = 6,
}: StoryGridProps) {
  const colors = useColors();
  const displayed = stories.slice(0, maxItems);

  if (displayed.length === 0) return null;

  const rows: Story[][] = [];
  for (let i = 0; i < displayed.length; i += 2) {
    rows.push(displayed.slice(i, i + 2));
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.navy }]}>{title}</Text>
      <View style={styles.grid}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((story) => (
              <StoryCard key={story.id} story={story} size="small" />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Nunito_800ExtraBold",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  grid: {
    paddingHorizontal: 16,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
});
