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
import { trackPurchaseEvent } from "@/lib/meta-events";

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onUnlock: () => void;
}

type Plan = "annual" | "monthly";

const FEATURES = [
  "Unlimited stories, any time",
  "All 10 story categories",
  "Bedtime, learning & adventure",
  "New stories every week",
];

export default function PaywallModal({ visible, onClose, onUnlock }: PaywallModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { apiFetch, refreshSubscription } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingMetaEvent, setPendingMetaEvent] = useState<{ eventId: string; plan: Plan } | null>(null);

  useEffect(() => {
    if (!visible) {
      setCheckoutUrl(null);
      setLoading(false);
      setSelectedPlan("annual");
      setPendingMetaEvent(null);
    }
  }, [visible]);

  const handleSubscribeTap = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/subscription/create", {
        method: "POST",
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await res.json() as {
        short_url?: string;
        razorpay_subscription_id?: string;
        meta_event_id?: string;
        error?: { message?: string } | string;
      };
      if (!res.ok || !data.short_url) {
        const msg = typeof data.error === "object" ? data.error?.message : data.error;
        Alert.alert("Payment unavailable", msg ?? "Could not start payment. Please try again.");
        setLoading(false);
        return;
      }
      // Capture event ID for client-side deduplication with the server CAPI event
      if (data.meta_event_id) {
        setPendingMetaEvent({ eventId: data.meta_event_id, plan: selectedPlan });
      }
      setCheckoutUrl(data.short_url);
    } catch {
      Alert.alert("Error", "Could not connect to payment service.");
    }
    setLoading(false);
  }, [apiFetch, selectedPlan]);

  const handleWebViewNav = useCallback(async (state: WebViewNavigation) => {
    const url = state.url;
    if (
      url.includes("razorpay.com/payment/success") ||
      url.includes("razorpay.com/payment/done") ||
      url.startsWith("storylamp://payment-success") ||
      url.startsWith("storytime://payment-success")
    ) {
      setCheckoutUrl(null);
      // Fire client-side Meta SDK Purchase event with the same event ID the
      // server will use in CAPI (from Razorpay notes), enabling deduplication.
      if (pendingMetaEvent) {
        const amountINR = pendingMetaEvent.plan === "annual" ? 999 : 149;
        trackPurchaseEvent({ eventId: pendingMetaEvent.eventId, amountINR, plan: pendingMetaEvent.plan });
        setPendingMetaEvent(null);
      }
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
  }, [pendingMetaEvent, refreshSubscription, onUnlock]);

  const handleClose = useCallback(() => {
    setCheckoutUrl(null);
    onClose();
  }, [onClose]);

  const selectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    Haptics.selectionAsync();
  };

  const annualMonthly = Math.round(999 / 12);
  const annualSaving = Math.round((1 - 999 / (149 * 12)) * 100);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        {checkoutUrl ? (
          <View style={[styles.webviewSheet, { paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
            <View style={styles.webviewHeader}>
              <TouchableOpacity onPress={() => setCheckoutUrl(null)} hitSlop={8}>
                <Ionicons name="arrow-back" size={24} color={colors.navy} />
              </TouchableOpacity>
              <Text style={[styles.webviewTitle, { color: colors.navy }]}>
                Pay ₹1 to start trial
              </Text>
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
          <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <View style={[styles.iconCircle, { backgroundColor: colors.coral + "22" }]}>
              <Ionicons name="star" size={36} color={colors.coral} />
            </View>

            <Text style={[styles.title, { color: colors.navy }]}>StoryLamp Premium</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
  You&apos;ve enjoyed your 3 free stories!{"\n"}Unlock unlimited for your little one.
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

            {/* Plan Picker */}
            <View style={styles.planRow}>
              {/* Annual — hero */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  {
                    borderColor: selectedPlan === "annual" ? colors.coral : colors.border,
                    backgroundColor: selectedPlan === "annual" ? colors.coral + "0D" : colors.card,
                    flex: 1.15,
                  },
                ]}
                onPress={() => selectPlan("annual")}
                activeOpacity={0.85}
              >
                <View style={[styles.bestBadge, { backgroundColor: colors.coral, opacity: selectedPlan === "annual" ? 1 : 0 }]}>
                  <Text style={styles.bestBadgeText}>BEST VALUE</Text>
                </View>
                <Text style={[styles.planPrice, { color: selectedPlan === "annual" ? colors.coral : colors.navy }]}>
                  ₹999
                </Text>
                <Text style={[styles.planPeriod, { color: colors.mutedForeground }]}>/ year</Text>
                <Text style={[styles.planNote, { color: colors.coral }]}>
                  ₹{annualMonthly}/mo · Save {annualSaving}%
                </Text>
                {selectedPlan === "annual" && (
                  <View style={[styles.selectedDot, { backgroundColor: colors.coral }]}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Monthly */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  {
                    borderColor: selectedPlan === "monthly" ? colors.coral : colors.border,
                    backgroundColor: selectedPlan === "monthly" ? colors.coral + "0D" : colors.card,
                    flex: 1,
                  },
                ]}
                onPress={() => selectPlan("monthly")}
                activeOpacity={0.85}
              >
                <View style={[styles.bestBadge, { backgroundColor: colors.coral, opacity: 0 }]}>
                  <Text style={styles.bestBadgeText}>MONTHLY</Text>
                </View>
                <Text style={[styles.planPrice, { color: selectedPlan === "monthly" ? colors.coral : colors.navy }]}>
                  ₹149
                </Text>
                <Text style={[styles.planPeriod, { color: colors.mutedForeground }]}>/ month</Text>
                <Text style={[styles.planNote, { color: colors.mutedForeground }]}>
                  Cancel anytime
                </Text>
                {selectedPlan === "monthly" && (
                  <View style={[styles.selectedDot, { backgroundColor: colors.coral }]}>
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
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
                  <Text style={styles.primaryBtnText}>
                    Start for ₹1 · then{" "}
                    {selectedPlan === "annual" ? "₹999/year" : "₹149/month"}
                  </Text>
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
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 20, alignItems: "center" },
  handle: { width: 40, height: 4, borderRadius: 2, marginBottom: 16 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  title: { fontSize: 22, fontFamily: "Nunito_800ExtraBold", marginBottom: 6, textAlign: "center" },
  subtitle: { fontSize: 13, fontFamily: "Nunito_400Regular", textAlign: "center", lineHeight: 20, marginBottom: 16 },
  featuresBox: { width: "100%", borderRadius: 14, padding: 12, gap: 8, marginBottom: 14 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  check: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  featureText: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  planRow: { flexDirection: "row", width: "100%", gap: 10, marginBottom: 12 },
  planCard: {
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    position: "relative",
    minHeight: 110,
    justifyContent: "center",
  },
  bestBadge: {
    position: "absolute",
    top: -10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  bestBadgeText: { color: "#fff", fontSize: 9, fontFamily: "Nunito_800ExtraBold", letterSpacing: 0.5 },
  planPrice: { fontSize: 26, fontFamily: "Nunito_800ExtraBold", marginTop: 4 },
  planPeriod: { fontSize: 12, fontFamily: "Nunito_400Regular", marginTop: 1 },
  planNote: { fontSize: 11, fontFamily: "Nunito_600SemiBold", marginTop: 4, textAlign: "center" },
  selectedDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  upiRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, borderWidth: 1, paddingVertical: 9, marginBottom: 12 },
  upiEmoji: { fontSize: 16 },
  upiText: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  primaryBtn: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 16, marginBottom: 10 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontFamily: "Nunito_800ExtraBold" },
  laterBtn: { paddingVertical: 8 },
  laterText: { fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  webviewSheet: { flex: 1, marginTop: 60, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
  webviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(0,0,0,0.1)" },
  webviewTitle: { fontSize: 16, fontFamily: "Nunito_700Bold" },
  webview: { flex: 1 },
  webviewLoading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
});
