import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import React, { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FLASHCARD_SETS, getAllCards } from "@/data/flashcards";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH - 72;
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.12);

interface FlashcardPlayerProps {
  extraBottomPadding?: number;
}

export default function FlashcardPlayer({ extraBottomPadding = 0 }: FlashcardPlayerProps) {
  const colors = useColors();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [learnMode, setLearnMode] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);

  const cards = useMemo(() => {
    const base =
      selectedCategory === "all"
        ? getAllCards()
        : (FLASHCARD_SETS.find((s) => s.id === selectedCategory)?.cards ?? []);
    return isShuffled ? [...base].sort(() => Math.random() - 0.5) : base;
  }, [selectedCategory, isShuffled]);

  const currentCard = cards[currentIdx];
  const prevCard = currentIdx > 0 ? cards[currentIdx - 1] : null;
  const nextCard = currentIdx < cards.length - 1 ? cards[currentIdx + 1] : null;
  const nextNextCard = currentIdx < cards.length - 2 ? cards[currentIdx + 2] : null;

  const speakWord = useCallback((word: string) => {
    if (Platform.OS !== "web") {
      Speech.speak(word, { rate: 0.8, pitch: 1.1 });
    }
  }, []);

  const handleNext = useCallback(() => {
    if (currentIdx < cards.length - 1) {
      const next = currentIdx + 1;
      setCurrentIdx(next);
      if (learnMode) speakWord(cards[next].word);
    }
  }, [currentIdx, cards, learnMode, speakWord]);

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) {
      const prev = currentIdx - 1;
      setCurrentIdx(prev);
      if (learnMode) speakWord(cards[prev].word);
    }
  }, [currentIdx, cards, learnMode, speakWord]);

  const handleReplay = useCallback(() => {
    if (currentCard) speakWord(currentCard.word);
  }, [currentCard, speakWord]);

  const handleShuffle = useCallback(() => {
    setIsShuffled((s) => !s);
    setCurrentIdx(0);
  }, []);

  const handleCategoryChange = useCallback((cat: string) => {
    setSelectedCategory(cat);
    setCurrentIdx(0);
  }, []);

  const toggleLearnMode = useCallback(() => {
    setLearnMode((l) => {
      if (!l && currentCard) speakWord(currentCard.word);
      else if (Platform.OS !== "web") Speech.stop();
      return !l;
    });
  }, [currentCard, speakWord]);

  if (!currentCard) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>🃏</Text>
        <Text style={[styles.emptyText, { color: colors.navy }]}>No cards here yet!</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Category Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
        style={styles.categoryScroll}
      >
        {[{ id: "all", title: "All", emoji: "✨" }, ...FLASHCARD_SETS].map((set) => {
          const active = selectedCategory === set.id;
          return (
            <TouchableOpacity
              key={set.id}
              style={[
                styles.categoryPill,
                { borderColor: active ? colors.coral : colors.muted },
                active && { backgroundColor: colors.coral },
              ]}
              onPress={() => handleCategoryChange(set.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.categoryPillText, { color: active ? "#fff" : colors.navy }]}>
                {set.emoji} {set.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Page Counter */}
      <View style={styles.counterRow}>
        <Text style={[styles.counter, { color: colors.mutedForeground }]}>
          {currentIdx + 1} / {cards.length}
        </Text>
      </View>

      {/* Card Deck Area */}
      <View style={styles.deckArea}>
        <View style={styles.deckContainer}>
          {nextNextCard && (
            <View
              style={[styles.card, styles.cardBehind2, { backgroundColor: nextNextCard.color + "99" }]}
            />
          )}
          {nextCard && (
            <View
              style={[styles.card, styles.cardBehind1, { backgroundColor: nextCard.color + "CC" }]}
            />
          )}

          <TouchableOpacity
            style={[styles.card, { backgroundColor: currentCard.color }]}
            onPress={handleNext}
            activeOpacity={0.95}
          >
            <Text style={styles.cardEmoji}>{currentCard.emoji}</Text>
            <Text style={styles.cardWord}>{currentCard.word}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.replayBtn} onPress={handleReplay}>
            <View style={styles.replayBtnInner}>
              <Ionicons name="refresh" size={18} color="rgba(255,255,255,0.9)" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Controls */}
      <View style={[styles.controls, { paddingBottom: extraBottomPadding + 12 }]}>
        <TouchableOpacity
          style={styles.controlItem}
          onPress={handlePrev}
          disabled={currentIdx === 0}
          activeOpacity={0.7}
        >
          <View style={[styles.controlThumb, { opacity: currentIdx === 0 ? 0.28 : 1 }]}>
            {prevCard ? (
              <Text style={styles.prevEmoji}>{prevCard.emoji}</Text>
            ) : (
              <Ionicons name="chevron-back" size={20} color={colors.navy} />
            )}
          </View>
          <Text style={[styles.controlLabel, { color: colors.mutedForeground, opacity: currentIdx === 0 ? 0.4 : 1 }]}>
            Prev
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.learnBtn, { backgroundColor: learnMode ? colors.coral : colors.muted }]}
          onPress={toggleLearnMode}
          activeOpacity={0.8}
        >
          <Ionicons
            name={learnMode ? "volume-high" : "volume-medium-outline"}
            size={22}
            color={learnMode ? "#fff" : colors.navy}
          />
          <Text style={[styles.learnBtnText, { color: learnMode ? "#fff" : colors.navy }]}>
            Learn
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlItem} onPress={handleShuffle} activeOpacity={0.7}>
          <View
            style={[
              styles.controlThumb,
              isShuffled && { backgroundColor: colors.coral + "22" },
            ]}
          >
            <Ionicons name="shuffle" size={20} color={isShuffled ? colors.coral : colors.navy} />
          </View>
          <Text style={[styles.controlLabel, { color: isShuffled ? colors.coral : colors.mutedForeground }]}>
            Shuffle
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FDF8EF" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyEmoji: { fontSize: 64 },
  emptyText: { fontSize: 18, fontFamily: "Nunito_700Bold", marginTop: 16 },
  categoryScroll: { maxHeight: 54, flexShrink: 0 },
  categoryRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  categoryPillText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
  },
  counterRow: {
    alignItems: "center",
    paddingVertical: 4,
  },
  counter: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
  },
  deckArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  deckContainer: {
    width: CARD_WIDTH + 24,
    height: CARD_HEIGHT + 24,
    position: "relative",
  },
  card: {
    position: "absolute",
    top: 12,
    left: 12,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  cardBehind1: {
    transform: [{ rotate: "3deg" }, { translateX: 6 }, { translateY: 6 }],
  },
  cardBehind2: {
    transform: [{ rotate: "6deg" }, { translateX: 12 }, { translateY: 12 }],
  },
  cardEmoji: {
    fontSize: 86,
    marginBottom: 18,
  },
  cardWord: {
    fontSize: 36,
    fontFamily: "Nunito_800ExtraBold",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
  },
  replayBtn: {
    position: "absolute",
    top: 24,
    left: 24,
    zIndex: 10,
  },
  replayBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingTop: 8,
  },
  controlItem: {
    alignItems: "center",
    gap: 6,
    minWidth: 56,
  },
  controlThumb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  prevEmoji: {
    fontSize: 26,
  },
  controlLabel: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
  },
  learnBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 26,
    paddingVertical: 15,
    borderRadius: 30,
  },
  learnBtnText: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
  },
});
