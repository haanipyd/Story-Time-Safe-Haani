import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface AuthUser {
  id: string;
  phone_number: string;
}

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  preferences: string[];
}

export interface SubscriptionStatus {
  state: string;
  plan: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  active: boolean;
  status: string;
}

interface StoredAuth {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  child: ChildProfile | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  child: ChildProfile | null;
  isLoading: boolean;
  subscription: SubscriptionStatus | null;
}

interface AuthContextValue extends AuthState {
  isLoggedIn: boolean;
  isPremium: boolean;
  sendOtp: (phone: string) => Promise<{ error?: string; devOtp?: string | null }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ error?: string; isNewUser?: boolean }>;
  logout: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  createChildProfile: (name: string, age: number, preferences: string[]) => Promise<{ error?: string }>;
  apiFetch: (path: string, opts?: RequestInit) => Promise<Response>;
}

const AUTH_STORAGE_KEY = "storytime_auth_v3";

const AuthContext = createContext<AuthContextValue | null>(null);

export function getApiUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : "";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    refreshToken: null,
    child: null,
    isLoading: true,
    subscription: null,
  });

  const refreshingRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const persistAuth = useCallback(async (data: StoredAuth) => {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
  }, []);

  const clearAuth = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    setState({ user: null, token: null, refreshToken: null, child: null, isLoading: false, subscription: null });
  }, []);

  const tryRefreshTokens = useCallback(async (): Promise<string | null> => {
    if (refreshingRef.current) return null;
    const rt = stateRef.current.refreshToken;
    if (!rt) return null;

    refreshingRef.current = true;
    try {
      const base = getApiUrl();
      const res = await fetch(`${base}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) {
        await clearAuth();
        return null;
      }
      const data = await res.json() as { access_token: string; refresh_token: string };
      setState((p) => ({ ...p, token: data.access_token, refreshToken: data.refresh_token }));
      if (stateRef.current.user) {
        await persistAuth({
          user: stateRef.current.user,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          child: stateRef.current.child,
        });
      }
      return data.access_token;
    } catch {
      return null;
    } finally {
      refreshingRef.current = false;
    }
  }, [clearAuth, persistAuth]);

  const apiFetch = useCallback(
    async (path: string, opts: RequestInit = {}): Promise<Response> => {
      const base = getApiUrl();
      let token = stateRef.current.token;

      const doFetch = (t: string | null) =>
        fetch(`${base}/api${path}`, {
          ...opts,
          headers: {
            "Content-Type": "application/json",
            ...(t ? { Authorization: `Bearer ${t}` } : {}),
            ...(opts.headers ?? {}),
          },
        });

      let res = await doFetch(token);

      if (res.status === 401 && token) {
        const newToken = await tryRefreshTokens();
        if (newToken) {
          res = await doFetch(newToken);
        }
      }

      return res;
    },
    [tryRefreshTokens],
  );

  const loadSubscription = useCallback(async () => {
    try {
      const res = await apiFetch("/subscription/me");
      if (res.ok) {
        const data = await res.json() as SubscriptionStatus;
        const activeStates = ["trial", "active"];
        setState((p) => ({
          ...p,
          subscription: { ...data, active: activeStates.includes(data.state), status: data.state },
        }));
      }
    } catch {
      // ignore network errors
    }
  }, [apiFetch]);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_STORAGE_KEY).then((raw) => {
      if (!raw) {
        setState((p) => ({ ...p, isLoading: false }));
        return;
      }
      try {
        const saved = JSON.parse(raw) as StoredAuth;
        setState((p) => ({
          ...p,
          user: saved.user,
          token: saved.access_token,
          refreshToken: saved.refresh_token,
          child: saved.child ?? null,
          isLoading: false,
        }));
        loadSubscription();
      } catch {
        setState((p) => ({ ...p, isLoading: false }));
      }
    });
  }, []);

  const sendOtp = useCallback(async (phone: string): Promise<{ error?: string; devOtp?: string | null }> => {
    try {
      const base = getApiUrl();
      const res = await fetch(`${base}/api/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phone }),
      });
      const data = await res.json() as { error?: { message?: string } | string; devOtp?: string; success?: boolean };
      if (!res.ok) {
        const msg = typeof data.error === "object" ? data.error?.message : data.error;
        return { error: msg ?? "Failed to send OTP" };
      }
      const devOtp = __DEV__ ? (data.devOtp ?? null) : null;
      return { devOtp };
    } catch {
      return { error: "Could not connect to server" };
    }
  }, []);

  const verifyOtp = useCallback(
    async (phone: string, otp: string): Promise<{ error?: string; isNewUser?: boolean }> => {
      try {
        const base = getApiUrl();
        const res = await fetch(`${base}/api/auth/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone_number: phone, otp }),
        });
        const data = await res.json() as {
          access_token?: string;
          refresh_token?: string;
          is_new_user?: boolean;
          user?: AuthUser;
          current_child?: ChildProfile | null;
          error?: { message?: string } | string;
        };
        if (!res.ok || !data.access_token || !data.refresh_token) {
          const msg = typeof data.error === "object" ? data.error?.message : data.error;
          return { error: msg ?? "Invalid OTP" };
        }
        const user = data.user ?? { id: "", phone_number: phone };
        const child = data.current_child ?? null;
        await persistAuth({
          user,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          child,
        });
        setState((p) => ({
          ...p,
          user,
          token: data.access_token!,
          refreshToken: data.refresh_token!,
          child,
          subscription: null,
        }));
        loadSubscription();
        return { isNewUser: data.is_new_user ?? false };
      } catch {
        return { error: "Could not connect to server" };
      }
    },
    [persistAuth, loadSubscription],
  );

  const logout = useCallback(async () => {
    try {
      if (stateRef.current.refreshToken) {
        await apiFetch("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token: stateRef.current.refreshToken }),
        });
      }
    } catch {
      // ignore errors
    }
    await clearAuth();
  }, [apiFetch, clearAuth]);

  const refreshSubscription = useCallback(async () => {
    await loadSubscription();
  }, [loadSubscription]);

  const createChildProfile = useCallback(
    async (name: string, age: number, preferences: string[]): Promise<{ error?: string }> => {
      try {
        const res = await apiFetch("/children", {
          method: "POST",
          body: JSON.stringify({ name, age, preferences }),
        });
        const data = await res.json() as ChildProfile & { error?: { message?: string } };
        if (!res.ok) {
          return { error: data.error?.message ?? "Failed to create profile" };
        }
        setState((p) => ({ ...p, child: data }));
        if (stateRef.current.user) {
          await persistAuth({
            user: stateRef.current.user,
            access_token: stateRef.current.token!,
            refresh_token: stateRef.current.refreshToken!,
            child: data,
          });
        }
        return {};
      } catch {
        return { error: "Could not connect to server" };
      }
    },
    [apiFetch, persistAuth],
  );

  const isPremium =
    state.subscription?.active === true ||
    state.subscription?.state === "trial" ||
    state.subscription?.state === "active";

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
        createChildProfile,
        apiFetch,
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
