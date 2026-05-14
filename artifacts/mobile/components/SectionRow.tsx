import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import StoryCard from "@/components/StoryCard";
import { type Story } from "@/data/stories";
import { useColors } from "@/hooks/useColors";

interface SectionRowProps {
  title: string;
  stories: Story[];
  size?: "card" | "small";
  emoji?: string;
}

export default function SectionRow({ title, stories, size = "card", emoji }: SectionRowProps) {
  const colors = useColors();

  if (stories.length === 0) return null;

  return (
    <View style={styles.section}>
      {title ? (
        <View style={styles.titleRow}>
          {emoji ? (
            <Text style={styles.titleEmoji}>{emoji}</Text>
          ) : null}
          <Text style={[styles.sectionTitle, { color: colors.navy }]}>{title}</Text>
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {stories.map((story) => (
          <View key={story.id} style={styles.cardWrapper}>
            <StoryCard story={story} size={size} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  titleEmoji: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: "Nunito_800ExtraBold",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cardWrapper: {},
});
