import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function RegisterScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) return;
    setLoading(true);
    setError("");
    const result = await register(name.trim(), email.trim(), password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    }
  };

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && password.length >= 6;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.inner, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.navy} />
        </TouchableOpacity>

        <View style={[styles.iconCircle, { backgroundColor: colors.coral + "22" }]}>
          <Ionicons name="star" size={36} color={colors.coral} />
        </View>

        <Text style={[styles.title, { color: colors.navy }]}>Create your account</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Your parent account keeps your{"\n"}subscription across devices
        </Text>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.navy }]}>Your name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="E.g. Sarah"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { borderColor: colors.border, color: colors.navy, backgroundColor: colors.card }]}
          />

          <Text style={[styles.label, { color: colors.navy }]}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="parent@example.com"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { borderColor: colors.border, color: colors.navy, backgroundColor: colors.card }]}
          />

          <Text style={[styles.label, { color: colors.navy }]}>Password</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>At least 6 characters</Text>
          <View style={[styles.passwordRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPass}
              style={[styles.passwordInput, { color: colors.navy }]}
            />
            <TouchableOpacity onPress={() => setShowPass((v) => !v)} hitSlop={8}>
              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {!!error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.coral, opacity: !canSubmit || loading ? 0.6 : 1 }]}
            onPress={handleRegister}
            disabled={loading || !canSubmit}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace("/login")} style={styles.switchBtn}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
              Already have an account?{" "}
              <Text style={{ color: colors.coral, fontFamily: "Nunito_700Bold" }}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { paddingHorizontal: 24 },
  backBtn: { marginBottom: 24 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontFamily: "Nunito_800ExtraBold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  form: { gap: 4 },
  label: { fontSize: 14, fontFamily: "Nunito_700Bold", marginBottom: 4, marginTop: 8 },
  hint: { fontSize: 12, fontFamily: "Nunito_400Regular", marginBottom: 6, marginTop: -2 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
  },
  errorText: {
    color: "#E55",
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    marginTop: 8,
    textAlign: "center",
  },
  btn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 20,
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Nunito_800ExtraBold" },
  switchBtn: { alignItems: "center", paddingTop: 16 },
  switchText: { fontSize: 14, fontFamily: "Nunito_400Regular", textAlign: "center" },
});
