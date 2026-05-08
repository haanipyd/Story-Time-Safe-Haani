import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState, useRef } from "react";
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
import Constants from "expo-constants";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onUnlock: () => void;
}

type Plan = "monthly" | "yearly";

const PLAN_INFO = {
  monthly: { label: "Monthly", price: "₹399 / month", saving: null },
  yearly: { label: "Yearly", price: "₹2,999 / year", saving: "Save 37%" },
};

const FEATURES = [
  "Unlimited stories, any time",
  "All 10 story categories",
  "Bedtime, learning & adventure",
  "New stories added every week",
];

function getApiUrl(): string {
  return (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "";
}

export default function PaywallModal({ visible, onClose, onUnlock }: PaywallModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoggedIn, token, unlockWithRazorpay } = useAuth();

  const [plan, setPlan] = useState<Plan>("monthly");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const base = getApiUrl();
      const res = await fetch(`${base}/api/subscriptions/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json() as { orderId?: string; amount?: number; currency?: string; keyId?: string; error?: string };
      if (!res.ok || !data.orderId) {
        Alert.alert("Payment unavailable", data.error ?? "Could not start payment. Please try again.");
        setLoading(false);
        return;
      }
      const url = `${base}/api/subscriptions/checkout?orderId=${encodeURIComponent(data.orderId)}&amount=${encodeURIComponent(String(data.amount))}&currency=${encodeURIComponent(data.currency ?? "INR")}&keyId=${encodeURIComponent(data.keyId ?? "")}&plan=${encodeURIComponent(plan)}&token=${encodeURIComponent(token ?? "")}`;
      setCheckoutUrl(url);
    } catch {
      Alert.alert("Error", "Could not connect to payment service.");
    }
    setLoading(false);
  };

  const handleWebViewNav = async (state: WebViewNavigation) => {
    const url = state.url;
    if (url.startsWith("storytime://payment-success")) {
      setCheckoutUrl(null);
      const params = new URLSearchParams(url.split("?")[1] ?? "");
      const paymentId = params.get("paymentId") ?? "";
      const orderId = params.get("orderId") ?? "";
      const signature = params.get("signature") ?? "";
      const result = await unlockWithRazorpay(paymentId, orderId, signature);
      if (result.error) {
        Alert.alert("Verification failed", result.error);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onUnlock();
      }
    } else if (url.startsWith("storytime://payment-cancelled")) {
      setCheckoutUrl(null);
    }
  };

  const handleClose = () => {
    setCheckoutUrl(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        {checkoutUrl ? (
          <View style={[styles.webviewSheet, { paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
            <View style={styles.webviewHeader}>
              <TouchableOpacity onPress={() => setCheckoutUrl(null)} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.navy} />
              </TouchableOpacity>
              <Text style={[styles.webviewTitle, { color: colors.navy }]}>Secure Payment</Text>
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

            <Text style={[styles.title, { color: colors.navy }]}>Storytime Premium</Text>
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

            <View style={styles.planRow}>
              {(["monthly", "yearly"] as Plan[]).map((p) => {
                const info = PLAN_INFO[p];
                const selected = plan === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => { setPlan(p); Haptics.selectionAsync(); }}
                    style={[
                      styles.planBtn,
                      {
                        borderColor: selected ? colors.coral : colors.border,
                        backgroundColor: selected ? colors.coral + "11" : colors.card,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    {info.saving && (
                      <View style={[styles.savingBadge, { backgroundColor: colors.green }]}>
                        <Text style={styles.savingText}>{info.saving}</Text>
                      </View>
                    )}
                    <Text style={[styles.planLabel, { color: selected ? colors.coral : colors.navy }]}>
                      {info.label}
                    </Text>
                    <Text style={[styles.planPrice, { color: selected ? colors.coral : colors.mutedForeground }]}>
                      {info.price}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.unlockBtn, { backgroundColor: colors.coral, opacity: loading ? 0.7 : 1 }]}
              onPress={handleSubscribe}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.unlockBtnText}>
                  {isLoggedIn ? `Subscribe — ${PLAN_INFO[plan].price}` : "Sign in to Subscribe"}
                </Text>
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
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  handle: { width: 40, height: 4, borderRadius: 2, marginBottom: 24 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 26, fontFamily: "Nunito_800ExtraBold", marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 15, fontFamily: "Nunito_400Regular", textAlign: "center", lineHeight: 22, marginBottom: 20 },
  featuresBox: { width: "100%", borderRadius: 16, padding: 16, gap: 12, marginBottom: 20 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  check: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureText: { fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  planRow: { flexDirection: "row", gap: 10, width: "100%", marginBottom: 20 },
  planBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    position: "relative",
    gap: 4,
  },
  savingBadge: {
    position: "absolute",
    top: -10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  savingText: { color: "#fff", fontSize: 11, fontFamily: "Nunito_700Bold" },
  planLabel: { fontSize: 15, fontFamily: "Nunito_800ExtraBold" },
  planPrice: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  unlockBtn: { width: "100%", paddingVertical: 16, borderRadius: 16, alignItems: "center", marginBottom: 12 },
  unlockBtnText: { color: "#fff", fontSize: 16, fontFamily: "Nunito_800ExtraBold" },
  laterBtn: { paddingVertical: 8 },
  laterText: { fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  webviewSheet: {
    flex: 1,
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  webviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  webviewTitle: { fontSize: 16, fontFamily: "Nunito_700Bold" },
  webview: { flex: 1 },
  webviewLoading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
});
