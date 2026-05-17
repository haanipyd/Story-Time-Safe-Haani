import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const TABS = [
  {
    name: "Home",
    iconActive: "home" as const,
    iconInactive: "home-outline" as const,
    path: "/(tabs)/home",
    match: "home",
  },
  {
    name: "Profile",
    iconActive: "person-circle" as const,
    iconInactive: "person-circle-outline" as const,
    path: "/(tabs)/settings",
    match: "settings",
  },
];

export default function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const isActive = (match: string) => {
    if (match === "home") return pathname === "/home" || pathname === "/" || pathname === "";
    return pathname.includes(match);
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 0 : 8),
          backgroundColor: colors.background,
          borderTopColor: colors.muted,
        },
      ]}
    >
      {TABS.map((tab) => {
        const active = isActive(tab.match);
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => router.push(tab.path as Parameters<typeof router.push>[0])}
            activeOpacity={0.7}
          >
            <Ionicons
              name={active ? tab.iconActive : tab.iconInactive}
              size={26}
              color={active ? colors.coral : colors.mutedForeground}
            />
            <Text style={[styles.label, { color: active ? colors.coral : colors.mutedForeground }]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export const BOTTOM_TAB_HEIGHT = 64;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
  },
});
