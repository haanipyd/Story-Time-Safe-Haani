import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CATEGORIES } from "@/data/preferences";
import { useProfile } from "@/context/ProfileContext";
import { useColors } from "@/hooks/useColors";

const { width: W } = Dimensions.get("window");
const AGE_OPTIONS = [1, 2, 3, 4, 5];

const AGE_LABELS: Record<number, string> = {
  1: "👶",
  2: "🐣",
  3: "🌱",
  4: "🐥",
  5: "🌟",
};

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useProfile();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [prefs, setPrefs] = useState<string[]>([]);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const nextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: -W,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep((s) => s + 1);
      slideAnim.setValue(W);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  };

  const togglePref = (id: string) => {
    Haptics.selectionAsync();
    setPrefs((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const finish = () => {
    if (!name.trim() || age === null || prefs.length < 3) return;
    completeOnboarding({ name: name.trim(), age, preferences: prefs });
    router.replace("/(tabs)/home");
  };

  const canContinueStep0 = name.trim().length > 0;
  const canContinueStep1 = age !== null;
  const canContinueStep2 = prefs.length >= 3;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.cream }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.progressRow, { paddingTop: topPadding + 16 }]}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              {
                backgroundColor: i < step ? colors.green : i === step ? colors.coral : colors.muted,
                width: i === step ? 32 : 10,
                opacity: i > step ? 0.5 : 1,
              },
            ]}
          />
        ))}
      </View>

      <Animated.View
        style={[styles.content, { transform: [{ translateX: slideAnim }] }]}
      >
        {step === 0 && (
          <View style={[styles.step, { paddingBottom: bottomPadding + 24 }]}>
            <Text style={styles.topEmoji}>👋</Text>
            <Text style={[styles.heading, { color: colors.navy }]}>
              Welcome to StoryLamp!
            </Text>
            <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
              What&apos;s your little one&apos;s name?
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Mia, Arjun, Leo…"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.nameInput,
                {
                  color: colors.navy,
                  borderColor: name ? colors.coral : colors.border,
                  backgroundColor: colors.card,
                },
              ]}
              autoFocus
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => canContinueStep0 && nextStep()}
            />
            <TouchableOpacity
              onPress={nextStep}
              disabled={!canContinueStep0}
              style={[
                styles.continueBtn,
                { backgroundColor: canContinueStep0 ? colors.coral : colors.muted },
              ]}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.continueBtnText,
                  { color: canContinueStep0 ? "#fff" : colors.mutedForeground },
                ]}
              >
                Continue
              </Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={canContinueStep0 ? "#fff" : colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>
        )}

        {step === 1 && (
          <View style={[styles.step, { paddingBottom: bottomPadding + 24 }]}>
            <Text style={styles.topEmoji}>🎂</Text>
            <Text style={[styles.heading, { color: colors.navy }]}>
              How old is {name}?
            </Text>
            <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
              We&apos;ll find the perfect stories for their age.
            </Text>
            <View style={styles.ageRow}>
              {AGE_OPTIONS.map((a) => (
                <TouchableOpacity
                  key={a}
                  onPress={() => {
                    setAge(a);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.ageBtn,
                    {
                      backgroundColor: age === a ? colors.coral : colors.card,
                      borderColor: age === a ? colors.coral : colors.border,
                      transform: [{ scale: age === a ? 1.08 : 1 }],
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.ageBtnEmoji}>{AGE_LABELS[a]}</Text>
                  <Text
                    style={[
                      styles.ageBtnNumber,
                      { color: age === a ? "#fff" : colors.navy },
                    ]}
                  >
                    {a}
                  </Text>
                  <Text
                    style={[
                      styles.ageBtnLabel,
                      { color: age === a ? "rgba(255,255,255,0.85)" : colors.mutedForeground },
                    ]}
                  >
                    yr
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={nextStep}
              disabled={!canContinueStep1}
              style={[
                styles.continueBtn,
                { backgroundColor: canContinueStep1 ? colors.coral : colors.muted },
              ]}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.continueBtnText,
                  { color: canContinueStep1 ? "#fff" : colors.mutedForeground },
                ]}
              >
                Continue
              </Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={canContinueStep1 ? "#fff" : colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={[styles.step, { paddingBottom: bottomPadding + 16 }]}>
            <Text style={styles.topEmoji}>✨</Text>
            <Text style={[styles.heading, { color: colors.navy }]}>
              What does {name} love?
            </Text>
            <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
              Pick 3 or more — we&apos;ll build their perfect library!
            </Text>
            <ScrollView
              style={styles.prefScroll}
              contentContainerStyle={styles.prefGrid}
              showsVerticalScrollIndicator={false}
            >
              {CATEGORIES.map((cat) => {
                const sel = prefs.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => togglePref(cat.id)}
                    style={[
                      styles.prefTile,
                      {
                        backgroundColor: sel ? cat.color : colors.card,
                        borderColor: sel ? cat.color : colors.border,
                        transform: [{ scale: sel ? 1.04 : 1 }],
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={cat.icon as "moon-outline"}
                      size={30}
                      color={sel ? "#fff" : cat.color}
                    />
                    <Text
                      style={[
                        styles.prefLabel,
                        { color: sel ? "#fff" : colors.navy },
                      ]}
                      numberOfLines={2}
                    >
                      {cat.label}
                    </Text>
                    {sel && (
                      <View style={styles.checkmark}>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.pickedBadgeRow}>
              <Text style={[styles.pickedBadgeText, { color: prefs.length >= 3 ? colors.green : colors.mutedForeground }]}>
                {prefs.length >= 3
                  ? `${prefs.length} topics selected ✓`
                  : `Pick ${3 - prefs.length} more`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={finish}
              disabled={!canContinueStep2}
              style={[
                styles.continueBtn,
                {
                  backgroundColor: canContinueStep2 ? colors.green : colors.muted,
                  marginTop: 8,
                },
              ]}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.continueBtnText,
                  { color: canContinueStep2 ? "#fff" : colors.mutedForeground },
                ]}
              >
                Let&apos;s go! 🎉
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingBottom: 8,
  },
  progressDot: {
    height: 10,
    borderRadius: 5,
  },
  content: {
    flex: 1,
  },
  step: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  topEmoji: {
    fontSize: 54,
    marginBottom: 16,
  },
  heading: {
    fontSize: 30,
    fontFamily: "Nunito_800ExtraBold",
    marginBottom: 8,
    lineHeight: 38,
  },
  subheading: {
    fontSize: 16,
    fontFamily: "Nunito_400Regular",
    lineHeight: 24,
    marginBottom: 28,
  },
  nameInput: {
    borderWidth: 2.5,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 22,
    fontFamily: "Nunito_700Bold",
    marginBottom: 24,
  },
  ageRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 32,
    flexWrap: "wrap",
  },
  ageBtn: {
    width: 62,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    gap: 2,
  },
  ageBtnEmoji: {
    fontSize: 22,
  },
  ageBtnNumber: {
    fontSize: 22,
    fontFamily: "Nunito_800ExtraBold",
    lineHeight: 26,
  },
  ageBtnLabel: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    borderRadius: 20,
    marginBottom: 12,
  },
  continueBtnText: {
    fontSize: 18,
    fontFamily: "Nunito_700Bold",
  },
  prefScroll: {
    flex: 1,
    marginBottom: 4,
  },
  prefGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 4,
  },
  prefTile: {
    width: "47%",
    flexGrow: 1,
    minWidth: 130,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 2.5,
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  prefLabel: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  pickedBadgeRow: {
    alignItems: "center",
    paddingVertical: 8,
  },
  pickedBadgeText: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
  },
});
