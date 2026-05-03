import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onUnlock: () => void;
}

const FEATURES = [
  "Unlimited stories, any time",
  "All 10 story categories",
  "Bedtime, learning & adventure",
  "New stories added every week",
];

export default function PaywallModal({ visible, onClose, onUnlock }: PaywallModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const handleUnlock = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onUnlock();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={[styles.iconCircle, { backgroundColor: colors.coral + "22" }]}>
            <Ionicons name="star" size={38} color={colors.coral} />
          </View>

          <Text style={[styles.title, { color: colors.navy }]}>
            Storytime Premium
          </Text>
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

          <TouchableOpacity
            style={[styles.unlockBtn, { backgroundColor: colors.coral }]}
            onPress={handleUnlock}
            activeOpacity={0.85}
          >
            <Text style={styles.unlockBtnText}>Unlock Now — £3.99 / month</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.laterBtn}>
            <Text style={[styles.laterText, { color: colors.mutedForeground }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontFamily: "Nunito_800ExtraBold",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  featuresBox: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
  },
  unlockBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  unlockBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
  },
  laterBtn: {
    paddingVertical: 8,
  },
  laterText: {
    fontSize: 14,
    fontFamily: "Nunito_600SemiBold",
  },
});
