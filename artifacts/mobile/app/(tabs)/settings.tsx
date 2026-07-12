import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import BottomTabBar from "@/components/BottomTabBar";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
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
import { ACHIEVEMENTS, useProgress } from "@/context/ProgressContext";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BADGE_TILE_WIDTH = Math.floor((SCREEN_WIDTH - 32 - 16) / 3);
const AGE_OPTIONS = [1, 2, 3, 4, 5];
const SLEEP_OPTIONS: Array<15 | 30 | 60 | null> = [null, 15, 30, 60];
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

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
  const { user, isPremium, subscription, token, logout, refreshSubscription } = useAuth();
  const {
    audioStreak,
    cardStreak,
    totalStoriesListened,
    totalMinutesListened,
    totalCardsFlipped,
    unlockedAchievements,
    getRecentActivity,
  } = useProgress();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(currentProfile?.name ?? "");
  const [showAddChild, setShowAddChild] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState<number>(3);
  const [newPrefs, setNewPrefs] = useState<string[]>([]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const GUEST_PROFILE_SETTINGS = {
    id: "guest",
    name: "Little One",
    age: 3,
    preferences: ["bedtime", "adventure", "animals", "fairy_tales"],
    listeningHistory: [] as string[],
    favourites: [] as string[],
  };
  const profile = currentProfile ?? GUEST_PROFILE_SETTINGS;

  const saveName = () => {
    if (nameValue.trim()) updateProfile(profile.id, { name: nameValue.trim() });
    setEditingName(false);
  };

  const togglePref = (id: string) => {
    setNewPrefs((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  };

  const toggleCurrentPref = (id: string) => {
    const prefs = profile.preferences;
    const updated = prefs.includes(id) ? prefs.filter((p) => p !== id) : [...prefs, id];
    updateProfile(profile.id, { preferences: updated });
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

  const recentActivity = getRecentActivity(7);
  const unlockedCount = Object.keys(unlockedAchievements).length;
  const totalDaysActive = Object.keys(
    Object.fromEntries(
      Object.entries(
        (getRecentActivity(365) as Array<{ date: string; audio: boolean; cards: boolean }>)
          .filter((d) => d.audio || d.cards)
          .map((d) => [d.date, true])
      )
    )
  ).length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPadding + 16, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.navy} />
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: colors.navy }]}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* ── Profile Hero ── */}
        <View style={styles.heroSection}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.coral }]}>
            <Text style={styles.avatarLetter}>{profile.name[0].toUpperCase()}</Text>
          </View>
          <Text style={[styles.heroName, { color: colors.navy }]}>{profile.name}</Text>
          <View style={styles.heroBadgeRow}>
            <View style={[styles.heroBadge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.heroBadgeText, { color: colors.navy }]}>
                Age {profile.age}
              </Text>
            </View>
            {totalDaysActive > 0 && (
              <View style={[styles.heroBadge, { backgroundColor: colors.coral + "22" }]}>
                <Text style={[styles.heroBadgeText, { color: colors.coral }]}>
                  🗓 {totalDaysActive} days active
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Streaks ── */}
        <View style={styles.streakRow}>
          <StreakCard
            emoji="🔥"
            label="Audio Streak"
            count={audioStreak.count}
            best={audioStreak.longestCount}
            color="#FF6B35"
            bg="#FF6B3514"
            colors={colors}
          />
          <StreakCard
            emoji="🃏"
            label="Card Streak"
            count={cardStreak.count}
            best={cardStreak.longestCount}
            color={colors.purple}
            bg={colors.purple + "14"}
            colors={colors}
          />
        </View>

        {/* ── This Week ── */}
        <View style={styles.weekSection}>
          <Text style={[styles.sectionTitle, { color: colors.navy }]}>This Week</Text>
          <View style={[styles.weekGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {recentActivity.map((day, i) => {
              const dow = new Date(day.date + "T12:00:00").getDay();
              const hasAudio = day.audio;
              const hasCards = day.cards;
              const active = hasAudio || hasCards;
              return (
                <View key={day.date} style={styles.weekDayCol}>
                  <View
                    style={[
                      styles.weekDot,
                      {
                        backgroundColor: active
                          ? hasAudio && hasCards
                            ? colors.coral
                            : hasAudio
                            ? colors.coral
                            : colors.purple
                          : colors.muted,
                      },
                    ]}
                  >
                    {hasAudio && hasCards && (
                      <View
                        style={[
                          StyleSheet.absoluteFillObject,
                          styles.weekDotSplit,
                          { backgroundColor: colors.purple },
                        ]}
                      />
                    )}
                  </View>
                  <Text style={[styles.weekDayLabel, { color: colors.mutedForeground }]}>
                    {DAY_LABELS[dow]}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.weekLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.coral }]} />
              <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>Audio</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.purple }]} />
              <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>Cards</Text>
            </View>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <StatTile emoji="📖" value={totalStoriesListened} label="Stories" colors={colors} />
          <StatTile emoji="⏱" value={Math.round(totalMinutesListened)} label="Minutes" colors={colors} />
          <StatTile emoji="🃏" value={totalCardsFlipped} label="Cards" colors={colors} />
        </View>

        {/* ── Achievements ── */}
        <View style={styles.achievementsSection}>
          <View style={styles.achievementsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.navy }]}>Achievements</Text>
            <View style={[styles.achievementCount, { backgroundColor: colors.coral + "22" }]}>
              <Text style={[styles.achievementCountText, { color: colors.coral }]}>
                {unlockedCount} / {ACHIEVEMENTS.length}
              </Text>
            </View>
          </View>
          <View style={styles.badgeGrid}>
            {ACHIEVEMENTS.map((achievement) => {
              const unlocked = !!unlockedAchievements[achievement.id];
              return (
                <View
                  key={achievement.id}
                  style={[
                    styles.badgeTile,
                    {
                      width: BADGE_TILE_WIDTH,
                      backgroundColor: unlocked ? colors.card : colors.muted,
                      borderColor: unlocked ? colors.border : "transparent",
                      opacity: unlocked ? 1 : 0.55,
                    },
                  ]}
                >
                  <Text style={[styles.badgeEmoji, unlocked ? {} : styles.badgeEmojiLocked]}>
                    {unlocked ? achievement.emoji : "🔒"}
                  </Text>
                  <Text
                    style={[
                      styles.badgeTitle,
                      { color: unlocked ? colors.navy : colors.mutedForeground },
                    ]}
                    numberOfLines={2}
                  >
                    {achievement.title}
                  </Text>
                  {unlocked && (
                    <View style={[styles.badgeCheck, { backgroundColor: colors.coral }]}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Settings Divider ── */}
        <View style={styles.settingsDivider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>SETTINGS</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* ── Child Profile ── */}
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
              <TouchableOpacity onPress={() => { setNameValue(profile.name); setEditingName(true); }}>
                <Text style={[styles.valueText, { color: colors.coral }]}>
                  {profile.name} <Ionicons name="pencil-outline" size={13} color={colors.coral} />
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
                  onPress={() => { updateProfile(profile.id, { age: a }); Haptics.selectionAsync(); }}
                  style={[styles.ageBtn, { backgroundColor: profile.age === a ? colors.coral : colors.muted }]}
                >
                  <Text style={[styles.ageBtnText, { color: profile.age === a ? "#fff" : colors.navy }]}>
                    {a}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Row>
        </View>

        {/* ── Content Preferences ── */}
        <SectionLabel label="Content Preferences" colors={colors} />
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Tap to toggle categories for {profile.name}
        </Text>
        <View style={styles.prefGrid}>
          {CATEGORIES.map((cat) => {
            const selected = profile.preferences.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => toggleCurrentPref(cat.id)}
                style={[styles.prefTile, { backgroundColor: selected ? cat.color : colors.card, borderColor: selected ? cat.color : colors.border }]}
                activeOpacity={0.8}
              >
                <Ionicons name={cat.icon as "moon-outline"} size={22} color={selected ? "#fff" : cat.color} />
                <Text style={[styles.prefLabel, { color: selected ? "#fff" : colors.navy }]} numberOfLines={2}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Playback ── */}
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
                  onPress={() => { updateSettings({ sleepTimer: opt }); Haptics.selectionAsync(); }}
                  style={[styles.timerBtn, { backgroundColor: settings.sleepTimer === opt ? colors.coral : colors.muted }]}
                >
                  <Text style={[styles.timerBtnText, { color: settings.sleepTimer === opt ? "#fff" : colors.navy }]}>
                    {opt === null ? "Off" : `${opt}m`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Switch Profile ── */}
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
                      <Text style={[styles.profileMeta, { color: colors.mutedForeground }]}>Age {p.age}</Text>
                    </View>
                    {p.id === profile.id && (
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
          <Text style={[styles.addChildText, { color: colors.coral }]}>Add Another Child</Text>
        </TouchableOpacity>

        {/* ── Account ── */}
        <SectionLabel label="Account" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Row label="Mobile" colors={colors}>
            <Text style={[styles.valueText, { color: colors.navy }]} numberOfLines={1}>
              {user?.phone_number ?? ""}
            </Text>
          </Row>
          <Divider colors={colors} />
          <TouchableOpacity onPress={async () => { await logout(); }} style={styles.logoutRow}>
            <Ionicons name="log-out-outline" size={18} color="#E55" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* ── About ── */}
        <SectionLabel label="About" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => {
              const domain = process.env.EXPO_PUBLIC_DOMAIN;
              const base = domain ? `https://${domain}` : "";
              WebBrowser.openBrowserAsync(`${base}/api/privacy`);
            }}
            style={styles.linkRow}
          >
            <Ionicons name="document-text-outline" size={18} color={colors.navy} />
            <Text style={[styles.linkText, { color: colors.navy }]}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* ── Subscription ── */}
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
            <TouchableOpacity onPress={() => router.push("/")} style={styles.upgradeRow}>
              <Ionicons name="star" size={16} color={colors.coral} />
              <Text style={[styles.upgradeText, { color: colors.coral }]}>Upgrade to Premium</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <BottomTabBar />

      {/* ── Add Child Modal ── */}
      <Modal visible={showAddChild} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowAddChild(false)}>
              <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.navy }]}>Add Child</Text>
            <TouchableOpacity onPress={saveNewChild} disabled={!newName.trim() || newPrefs.length < 3}>
              <Text style={[styles.modalDone, { color: !newName.trim() || newPrefs.length < 3 ? colors.mutedForeground : colors.coral }]}>
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
                  style={[styles.ageBtnLarge, { backgroundColor: newAge === a ? colors.coral : colors.muted }]}
                >
                  <Text style={[styles.ageBtnLargeText, { color: newAge === a ? "#fff" : colors.navy }]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.modalLabel, { color: colors.navy }]}>Interests · pick 3–6</Text>
            <View style={styles.prefGrid}>
              {CATEGORIES.map((cat) => {
                const sel = newPrefs.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => togglePref(cat.id)}
                    style={[styles.prefTile, { backgroundColor: sel ? cat.color : colors.card, borderColor: sel ? cat.color : colors.border }]}
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

function StreakCard({
  emoji, label, count, best, color, bg, colors,
}: {
  emoji: string; label: string; count: number; best: number;
  color: string; bg: string; colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[streakStyles.card, { backgroundColor: bg, borderColor: color + "33" }]}>
      <Text style={streakStyles.emoji}>{emoji}</Text>
      <Text style={[streakStyles.count, { color }]}>{count}</Text>
      <Text style={[streakStyles.label, { color: colors.navy }]}>day streak</Text>
      <Text style={[streakStyles.best, { color: colors.mutedForeground }]}>Best: {best} days</Text>
    </View>
  );
}

const streakStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    borderWidth: 1.5,
  },
  emoji: { fontSize: 32, marginBottom: 4 },
  count: { fontSize: 44, fontFamily: "Nunito_800ExtraBold", lineHeight: 50 },
  label: { fontSize: 13, fontFamily: "Nunito_600SemiBold", marginTop: 2 },
  best: { fontSize: 11, fontFamily: "Nunito_400Regular", marginTop: 4 },
});

