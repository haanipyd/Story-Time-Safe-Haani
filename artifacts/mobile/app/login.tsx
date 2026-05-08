import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.inner, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.navy} />
        </TouchableOpacity>

        <View style={[styles.iconCircle, { backgroundColor: colors.coral + "22" }]}>
          <Ionicons name="headset" size={36} color={colors.coral} />
        </View>

        <Text style={[styles.title, { color: colors.navy }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Sign in to access your subscription
        </Text>

        <View style={styles.form}>
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
            style={[styles.btn, { backgroundColor: colors.coral, opacity: loading ? 0.7 : 1 }]}
            onPress={handleLogin}
            disabled={loading || !email.trim() || !password}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace("/register")} style={styles.switchBtn}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
              Don&apos;t have an account?{" "}
              <Text style={{ color: colors.coral, fontFamily: "Nunito_700Bold" }}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24 },
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
    fontSize: 28,
    fontFamily: "Nunito_800ExtraBold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    marginBottom: 32,
  },
  form: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Nunito_700Bold", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    marginBottom: 12,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 12,
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
    marginBottom: 8,
    textAlign: "center",
  },
  btn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Nunito_800ExtraBold" },
  switchBtn: { alignItems: "center", paddingTop: 16 },
  switchText: { fontSize: 14, fontFamily: "Nunito_400Regular", textAlign: "center" },
});
