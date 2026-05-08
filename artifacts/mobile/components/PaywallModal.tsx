import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  Linking,
  Modal,
  Platform,
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
type Step = "plan" | "upi-sheet" | "polling" | "card-webview";

const PLAN_INFO = {
  monthly: { label: "Monthly", price: "₹399/mo", saving: null },
  yearly: { label: "Yearly", price: "₹2,999/yr", saving: "Save 37%" },
};

const FEATURES = [
  "Unlimited stories, any time",
  "All 10 story categories",
  "Bedtime, learning & adventure",
  "New stories every week",
];

const UPI_APPS = [
  { id: "gpay", name: "Google Pay", scheme: "tez://upi/pay", prefix: "tez://upi/pay?", emoji: "🟦", color: "#4285F4" },
  { id: "phonepe", name: "PhonePe", scheme: "phonepe://pay", prefix: "phonepe://pay?", emoji: "🟣", color: "#5F259F" },
  { id: "paytm", name: "Paytm", scheme: "paytmmp://pay", prefix: "paytmmp://pay?", emoji: "🔵", color: "#00BAF2" },
  { id: "bhim", name: "BHIM UPI", scheme: "upi://pay", prefix: "upi://pay?", emoji: "🇮🇳", color: "#138808" },
  { id: "other", name: "Any UPI App", scheme: "upi://pay", prefix: "upi://pay?", emoji: "💳", color: "#888" },
] as const;

type UpiApp = typeof UPI_APPS[number];

