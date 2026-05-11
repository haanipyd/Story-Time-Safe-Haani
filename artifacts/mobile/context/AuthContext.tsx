import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface AuthUser {
  id: string;
  phone: string;
  name: string;
}

export interface SubscriptionStatus {
  active: boolean;
  plan: string | null;
  currentPeriodEnd: string | null;
  status: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  subscription: SubscriptionStatus | null;
}

interface AuthContextValue extends AuthState {
  isLoggedIn: boolean;
  isPremium: boolean;
  sendOtp: (phone: string) => Promise<{ error?: string; devOtp?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  unlockWithRazorpay: (paymentId: string, orderId: string, signature: string) => Promise<{ error?: string }>;
  confirmUpiPayment: (paymentId: string, orderId: string, plan: string) => Promise<{ error?: string }>;
}

const AUTH_STORAGE_KEY = "storytime_auth_v2";

const AuthContext = createContext<AuthContextValue | null>(null);

function getApiUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : "";
}

async function apiFetch(
  path: string,
  opts: RequestInit & { token?: string } = {}
): Promise<Response> {
  const { token, ...rest } = opts;
  const base = getApiUrl();
  return fetch(`${base}/api${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(rest.headers ?? {}),
    },
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    subscription: null,
  });

  useEffect(() => {
    AsyncStorage.getItem(AUTH_STORAGE_KEY).then((raw) => {
      if (!raw) {
        setState((p) => ({ ...p, isLoading: false }));
        return;
      }
      try {
        const saved = JSON.parse(raw) as { user: AuthUser; token: string };
        setState((p) => ({
          ...p,
          user: saved.user,
          token: saved.token,
          isLoading: false,
        }));
        refreshSubscriptionWithToken(saved.token);
      } catch {
        setState((p) => ({ ...p, isLoading: false }));
      }
    });
  }, []);

  const refreshSubscriptionWithToken = useCallback(async (token: string) => {
    try {
      const res = await apiFetch("/subscriptions/status", { token });
      if (res.ok) {
        const data = await res.json() as SubscriptionStatus;
        setState((p) => ({ ...p, subscription: data }));
      }
    } catch {}
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (!state.token) return;
    await refreshSubscriptionWithToken(state.token);
  }, [state.token, refreshSubscriptionWithToken]);

  const sendOtp = useCallback(
    async (phone: string): Promise<{ error?: string; devOtp?: string }> => {
      try {
        const res = await apiFetch("/auth/send-otp", {
          method: "POST",
          body: JSON.stringify({ phone }),
        });
        const data = await res.json() as { error?: string; devOtp?: string };
        if (!res.ok) return { error: data.error ?? "Failed to send OTP" };
        return { devOtp: data.devOtp };
      } catch {
        return { error: "Could not connect to server" };
      }
    },
    []
  );

  const verifyOtp = useCallback(
    async (phone: string, otp: string): Promise<{ error?: string }> => {
      try {
        const res = await apiFetch("/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify({ phone, otp }),
        });
        const data = await res.json() as { user?: AuthUser; token?: string; error?: string };
        if (!res.ok || !data.user || !data.token) {
          return { error: data.error ?? "Invalid OTP" };
        }
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: data.user, token: data.token }));
        setState((p) => ({ ...p, user: data.user!, token: data.token!, subscription: null }));
        await refreshSubscriptionWithToken(data.token!);
        return {};
      } catch {
        return { error: "Could not connect to server" };
      }
    },
    [refreshSubscriptionWithToken]
  );

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    setState({ user: null, token: null, isLoading: false, subscription: null });
  }, []);

  const unlockWithRazorpay = useCallback(
    async (paymentId: string, orderId: string, signature: string): Promise<{ error?: string }> => {
      if (!state.token) return { error: "Not logged in" };
      try {
        const res = await apiFetch("/subscriptions/verify", {
          method: "POST",
          token: state.token,
          body: JSON.stringify({ razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: signature }),
        });
        const data = await res.json() as { error?: string };
        if (!res.ok) return { error: data.error ?? "Payment verification failed" };
        await refreshSubscriptionWithToken(state.token);
        return {};
      } catch {
        return { error: "Could not verify payment" };
      }
    },
    [state.token, refreshSubscriptionWithToken]
  );

  const confirmUpiPayment = useCallback(
    async (paymentId: string, orderId: string, plan: string): Promise<{ error?: string }> => {
      if (!state.token) return { error: "Not logged in" };
      try {
        const res = await apiFetch("/subscriptions/confirm-upi", {
          method: "POST",
          token: state.token,
          body: JSON.stringify({ paymentId, orderId, plan }),
        });
        const data = await res.json() as { error?: string };
        if (!res.ok) return { error: data.error ?? "Payment confirmation failed" };
        await refreshSubscriptionWithToken(state.token);
        return {};
      } catch {
        return { error: "Could not confirm payment" };
      }
    },
    [state.token, refreshSubscriptionWithToken]
  );

  const isPremium = state.subscription?.active === true;

  return (
    <AuthContext.Provider
      value={{
        ...state,
        isLoggedIn: !!state.user,
        isPremium,
        sendOtp,
        verifyOtp,
        logout,
        refreshSubscription,
        unlockWithRazorpay,
        confirmUpiPayment,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
