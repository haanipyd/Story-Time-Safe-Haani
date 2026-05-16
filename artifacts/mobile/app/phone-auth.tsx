import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+1", flag: "🇺🇸", name: "USA" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
];

const OTP_LENGTH = 6;

export default function PhoneAuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sendOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const otpInputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fullPhone = `${countryCode.code}${phone.replace(/\s/g, "")}`;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startResendTimer = () => {
    setResendTimer(30);
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (phone.replace(/\s/g, "").length < 7) {
      setError("Please enter a valid phone number");
      return;
    }
    setLoading(true);
    setError("");
    const result = await sendOtp(fullPhone);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (result.requestId) setRequestId(result.requestId);
    // When server returns OTP directly (no SMS configured), auto-verify silently
    if (result.devOtp && result.requestId) {
      const verifyResult = await verifyOtp(fullPhone, result.devOtp, result.requestId);
      setLoading(false);
      if (verifyResult.error) {
        setError(verifyResult.error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep("otp");
    startResendTimer();
    setTimeout(() => otpInputRef.current?.focus(), 300);
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== OTP_LENGTH || !requestId) return;
    setLoading(true);
    setError("");
    const result = await verifyOtp(fullPhone, otp, requestId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setOtp("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setOtp("");
    setError("");
    setDevOtp(null);
    setRequestId(null);
    setLoading(true);
    const result = await sendOtp(fullPhone);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.devOtp) setDevOtp(result.devOtp);
    if (result.requestId) setRequestId(result.requestId);
    startResendTimer();
  };

  const handleOtpChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setOtp(digits);
    setError("");
    if (digits.length === OTP_LENGTH) {
      setTimeout(() => handleVerifyOtp(), 100);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.inner, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}>
        <View style={[styles.logoCircle, { backgroundColor: colors.coral + "22" }]}>
          <Text style={styles.logoEmoji}>📖</Text>
        </View>

        <Text style={[styles.appName, { color: colors.navy }]}>Storytime</Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
          Stories that spark little imaginations
        </Text>

        <View style={styles.card}>
          {step === "phone" ? (
            <>
              <Text style={[styles.stepTitle, { color: colors.navy }]}>Enter your mobile number</Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
                We&apos;ll send a one-time code to verify you
              </Text>

              <View style={styles.phoneRow}>
                <TouchableOpacity
                  style={[styles.countryBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                  onPress={() => setShowCountryPicker((v) => !v)}
                >
                  <Text style={styles.flag}>{countryCode.flag}</Text>
                  <Text style={[styles.countryCode, { color: colors.navy }]}>{countryCode.code}</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>

                <TextInput
                  value={phone}
                  onChangeText={(t) => { setPhone(t); setError(""); }}
                  placeholder="98765 43210"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="phone-pad"
                  style={[styles.phoneInput, { borderColor: colors.border, color: colors.navy, backgroundColor: colors.card }]}
                  returnKeyType="done"
                  onSubmitEditing={handleSendOtp}
                  autoFocus
                />
              </View>

              {showCountryPicker && (
                <View style={[styles.countryList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {COUNTRY_CODES.map((c) => (
                    <TouchableOpacity
                      key={c.code}
                      onPress={() => { setCountryCode(c); setShowCountryPicker(false); }}
                      style={[styles.countryRow, { borderBottomColor: colors.border }]}
                    >
                      <Text style={styles.flag}>{c.flag}</Text>
                      <Text style={[styles.countryName, { color: colors.navy }]}>{c.name}</Text>
                      <Text style={[styles.countryCode, { color: colors.mutedForeground }]}>{c.code}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.coral, opacity: loading ? 0.7 : 1 }]}
                onPress={handleSendOtp}
                disabled={loading || phone.replace(/\s/g, "").length < 7}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Send OTP</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => { setStep("phone"); setOtp(""); setError(""); setDevOtp(null); }}
                style={styles.backRow}
              >
                <Ionicons name="arrow-back" size={18} color={colors.mutedForeground} />
                <Text style={[styles.backText, { color: colors.mutedForeground }]}>Change number</Text>
              </TouchableOpacity>

              <Text style={[styles.stepTitle, { color: colors.navy }]}>Enter verification code</Text>
              <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
                Sent to {countryCode.code} {phone}
              </Text>

              {devOtp && (
                <View style={[styles.devBanner, { backgroundColor: colors.yellow + "44", borderColor: colors.yellow }]}>
                  <Ionicons name="information-circle" size={16} color={colors.navy} />
                  <Text style={[styles.devText, { color: colors.navy }]}>
                    Dev mode — OTP: <Text style={{ fontFamily: "Nunito_800ExtraBold" }}>{devOtp}</Text>
                  </Text>
                </View>
              )}

              <TextInput
                ref={otpInputRef}
                value={otp}
                onChangeText={handleOtpChange}
                placeholder="· · · · · ·"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                style={[styles.otpInput, { borderColor: otp.length > 0 ? colors.coral : colors.border, color: colors.navy, backgroundColor: colors.card }]}
                textAlign="center"
                autoFocus
              />

              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.coral, opacity: loading || otp.length < OTP_LENGTH ? 0.6 : 1 }]}
                onPress={handleVerifyOtp}
                disabled={loading || otp.length < OTP_LENGTH}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleResend}
                disabled={resendTimer > 0}
                style={styles.resendBtn}
              >
                <Text style={[styles.resendText, { color: resendTimer > 0 ? colors.mutedForeground : colors.coral }]}>
                  {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          By continuing you agree to our Terms of Service
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 24, alignItems: "center", justifyContent: "center" },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoEmoji: { fontSize: 44 },
  appName: { fontSize: 32, fontFamily: "Nunito_800ExtraBold", marginBottom: 6 },
  tagline: { fontSize: 14, fontFamily: "Nunito_400Regular", textAlign: "center", marginBottom: 36 },
  card: { width: "100%", gap: 12 },
  stepTitle: { fontSize: 20, fontFamily: "Nunito_800ExtraBold", textAlign: "center" },
  stepSub: { fontSize: 14, fontFamily: "Nunito_400Regular", textAlign: "center", lineHeight: 20 },
  phoneRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  countryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  flag: { fontSize: 20 },
  countryCode: { fontSize: 15, fontFamily: "Nunito_700Bold" },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 18,
    fontFamily: "Nunito_600SemiBold",
    letterSpacing: 1,
  },
  countryList: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  countryName: { flex: 1, fontSize: 15, fontFamily: "Nunito_600SemiBold" },
  devBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  devText: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  otpInput: {
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 18,
    fontSize: 32,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: 8,
    textAlign: "center",
  },
  errorText: {
    color: "#E55",
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
    textAlign: "center",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontSize: 17, fontFamily: "Nunito_800ExtraBold" },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  backText: { fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  resendBtn: { alignItems: "center", paddingVertical: 8 },
  resendText: { fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  disclaimer: { fontSize: 11, fontFamily: "Nunito_400Regular", textAlign: "center", marginTop: 24 },
});
