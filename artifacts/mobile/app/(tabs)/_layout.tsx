import { Stack } from "expo-router";
import React from "react";

export default function TabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="home" />
      <Stack.Screen
        name="player"
        options={{ animation: "fade", gestureEnabled: true }}
      />
      <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="flashcards" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