function getApiUrl(): string {
  return (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "";
}

export default function PaywallModal({ visible, onClose, onUnlock }: PaywallModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, unlockWithRazorpay, confirmUpiPayment } = useAuth();

  const [plan, setPlan] = useState<Plan>("monthly");
  const [step, setStep] = useState<Step>("plan");
  const [loading, setLoading] = useState(false);
  const [availableApps, setAvailableApps] = useState<UpiApp[]>([]);
  const [appsChecked, setAppsChecked] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<"waiting" | "success" | "failed">("waiting");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const orderId = useRef<string>("");
  const paymentId = useRef<string>("");
  const currentPlan = useRef<Plan>("monthly");
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);
  const MAX_POLLS = 150;

  const stopPolling = useCallback(() => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
    pollCount.current = 0;
  }, []);

  useEffect(() => {
    if (!visible) {
      stopPolling();
      setStep("plan");
      setLoading(false);
      setCheckoutUrl(null);
      setPollingStatus("waiting");
    }
  }, [visible, stopPolling]);

  useEffect(() => {
    if (visible && !appsChecked && Platform.OS !== "web") {
      (async () => {
        const detected: UpiApp[] = [];
        for (const app of UPI_APPS) {
          try {
            const ok = await Linking.canOpenURL(app.scheme);
            if (ok) detected.push(app);
          } catch {}
        }
        if (detected.length === 0) detected.push(...UPI_APPS);
        setAvailableApps(detected);
        setAppsChecked(true);
      })();
    } else if (visible && Platform.OS === "web" && !appsChecked) {
      setAvailableApps([...UPI_APPS]);
      setAppsChecked(true);
    }
  }, [visible, appsChecked]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active" && step === "polling" && pollInterval.current === null) {
        startPollingInterval();
      }
    });
    return () => sub.remove();
  }, [step]);

  const startPollingInterval = useCallback(() => {
    if (pollInterval.current) return;
    pollCount.current = 0;

    pollInterval.current = setInterval(async () => {
      pollCount.current += 1;
      if (pollCount.current > MAX_POLLS) {
        stopPolling();
        setPollingStatus("failed");
        Alert.alert("Payment Timeout", "We could not confirm your payment. Please contact support if amount was deducted.");
        return;
      }

      try {
        const res = await fetch(`${getApiUrl()}/api/subscriptions/payment-status/${paymentId.current}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json() as { status?: string };
        if (data.status === "captured") {
          stopPolling();
          const result = await confirmUpiPayment(paymentId.current, orderId.current, currentPlan.current);
          if (result.error) {
            setPollingStatus("failed");
            Alert.alert("Verification Error", result.error);
          } else {
            setPollingStatus("success");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => onUnlock(), 600);
          }
        } else if (data.status === "failed") {
          stopPolling();
          setPollingStatus("failed");
          Alert.alert("Payment Failed", "Your UPI payment was not completed. Please try again.");
        }
      } catch {}
    }, 2500);
  }, [token, confirmUpiPayment, stopPolling, onUnlock]);

  const handleSubscribeTap = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/subscriptions/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json() as { orderId?: string; keyId?: string; amount?: number; currency?: string; error?: string };
      if (!res.ok || !data.orderId) {
        Alert.alert("Payment unavailable", data.error ?? "Could not start payment.");
        setLoading(false);
        return;
      }
      orderId.current = data.orderId;
      currentPlan.current = plan;
      setStep("upi-sheet");
    } catch {
      Alert.alert("Error", "Could not connect to payment service.");
    }
    setLoading(false);
  };

  const handleUpiAppTap = async (app: UpiApp) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const res = await fetch(`${getApiUrl()}/api/subscriptions/create-upi-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: orderId.current, plan: currentPlan.current }),
      });
      const data = await res.json() as { paymentId?: string; intentUrl?: string; error?: string };
      if (!res.ok || !data.paymentId || !data.intentUrl) {
        Alert.alert("UPI Error", data.error ?? "Could not create UPI payment.");
        setLoading(false);
        return;
      }

      paymentId.current = data.paymentId;

      const upiParams = data.intentUrl.replace(/^upi:\/\/pay\?/, "");
      const deepLink = `${app.prefix}${upiParams}`;

      try {
        await Linking.openURL(deepLink);
      } catch {
        const generic = `upi://pay?${upiParams}`;
        try {
          await Linking.openURL(generic);
        } catch {
          Alert.alert("UPI App Not Found", "Please make sure a UPI app is installed and try again.");
          setLoading(false);
          return;
        }
      }

      setStep("polling");
      setPollingStatus("waiting");
      setLoading(false);
      startPollingInterval();
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleCardPayment = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/subscriptions/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: currentPlan.current }),
      });
      const data = await res.json() as { orderId?: string; keyId?: string; amount?: number; currency?: string; error?: string };
      if (!res.ok || !data.orderId) {
        Alert.alert("Payment unavailable", data.error ?? "Could not start payment.");
        setLoading(false);
        return;
      }
      const base = getApiUrl();
      const url = `${base}/api/subscriptions/checkout?orderId=${encodeURIComponent(data.orderId)}&amount=${encodeURIComponent(String(data.amount))}&currency=${encodeURIComponent(data.currency ?? "INR")}&keyId=${encodeURIComponent(data.keyId ?? "")}&plan=${encodeURIComponent(currentPlan.current)}&token=${encodeURIComponent(token ?? "")}`;
      setCheckoutUrl(url);
      setStep("card-webview");
    } catch {
      Alert.alert("Error", "Could not connect to payment service.");
    }
    setLoading(false);
  };

  const handleWebViewNav = async (state: WebViewNavigation) => {
    const url = state.url;
    if (url.startsWith("storytime://payment-success")) {
      setCheckoutUrl(null);
      setStep("plan");
      const params = new URLSearchParams(url.split("?")[1] ?? "");
      const result = await unlockWithRazorpay(params.get("paymentId") ?? "", params.get("orderId") ?? "", params.get("signature") ?? "");
      if (result.error) Alert.alert("Verification failed", result.error);
      else { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onUnlock(); }
    } else if (url.startsWith("storytime://payment-cancelled")) {
      setCheckoutUrl(null);
      setStep("upi-sheet");
    }
  };

  const handleClose = () => {
    stopPolling();
    setCheckoutUrl(null);
    setStep("plan");
    onClose();
  };

  const gpayApp = availableApps.find((a) => a.id === "gpay");

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        {step === "card-webview" && checkoutUrl ? (
          <View style={[styles.webviewSheet, { paddingBottom: insets.bottom, backgroundColor: colors.background }]}>
            <View style={styles.webviewHeader}>
              <TouchableOpacity onPress={() => { setCheckoutUrl(null); setStep("upi-sheet"); }} hitSlop={8}>
                <Ionicons name="arrow-back" size={24} color={colors.navy} />
              </TouchableOpacity>
              <Text style={[styles.webviewTitle, { color: colors.navy }]}>Card / Net Banking</Text>
              <View style={{ width: 24 }} />
            </View>
            <WebView source={{ uri: checkoutUrl }} onNavigationStateChange={handleWebViewNav}
              style={styles.webview} startInLoadingState
              renderLoading={() => (
                <View style={styles.webviewLoading}>
                  <ActivityIndicator color={colors.coral} size="large" />
                </View>
              )}
            />
          </View>
        ) : step === "polling" ? (
          <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 32 }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            {pollingStatus === "success" ? (
              <>
                <Text style={styles.bigEmoji}>🎉</Text>
                <Text style={[styles.title, { color: colors.navy }]}>You&apos;re Premium!</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  Unlimited stories unlocked for your little one.
                </Text>
              </>
            ) : pollingStatus === "failed" ? (
              <>
                <Text style={styles.bigEmoji}>❌</Text>
                <Text style={[styles.title, { color: colors.navy }]}>Payment Not Received</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  If your money was deducted, please contact support. It will be refunded within 3–5 days.
                </Text>
                <TouchableOpacity
                  onPress={() => { setStep("upi-sheet"); setPollingStatus("waiting"); }}
                  style={[styles.primaryBtn, { backgroundColor: colors.coral }]}
                >
                  <Text style={styles.primaryBtnText}>Try Again</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color={colors.coral} style={{ marginTop: 16, marginBottom: 24 }} />
                <Text style={[styles.title, { color: colors.navy }]}>Waiting for Payment</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  Complete the payment in your UPI app.{"\n"}This screen will update automatically.
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.laterBtn}>
                  <Text style={[styles.laterText, { color: colors.mutedForeground }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : step === "upi-sheet" ? (
          <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <TouchableOpacity onPress={() => setStep("plan")} style={styles.backRow}>
              <Ionicons name="arrow-back" size={18} color={colors.mutedForeground} />
              <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back</Text>
            </TouchableOpacity>

            <Text style={[styles.title, { color: colors.navy }]}>Pay with UPI</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {PLAN_INFO[currentPlan.current].price} · {currentPlan.current === "yearly" ? "Yearly" : "Monthly"}
            </Text>

            {gpayApp && (
              <TouchableOpacity
                style={[styles.gpayBtn, { backgroundColor: "#4285F4", opacity: loading ? 0.7 : 1 }]}
                onPress={() => handleUpiAppTap(gpayApp)}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Text style={styles.gpayEmoji}>🟦</Text>
                    <Text style={styles.gpayText}>Pay with Google Pay</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            )}

            <Text style={[styles.orLabel, { color: colors.mutedForeground }]}>
              {gpayApp ? "or choose another app" : "Choose your UPI app"}
            </Text>

            <View style={styles.appGrid}>
              {availableApps.filter((a) => a.id !== "gpay").map((app) => (
                <TouchableOpacity
                  key={app.id}
                  onPress={() => handleUpiAppTap(app)}
                  disabled={loading}
                  style={[styles.appTile, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.75}
                >
                  <Text style={styles.appEmoji}>{app.emoji}</Text>
                  <Text style={[styles.appName, { color: colors.navy }]} numberOfLines={1}>{app.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleCardPayment}
              disabled={loading}
              style={[styles.cardBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="card-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.cardBtnText, { color: colors.mutedForeground }]}>Card / Net Banking</Text>
            </TouchableOpacity>
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
                  <TouchableOpacity key={p} onPress={() => { setPlan(p); Haptics.selectionAsync(); }}
                    style={[styles.planBtn, {
                      borderColor: selected ? colors.coral : colors.border,
                      backgroundColor: selected ? colors.coral + "11" : colors.card,
                    }]}
                    activeOpacity={0.8}
                  >
                    {info.saving && (
                      <View style={[styles.savingBadge, { backgroundColor: colors.green }]}>
                        <Text style={styles.savingText}>{info.saving}</Text>
                      </View>
                    )}
                    <Text style={[styles.planLabel, { color: selected ? colors.coral : colors.navy }]}>{info.label}</Text>
                    <Text style={[styles.planPrice, { color: selected ? colors.coral : colors.mutedForeground }]}>{info.price}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.coral, opacity: loading ? 0.7 : 1 }]}
              onPress={handleSubscribeTap}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={styles.primaryBtnText}>Continue to Pay — {PLAN_INFO[plan].price}</Text>
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
  bigEmoji: { fontSize: 56, marginBottom: 16, marginTop: 8 },
  title: { fontSize: 24, fontFamily: "Nunito_800ExtraBold", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Nunito_400Regular", textAlign: "center", lineHeight: 21, marginBottom: 20 },
  featuresBox: { width: "100%", borderRadius: 16, padding: 14, gap: 10, marginBottom: 18 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  check: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureText: { fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  planRow: { flexDirection: "row", gap: 10, width: "100%", marginBottom: 18 },
  planBtn: { flex: 1, borderRadius: 14, borderWidth: 2, paddingVertical: 14, paddingHorizontal: 12, alignItems: "center", position: "relative", gap: 4 },
  savingBadge: { position: "absolute", top: -10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  savingText: { color: "#fff", fontSize: 11, fontFamily: "Nunito_700Bold" },
  planLabel: { fontSize: 15, fontFamily: "Nunito_800ExtraBold" },
  planPrice: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  primaryBtn: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16, marginBottom: 12 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Nunito_800ExtraBold" },
  laterBtn: { paddingVertical: 8 },
  laterText: { fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginBottom: 16 },
  backText: { fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  gpayBtn: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 16, marginBottom: 16 },
  gpayEmoji: { fontSize: 22 },
  gpayText: { fontSize: 17, fontFamily: "Nunito_800ExtraBold", color: "#fff", flex: 1, textAlign: "center" },
  orLabel: { fontSize: 12, fontFamily: "Nunito_600SemiBold", letterSpacing: 0.5, marginBottom: 12 },
  appGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, width: "100%", marginBottom: 16, justifyContent: "center" },
  appTile: { width: 80, paddingVertical: 14, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 6 },
  appEmoji: { fontSize: 26 },
  appName: { fontSize: 11, fontFamily: "Nunito_700Bold", textAlign: "center" },
  cardBtn: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginTop: 4 },
  cardBtnText: { fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  webviewSheet: { flex: 1, marginTop: 60, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
  webviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(0,0,0,0.1)" },
  webviewTitle: { fontSize: 16, fontFamily: "Nunito_700Bold" },
  webview: { flex: 1 },
  webviewLoading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
});
