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
import { useAuth } from "@/context/AuthContext";

const { width: W } = Dimensions.get("window");
const AGE_OPTIONS = [1, 2, 3, 4, 5];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useProfile();
  const { isLoggedIn } = useAuth();

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
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep((s) => s + 1);
      slideAnim.setValue(W);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
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
      <View
        style={[
          styles.progressRow,
          { paddingTop: topPadding + 12 },
        ]}
      >
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i <= step ? colors.coral : colors.muted,
                width: i === step ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      <Animated.View
        style={[styles.content, { transform: [{ translateX: slideAnim }] }]}
      >
        {step === 0 && (
          <View style={styles.step}>
            <Text style={[styles.emoji]}>👋</Text>
            <Text style={[styles.heading, { color: colors.navy }]}>
              Welcome!
            </Text>
            <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
              What&apos;s your child&apos;s name?
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
                size={18}
                color={canContinueStep0 ? "#fff" : colors.mutedForeground}
              />
            </TouchableOpacity>

            {!isLoggedIn && (
              <TouchableOpacity
                onPress={() => router.push("/login")}
                style={styles.signInLink}
              >
                <Text style={[styles.signInLinkText, { color: colors.mutedForeground }]}>
                  Already have an account?{" "}
                  <Text style={{ color: colors.coral, fontFamily: "Nunito_700Bold" }}>
                    Sign in
                  </Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {step === 1 && (
          <View style={styles.step}>
            <Text style={styles.emoji}>🎂</Text>
            <Text style={[styles.heading, { color: colors.navy }]}>
              How old is {name}?
            </Text>
            <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
              We&apos;ll pick the best stories for their age.
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
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.ageBtnText,
                      { color: age === a ? "#fff" : colors.navy },
                    ]}
                  >
                    {a}
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
                size={18}
                color={canContinueStep1 ? "#fff" : colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.step}>
            <Text style={styles.emoji}>✨</Text>
            <Text style={[styles.heading, { color: colors.navy }]}>
              What does {name} enjoy?
            </Text>
            <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
              Pick 3 or more — we&apos;ll build their library.
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
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={cat.icon as "moon-outline"}
                      size={28}
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
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              onPress={finish}
              disabled={!canContinueStep2}
              style={[
                styles.continueBtn,
                styles.doneBtn,
                {
                  backgroundColor: canContinueStep2 ? colors.green : colors.muted,
                  marginTop: 12,
                },
              ]}
            >
              <Text
                style={[
                  styles.continueBtnText,
                  { color: canContinueStep2 ? "#fff" : colors.mutedForeground },
                ]}
              >
                Let&apos;s go!
              </Text>
              <Ionicons
                name="headset-outline"
                size={20}
                color={canContinueStep2 ? "#fff" : colors.mutedForeground}
              />
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
    gap: 6,
    paddingBottom: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  step: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  emoji: {
    fontSize: 48,
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
    marginBottom: 32,
  },
  nameInput: {
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 22,
    fontFamily: "Nunito_700Bold",
    marginBottom: 24,
  },
  ageRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
    flexWrap: "wrap",
  },
  ageBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  ageBtnText: {
    fontSize: 26,
    fontFamily: "Nunito_800ExtraBold",
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  signInLink: {
    alignItems: "center",
    paddingVertical: 12,
  },
  signInLinkText: {
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
  },
  doneBtn: {},
  continueBtnText: {
    fontSize: 17,
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
    paddingBottom: 8,
  },
  prefTile: {
    width: "47%",
    flexGrow: 1,
    minWidth: 130,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 2,
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
});
