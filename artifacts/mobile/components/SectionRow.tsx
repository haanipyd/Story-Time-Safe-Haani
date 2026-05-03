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
}

export default function SectionRow({ title, stories, size = "card" }: SectionRowProps) {
  const colors = useColors();

  if (stories.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.navy }]}>{title}</Text>
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
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Nunito_800ExtraBold",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  cardWrapper: {},
});
