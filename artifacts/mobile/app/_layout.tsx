import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/nunito";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AudioProvider } from "@/context/AudioContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ProfileProvider, useProfile } from "@/context/ProfileContext";

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

function AuthGuard() {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { currentProfile, isLoading: profileLoading } = useProfile();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || profileLoading) return;

    const onPhoneAuth = segments[0] === "phone-auth";
    const onOnboarding = segments[0] === "onboarding";

    if (!isLoggedIn) {
      if (!onPhoneAuth) router.replace("/phone-auth");
      return;
    }

    if (!currentProfile) {
      if (!onOnboarding) router.replace("/onboarding");
      return;
    }

    if (onPhoneAuth || onOnboarding) {
      router.replace("/(tabs)/home");
    }
  }, [isLoggedIn, authLoading, profileLoading, currentProfile, segments, router]);

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

export default function RootLayout() {
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    injectWebFonts();
  }, []);

  const [fontsLoaded, fontError] = useFonts(
    isWeb
      ? {}
      : {
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
            <AudioProvider>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </AudioProvider>
          </ProfileProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
