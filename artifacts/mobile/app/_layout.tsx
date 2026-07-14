import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { initMetaSdk } from "@/lib/meta-events";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AchievementCelebration from "@/components/AchievementCelebration";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AudioProvider } from "@/context/AudioContext";
import { AuthProvider } from "@/context/AuthContext";
import { ProfileProvider } from "@/context/ProfileContext";
import { ProgressProvider, useProgress } from "@/context/ProgressContext";
import { StoriesProvider } from "@/context/StoriesContext";
import { InteractiveStoriesProvider } from "@/context/InteractiveStoriesContext";

SplashScreen.preventAutoHideAsync();

function injectWebFonts() {
  if (Platform.OS !== "web") return;
  if (document.getElementById("nunito-font")) return;
  const link = document.createElement("link");
  link.id = "nunito-font";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap";
  document.head.appendChild(link);
}

function patchWebAudioSeeking() {
  if (Platform.OS !== "web") return;
  if (typeof HTMLMediaElement === "undefined") return;

  // Layer 1: patch HTMLMediaElement.prototype.currentTime setter
  try {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "currentTime");
    if (descriptor?.set && !(descriptor.set as unknown as { __patched?: boolean }).__patched) {
      const originalSetter = descriptor.set;
      function safeSetter(this: HTMLMediaElement, value: number) {
        if (!isFinite(value) || isNaN(value)) return;
        try { originalSetter.call(this, value); } catch { /* ignore */ }
      }
      (safeSetter as unknown as { __patched: boolean }).__patched = true;
      Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
        ...descriptor,
        set: safeSetter,
        configurable: true,
      });
    }
  } catch { /* descriptor not configurable — fall through to layer 2 */ }

  // Layer 2: suppress the specific unhandledrejection so it never crashes the app
  if ((window as unknown as { __audioErrPatched?: boolean }).__audioErrPatched) return;
  (window as unknown as { __audioErrPatched: boolean }).__audioErrPatched = true;
  window.addEventListener("unhandledrejection", (event) => {
    if (
      event.reason?.message?.includes("currentTime") ||
      event.reason?.message?.includes("non-finite")
    ) {
      event.preventDefault();
    }
  });
}

function GlobalCelebration() {
  const { pendingCelebration, dismissCelebration } = useProgress();
  if (!pendingCelebration) return null;
  return (
    <AchievementCelebration
      achievement={pendingCelebration}
      onDismiss={dismissCelebration}
    />
  );
}

function AuthGuard() {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const onPhoneAuth = segments[0] === "phone-auth";
    const onOnboarding = segments[0] === "onboarding";
    if (onPhoneAuth || onOnboarding) {
      router.replace("/(tabs)/home");
    }
  }, [segments, router]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Stack.Screen name="phone-auth" options={{ animation: "fade" }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </>
  );
}

function RootLayout() {
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    injectWebFonts();
    patchWebAudioSeeking();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    initMetaSdk();
    if (Platform.OS !== "ios") return;
    // Request iOS App Tracking Transparency after a short delay so it doesn't
    // fire before the splash screen is gone. Wrapped in try/catch so a missing
    // native module (e.g. Expo Go) never crashes the app.
    const timer = setTimeout(async () => {
      try {
        const { requestTrackingPermissionsAsync, getTrackingPermissionsAsync } =
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require("expo-tracking-transparency") as {
            requestTrackingPermissionsAsync: () => Promise<{ status: string }>;
            getTrackingPermissionsAsync: () => Promise<{ status: string }>;
          };
        const { status } = await getTrackingPermissionsAsync();
        if (status === "undetermined") {
          await requestTrackingPermissionsAsync();
        }
      } catch {
        // Not available in Expo Go or if permission already settled
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const [fontsLoaded, fontError] = useFonts(
    isWeb
      ? {}
      : {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          ionicons: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"),
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          feather: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf"),
          Nunito_400Regular,
          Nunito_600SemiBold,
          Nunito_700Bold,
          Nunito_800ExtraBold,
        }
  );

  useEffect(() => {
    if (isWeb || fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [isWeb, fontsLoaded, fontError]);

  if (!isWeb && !fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <ProfileProvider>
            <StoriesProvider>
              <InteractiveStoriesProvider>
                <ProgressProvider>
                  <AudioProvider>
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      <RootLayoutNav />
                      <GlobalCelebration />
                    </GestureHandlerRootView>
                  </AudioProvider>
                </ProgressProvider>
              </InteractiveStoriesProvider>
            </StoriesProvider>
          </ProfileProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

export default RootLayout;
