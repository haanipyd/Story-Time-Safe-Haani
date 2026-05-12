import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CATEGORIES } from "@/data/preferences";
import { useProfile } from "@/context/ProfileContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const AGE_OPTIONS = [1, 2, 3, 4, 5];
const SLEEP_OPTIONS: Array<15 | 30 | 60 | null> = [null, 15, 30, 60];

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    currentProfile,
    profiles,
    settings,
    switchProfile,
    updateProfile,
    addProfile,
    updateSettings,
  } = useProfile();
  const { user, isLoggedIn, isPremium, subscription, token, logout, refreshSubscription } = useAuth();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(currentProfile?.name ?? "");
  const [showAddChild, setShowAddChild] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState<number>(3);
  const [newPrefs, setNewPrefs] = useState<string[]>([]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  if (!currentProfile) return null;

  const saveName = () => {
    if (nameValue.trim()) {
      updateProfile(currentProfile.id, { name: nameValue.trim() });
    }
    setEditingName(false);
  };

  const togglePref = (id: string) => {
    setNewPrefs((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleCurrentPref = (id: string) => {
    const prefs = currentProfile.preferences;
    const updated = prefs.includes(id)
      ? prefs.filter((p) => p !== id)
      : [...prefs, id];
    updateProfile(currentProfile.id, { preferences: updated });
    Haptics.selectionAsync();
  };

  const saveNewChild = () => {
    if (!newName.trim() || newPrefs.length < 3) return;
    addProfile({ name: newName.trim(), age: newAge, preferences: newPrefs });
    setShowAddChild(false);
    setNewName("");
    setNewAge(3);
    setNewPrefs([]);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPadding + 16, paddingBottom: bottomPadding + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.navy} />
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: colors.navy }]}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        <SectionLabel label="Child Profile" colors={colors} />

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label="Name" colors={colors}>
            {editingName ? (
              <View style={styles.inlineEdit}>
                <TextInput
                  value={nameValue}
                  onChangeText={setNameValue}
                  style={[styles.nameInput, { color: colors.navy, borderColor: colors.border }]}
                  autoFocus
                  onBlur={saveName}
                  onSubmitEditing={saveName}
                  returnKeyType="done"
                />
              </View>
            ) : (
              <TouchableOpacity onPress={() => { setNameValue(currentProfile.name); setEditingName(true); }}>
                <Text style={[styles.valueText, { color: colors.coral }]}>
                  {currentProfile.name} <Ionicons name="pencil-outline" size={13} color={colors.coral} />
                </Text>
              </TouchableOpacity>
            )}
          </Row>

          <Divider colors={colors} />

          <Row label="Age" colors={colors}>
            <View style={styles.agePicker}>
              {AGE_OPTIONS.map((a) => (
                <TouchableOpacity
                  key={a}
                  onPress={() => {
                    updateProfile(currentProfile.id, { age: a });
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.ageBtn,
                    {
                      backgroundColor:
                        currentProfile.age === a ? colors.coral : colors.muted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.ageBtnText,
                      { color: currentProfile.age === a ? "#fff" : colors.navy },
                    ]}
                  >
                    {a}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Row>
        </View>

        <SectionLabel label="Content Preferences" colors={colors} />
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Tap to toggle categories for {currentProfile.name}
        </Text>

        <View style={styles.prefGrid}>
          {CATEGORIES.map((cat) => {
            const selected = currentProfile.preferences.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => toggleCurrentPref(cat.id)}
                style={[
                  styles.prefTile,
                  {
                    backgroundColor: selected ? cat.color : colors.card,
                    borderColor: selected ? cat.color : colors.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={cat.icon as "moon-outline"}
                  size={22}
                  color={selected ? "#fff" : cat.color}
                />
                <Text
                  style={[
                    styles.prefLabel,
                    { color: selected ? "#fff" : colors.navy },
                  ]}
                  numberOfLines={2}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <SectionLabel label="Playback" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label="Volume Cap (70%)" colors={colors}>
            <Switch
              value={settings.volumeCap}
              onValueChange={(v) => updateSettings({ volumeCap: v })}
              trackColor={{ false: colors.muted, true: colors.coral }}
              thumbColor="#fff"
            />
          </Row>

          <Divider colors={colors} />

          <View style={styles.timerRow}>
            <Text style={[styles.rowLabel, { color: colors.navy }]}>Sleep Timer</Text>
            <View style={styles.timerOptions}>
              {SLEEP_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={String(opt)}
                  onPress={() => {
                    updateSettings({ sleepTimer: opt });
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.timerBtn,
                    {
                      backgroundColor:
                        settings.sleepTimer === opt ? colors.coral : colors.muted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.timerBtnText,
                      { color: settings.sleepTimer === opt ? "#fff" : colors.navy },
                    ]}
                  >
                    {opt === null ? "Off" : `${opt}m`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {profiles.length > 1 && (
          <>
            <SectionLabel label="Switch Profile" colors={colors} />
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {profiles.map((p, idx) => (
                <React.Fragment key={p.id}>
                  <TouchableOpacity
                    onPress={() => { switchProfile(p.id); router.back(); }}
                    style={styles.profileRow}
                  >
                    <View style={[styles.avatar, { backgroundColor: colors.coral }]}>
                      <Text style={styles.avatarText}>{p.name[0].toUpperCase()}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                      <Text style={[styles.profileName, { color: colors.navy }]}>{p.name}</Text>
                      <Text style={[styles.profileMeta, { color: colors.mutedForeground }]}>
                        Age {p.age}
                      </Text>
                    </View>
                    {p.id === currentProfile.id && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.coral} />
                    )}
                  </TouchableOpacity>
                  {idx < profiles.length - 1 && <Divider colors={colors} />}
                </React.Fragment>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          onPress={() => setShowAddChild(true)}
          style={[styles.addChildBtn, { borderColor: colors.coral }]}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.coral} />
          <Text style={[styles.addChildText, { color: colors.coral }]}>
            Add Another Child
          </Text>
        </TouchableOpacity>

        <SectionLabel label="Account" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label="Mobile" colors={colors}>
            <Text style={[styles.valueText, { color: colors.navy }]} numberOfLines={1}>
              {user?.phone_number ?? ""}
            </Text>
          </Row>
          <Divider colors={colors} />
          <TouchableOpacity
            onPress={async () => { await logout(); }}
            style={styles.logoutRow}
          >
            <Ionicons name="log-out-outline" size={18} color="#E55" />
            <Text style={[styles.logoutText]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <SectionLabel label="Subscription" colors={colors} />
        {isPremium && subscription ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Row label="Plan" colors={colors}>
              <View style={[styles.activeBadge, { backgroundColor: colors.green + "22" }]}>
                <Text style={[styles.activeBadgeText, { color: colors.green }]}>
                  {subscription.plan === "yearly" ? "Yearly ✓" : "Monthly ✓"}
                </Text>
              </View>
            </Row>
            {subscription.current_period_end && (
              <>
                <Divider colors={colors} />
                <Row label="Renews on" colors={colors}>
                  <Text style={[styles.valueText, { color: colors.mutedForeground }]}>
                    {new Date(subscription.current_period_end).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </Text>
                </Row>
              </>
            )}
            <Divider colors={colors} />
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  "Cancel Subscription",
                  "Your access will continue until the end of the current period. Cancel anyway?",
                  [
                    { text: "Keep Premium", style: "cancel" },
                    {
                      text: "Cancel",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          const domain = process.env.EXPO_PUBLIC_DOMAIN;
                          const base = domain ? `https://${domain}` : "";
                          await fetch(`${base}/api/subscriptions/cancel`, {
                            method: "POST",
                            headers: { Authorization: `Bearer ${token ?? ""}` },
                          });
                          await refreshSubscription();
                        } catch {}
                      },
                    },
                  ]
                );
              }}
              style={styles.cancelRow}
            >
              <Text style={styles.cancelText}>Cancel Subscription</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Row label="Plan" colors={colors}>
              <Text style={[styles.valueText, { color: colors.mutedForeground }]}>Free (5 stories)</Text>
            </Row>
            <Divider colors={colors} />
            <TouchableOpacity
              onPress={() => router.push("/")}
              style={styles.upgradeRow}
            >
              <Ionicons name="star" size={16} color={colors.coral} />
              <Text style={[styles.upgradeText, { color: colors.coral }]}>
                Upgrade to Premium
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={showAddChild} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowAddChild(false)}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.navy }]}>Add Child</Text>
            <TouchableOpacity
              onPress={saveNewChild}
              disabled={!newName.trim() || newPrefs.length < 3}
            >
              <Text
                style={[
                  styles.modalDone,
                  { color: !newName.trim() || newPrefs.length < 3 ? colors.mutedForeground : colors.coral },
                ]}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={[styles.modalLabel, { color: colors.navy }]}>Name</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Child's name"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.modalInput, { borderColor: colors.border, color: colors.navy, backgroundColor: colors.card }]}
            />

            <Text style={[styles.modalLabel, { color: colors.navy }]}>Age</Text>
            <View style={styles.agePicker}>
              {AGE_OPTIONS.map((a) => (
                <TouchableOpacity
                  key={a}
                  onPress={() => setNewAge(a)}
                  style={[
                    styles.ageBtnLarge,
                    { backgroundColor: newAge === a ? colors.coral : colors.muted },
                  ]}
                >
                  <Text
                    style={[styles.ageBtnLargeText, { color: newAge === a ? "#fff" : colors.navy }]}
                  >
                    {a}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: colors.navy }]}>
              Interests · pick 3–6
            </Text>
            <View style={styles.prefGrid}>
              {CATEGORIES.map((cat) => {
                const sel = newPrefs.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => togglePref(cat.id)}
                    style={[
                      styles.prefTile,
                      { backgroundColor: sel ? cat.color : colors.card, borderColor: sel ? cat.color : colors.border },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={cat.icon as "moon-outline"} size={22} color={sel ? "#fff" : cat.color} />
                    <Text style={[styles.prefLabel, { color: sel ? "#fff" : colors.navy }]} numberOfLines={2}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function SectionLabel({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[settingsStyles.sectionLabel, { color: colors.mutedForeground }]}>
      {label.toUpperCase()}
    </Text>
  );
}

function Row({ label, children, colors }: { label: string; children: React.ReactNode; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={settingsStyles.row}>
      <Text style={[settingsStyles.rowLabel, { color: colors.navy }]}>{label}</Text>
      {children}
    </View>
  );
}

function Divider({ colors }: { colors: ReturnType<typeof useColors> }) {
  return <View style={[settingsStyles.divider, { backgroundColor: colors.border }]} />;
}

const settingsStyles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: "Nunito_600SemiBold",
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {},
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontFamily: "Nunito_800ExtraBold",
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  hint: {
    fontSize: 13,
    fontFamily: "Nunito_400Regular",
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: -4,
  },
  inlineEdit: { flex: 1, alignItems: "flex-end" },
  nameInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 15,
    fontFamily: "Nunito_600SemiBold",
    minWidth: 120,
  },
  valueText: { fontSize: 15, fontFamily: "Nunito_600SemiBold" },
  agePicker: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  ageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  ageBtnText: { fontSize: 15, fontFamily: "Nunito_700Bold" },
  ageBtnLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  ageBtnLargeText: { fontSize: 20, fontFamily: "Nunito_700Bold" },
  timerRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  timerOptions: { flexDirection: "row", gap: 8, marginTop: 8 },
  timerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  timerBtnText: { fontSize: 13, fontFamily: "Nunito_700Bold" },
  rowLabel: { fontSize: 15, fontFamily: "Nunito_600SemiBold" },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontFamily: "Nunito_700Bold" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 15, fontFamily: "Nunito_700Bold" },
  profileMeta: { fontSize: 13, fontFamily: "Nunito_400Regular" },
  addChildBtn: {
    margin: 16,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  addChildText: { fontSize: 15, fontFamily: "Nunito_700Bold" },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  logoutText: { fontSize: 15, fontFamily: "Nunito_600SemiBold", color: "#E55" },
  cancelRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: { fontSize: 14, fontFamily: "Nunito_600SemiBold", color: "#E55" },
  upgradeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  upgradeText: { fontSize: 15, fontFamily: "Nunito_700Bold" },
  authBtns: { marginHorizontal: 16, gap: 10 },
  authBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  authBtnText: { color: "#fff", fontSize: 15, fontFamily: "Nunito_700Bold" },
  authBtnOutline: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1.5,
  },
  authBtnOutlineText: { fontSize: 15, fontFamily: "Nunito_700Bold" },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activeBadgeText: { fontSize: 13, fontFamily: "Nunito_700Bold" },
  prefGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
  },
  prefTile: {
    width: "46%",
    flexGrow: 1,
    minWidth: 130,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 6,
  },
  prefLabel: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
  },
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalCancel: { fontSize: 15, fontFamily: "Nunito_600SemiBold" },
  modalTitle: { fontSize: 17, fontFamily: "Nunito_800ExtraBold" },
  modalDone: { fontSize: 15, fontFamily: "Nunito_700Bold" },
  modalScroll: { padding: 20, paddingBottom: 40 },
  modalLabel: {
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
    marginBottom: 10,
    marginTop: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Nunito_600SemiBold",
  },
});
