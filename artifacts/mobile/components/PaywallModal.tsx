import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onUnlock: () => void;
}

const FEATURES = [
  "Unlimited stories, any time",
  "All 10 story categories",
  "Bedtime, learning & adventure",
  "New stories every week",
];

function getApiUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : "";
}

export default function PaywallModal({ visible, onClose, onUnlock }: PaywallModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, apiFetch, refreshSubscription } = useAuth();

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCheckoutUrl(null);
      setLoading(false);
    }
  }, [visible]);

  const handleSubscribeTap = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/subscription/create", {
        method: "POST",
        body: JSON.stringify({ plan: "annual" }),
      });
      const data = await res.json() as {
        short_url?: string;
        razorpay_subscription_id?: string;
        error?: { message?: string } | string;
      };
      if (!res.ok || !data.short_url) {
        const msg = typeof data.error === "object" ? data.error?.message : data.error;
        Alert.alert("Payment unavailable", msg ?? "Could not start payment. Please try again.");
        setLoading(false);
        return;
      }
      setCheckoutUrl(data.short_url);
    } catch {
      Alert.alert("Error", "Could not connect to payment service.");
    }
    setLoading(false);
  }, [apiFetch]);

  const handleWebViewNav = useCallback(async (state: WebViewNavigation) => {
    const url = state.url;
    if (
      url.includes("razorpay.com/payment/success") ||
      url.includes("razorpay.com/payment/done") ||
      url.startsWith("storylamp://payment-success") ||
      url.startsWith("storytime://payment-success")
    ) {
      setCheckoutUrl(null);
      await refreshSubscription();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUnlock();
    } else if (
      url.includes("razorpay.com/payment/cancel") ||
      url.startsWith("storylamp://payment-cancelled") ||
      url.startsWith("storytime://payment-cancelled")
    ) {
      setCheckoutUrl(null);
    }
  }, [refreshSubscription, onUnlock]);

  const handleClose = useCallback(() => {
    setCheckoutUrl(null);
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        {checkoutUrl ? (
          <View style={[styles.webviewSheet, { paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
            <View style={styles.webviewHeader}>
              <TouchableOpacity onPress={() => setCheckoutUrl(null)} hitSlop={8}>
                <Ionicons name="arrow-back" size={24} color={colors.navy} />
              </TouchableOpacity>
              <Text style={[styles.webviewTitle, { color: colors.navy }]}>Pay ₹199 via UPI</Text>
              <View style={{ width: 24 }} />
            </View>
            <WebView
              source={{ uri: checkoutUrl }}
              onNavigationStateChange={handleWebViewNav}
              style={styles.webview}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webviewLoading}>
                  <ActivityIndicator color={colors.coral} size="large" />
                </View>
              )}
            />
          </View>
        ) : (
          <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 24 }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <View style={[styles.iconCircle, { backgroundColor: colors.coral + "22" }]}>
              <Ionicons name="star" size={38} color={colors.coral} />
            </View>

            <Text style={[styles.title, { color: colors.navy }]}>StoryLamp Premium</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              You&apos;ve enjoyed your 5 free stories!{"\n"}Unlock unlimited for your little one.
            </Text>

            <View style={[styles.featuresBox, { backgroundColor: colors.muted }]}>
              {FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <View style={[styles.check, { backgroundColor: colors.green }]}>
                    <Ionicons name="checkmark" size={11} color="#fff" />
                  </View>
                  <Text style={[styles.featureText, { color: colors.navy }]}>{f}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.priceBox, { backgroundColor: colors.coral + "11", borderColor: colors.coral }]}>
              <Text style={[styles.priceBig, { color: colors.coral }]}>₹199</Text>
              <Text style={[styles.priceSub, { color: colors.mutedForeground }]}>per month · cancel anytime</Text>
            </View>

            <View style={[styles.upiRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={styles.upiEmoji}>🟦</Text>
              <Text style={[styles.upiText, { color: colors.navy }]}>Google Pay · PhonePe · Paytm · UPI</Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.coral, opacity: loading ? 0.7 : 1 }]}
              onPress={handleSubscribeTap}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Subscribe for ₹199/month</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleClose} hitSlop={8} style={styles.laterBtn}>
              <Text style={[styles.laterText, { color: colors.mutedForeground }]}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 24, alignItems: "center" },
  handle: { width: 40, height: 4, borderRadius: 2, marginBottom: 20 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontSize: 24, fontFamily: "Nunito_800ExtraBold", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Nunito_400Regular", textAlign: "center", lineHeight: 21, marginBottom: 20 },
  featuresBox: { width: "100%", borderRadius: 16, padding: 14, gap: 10, marginBottom: 16 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  check: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureText: { fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  priceBox: { width: "100%", borderRadius: 16, borderWidth: 2, paddingVertical: 14, alignItems: "center", marginBottom: 14 },
  priceBig: { fontSize: 34, fontFamily: "Nunito_800ExtraBold" },
  priceSub: { fontSize: 13, fontFamily: "Nunito_400Regular", marginTop: 2 },
  upiRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingVertical: 10, marginBottom: 16 },
  upiEmoji: { fontSize: 18 },
  upiText: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  primaryBtn: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16, marginBottom: 12 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Nunito_800ExtraBold" },
  laterBtn: { paddingVertical: 8 },
  laterText: { fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  webviewSheet: { flex: 1, marginTop: 60, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
  webviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(0,0,0,0.1)" },
  webviewTitle: { fontSize: 16, fontFamily: "Nunito_700Bold" },
  webview: { flex: 1 },
  webviewLoading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
});