function StatTile({ emoji, value, label, colors }: { emoji: string; value: number; label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[statStyles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={statStyles.emoji}>{emoji}</Text>
      <Text style={[statStyles.value, { color: colors.navy }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: "center",
    gap: 4,
  },
  emoji: { fontSize: 22 },
  value: { fontSize: 24, fontFamily: "Nunito_800ExtraBold" },
  label: { fontSize: 11, fontFamily: "Nunito_600SemiBold" },
});

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

  /* Hero */
  heroSection: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarLetter: {
    fontSize: 38,
    fontFamily: "Nunito_800ExtraBold",
    color: "#fff",
  },
  heroName: {
    fontSize: 28,
    fontFamily: "Nunito_800ExtraBold",
    marginBottom: 8,
  },
  heroBadgeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  heroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  heroBadgeText: {
    fontSize: 13,
    fontFamily: "Nunito_600SemiBold",
  },

  /* Streaks */
  streakRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },

  /* This Week */
  weekSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Nunito_800ExtraBold",
    marginBottom: 10,
  },
  weekGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    paddingBottom: 12,
  },
  weekDayCol: {
    alignItems: "center",
    gap: 6,
  },
  weekDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    overflow: "hidden",
  },
  weekDotSplit: {
    left: "50%",
    right: 0,
    top: 0,
    bottom: 0,
    position: "absolute",
  },
  weekDayLabel: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
  },
  weekLegend: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
    justifyContent: "flex-end",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontFamily: "Nunito_600SemiBold",
  },

  /* Stats */
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 20,
  },

  /* Achievements */
  achievementsSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  achievementsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  achievementCount: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  achievementCountText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badgeTile: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 6,
    position: "relative",
    minHeight: 100,
    justifyContent: "center",
  },
  badgeEmoji: {
    fontSize: 28,
  },
  badgeEmojiLocked: {
    opacity: 0.5,
  },
  badgeTitle: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
    lineHeight: 14,
  },
  badgeCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Settings divider */
  settingsDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
    letterSpacing: 1,
  },

  /* Existing Settings */
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
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 8,
  },
  prefLabel: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
  },

  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  linkText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Nunito_600SemiBold",
  },

  /* Modal */
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCancel: { fontSize: 16, fontFamily: "Nunito_600SemiBold" },
  modalTitle: { fontSize: 18, fontFamily: "Nunito_800ExtraBold" },
  modalDone: { fontSize: 16, fontFamily: "Nunito_700Bold" },
  modalScroll: { padding: 20, paddingBottom: 40 },
  modalLabel: {
    fontSize: 15,
    fontFamily: "Nunito_700Bold",
    marginBottom: 10,
    marginTop: 16,
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
