import cron from "node-cron";
import {
  db,
  childrenTable,
  storiesTable,
  dailyPicksTable,
  subscriptionsTable,
  usersTable,
  pushTokensTable,
} from "@workspace/db";
import { and, eq, gte, isNotNull, isNull, notInArray, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import admin from "firebase-admin";

// ── Firebase Admin init ──────────────────────────────────────────────────────
let fcmReady = false;
function initFCM(): void {
  if (fcmReady) return;
  const serviceAccount = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];
  if (!serviceAccount) {
    logger.warn("FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled");
    return;
  }
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount) as admin.ServiceAccount),
    });
    fcmReady = true;
    logger.info("Firebase Admin SDK initialized");
  } catch (err) {
    logger.error(err, "Failed to initialize Firebase Admin SDK");
  }
}

export function startJobs(): void {
  if (process.env["NODE_ENV"] !== "production" && !process.env["RUN_JOBS"]) {
    logger.info("Scheduled jobs disabled in dev (set RUN_JOBS=1 to enable)");
    return;
  }

  initFCM();

  // daily_pick_generator — runs every hour at :00
  cron.schedule("0 * * * *", () => {
    dailyPickGenerator().catch((err) => logger.error(err, "daily_pick_generator failed"));
  });

  // subscription_reconciler — runs every 4 hours
  cron.schedule("0 */4 * * *", () => {
    subscriptionReconciler().catch((err) => logger.error(err, "subscription_reconciler failed"));
  });

  // daily_push_sender — runs every hour at :00
  cron.schedule("0 * * * *", () => {
    dailyPushSender().catch((err) => logger.error(err, "daily_push_sender failed"));
  });

  logger.info("Scheduled jobs started");
}

// ── daily_pick_generator ──────────────────────────────────────────────────────
async function dailyPickGenerator(): Promise<void> {
  const today = new Date().toISOString().split("T")[0]!;

  const children = await db
    .select({
      id: childrenTable.id,
      age: childrenTable.age,
      preferences: childrenTable.preferences,
      userId: childrenTable.userId,
    })
    .from(childrenTable);

  if (children.length === 0) return;

  for (const child of children) {
    try {
      const [existing] = await db
        .select({ id: dailyPicksTable.id })
        .from(dailyPicksTable)
        .where(and(eq(dailyPicksTable.childId, child.id), eq(dailyPicksTable.pickDate, today)))
        .limit(1);

      if (existing) continue;

      const [sub] = await db
        .select({ state: subscriptionsTable.state })
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.userId, child.userId))
        .limit(1);

      const isPremium = sub?.state === "active" || sub?.state === "trial";

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentPlays = await db
        .select({ storyId: sql<string>`story_id` })
        .from(sql`listening_events`)
        .where(sql`child_id = ${child.id} AND started_at > ${thirtyDaysAgo}`);

      const recentIds = recentPlays.map((r) => r.storyId).filter(Boolean);

      const storyQuery = db
        .select({ id: storiesTable.id })
        .from(storiesTable)
        .where(
          and(
            eq(storiesTable.isActive, true),
            ...(isPremium ? [] : [eq(storiesTable.isFree, true)]),
            sql`${storiesTable.ageMin} <= ${child.age} AND ${storiesTable.ageMax} >= ${child.age}`,
            ...(recentIds.length > 0 ? [notInArray(storiesTable.id, recentIds)] : []),
          ),
        )
        .limit(50);

      const candidates = await storyQuery;
      if (candidates.length === 0) continue;

      const preferred =
        child.preferences.length > 0
          ? await db
              .select({ id: storiesTable.id })
              .from(storiesTable)
              .where(
                and(
                  eq(storiesTable.isActive, true),
                  sql`category = ANY(${child.preferences}::text[])`,
                  sql`${storiesTable.ageMin} <= ${child.age} AND ${storiesTable.ageMax} >= ${child.age}`,
                ),
              )
              .limit(20)
          : [];

      const pool = preferred.length > 0 ? preferred : candidates;
      const picked = pool[Math.floor(Math.random() * pool.length)]!;

      await db
        .insert(dailyPicksTable)
        .values({ childId: child.id, storyId: picked.id, pickDate: today })
        .onConflictDoNothing();

      logger.info({ childId: child.id, storyId: picked.id, date: today }, "Daily pick generated");
    } catch (err) {
      logger.error(err, `Failed to generate pick for child ${child.id}`);
    }
  }
}

// ── subscription_reconciler ───────────────────────────────────────────────────
async function subscriptionReconciler(): Promise<void> {
  const now = new Date();

  const expiredTrials = await db
    .select({ id: subscriptionsTable.id, razorpaySubscriptionId: subscriptionsTable.razorpaySubscriptionId })
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.state, "trial"), sql`${subscriptionsTable.trialEndsAt} < ${now}`));

  for (const sub of expiredTrials) {
    if (!sub.razorpaySubscriptionId) {
      await db
        .update(subscriptionsTable)
        .set({ state: "expired", updatedAt: now })
        .where(eq(subscriptionsTable.id, sub.id));
      continue;
    }

    try {
      const auth =
        "Basic " +
        Buffer.from(
          `${process.env["RAZORPAY_KEY_ID"] ?? ""}:${process.env["RAZORPAY_KEY_SECRET"] ?? ""}`,
        ).toString("base64");

      const res = await fetch(
        `https://api.razorpay.com/v1/subscriptions/${sub.razorpaySubscriptionId}`,
        { headers: { Authorization: auth } },
      );

      if (res.ok) {
        const data = (await res.json()) as { status?: string };
        const newState =
          data.status === "active"
            ? "active"
            : data.status === "cancelled"
              ? "cancelled"
              : "expired";
        await db
          .update(subscriptionsTable)
          .set({ state: newState, updatedAt: now })
          .where(eq(subscriptionsTable.id, sub.id));
        logger.info({ subId: sub.id, newState }, "Subscription reconciled");
      }
    } catch (err) {
      logger.error(err, `Failed to reconcile sub ${sub.id}`);
    }
  }

  const expiredActive = await db
    .select({ id: subscriptionsTable.id })
    .from(subscriptionsTable)
    .where(
      and(eq(subscriptionsTable.state, "active"), sql`${subscriptionsTable.currentPeriodEnd} < ${now}`),
    );

  if (expiredActive.length > 0) {
    await db
      .update(subscriptionsTable)
      .set({ state: "expired", updatedAt: now })
      .where(
        and(eq(subscriptionsTable.state, "active"), sql`${subscriptionsTable.currentPeriodEnd} < ${now}`),
      );
    logger.info({ count: expiredActive.length }, "Expired active subscriptions updated");
  }
}

// ── daily_push_sender ─────────────────────────────────────────────────────────
// Sends a push notification to users whose local time is ~19:30 (7:30 PM).
// Uses a 60-minute window to compensate for hourly scheduling.
async function dailyPushSender(): Promise<void> {
  if (!fcmReady) return;

  const nowUtc = new Date();
  const utcHour = nowUtc.getUTCHours();
  const utcMinute = nowUtc.getUTCMinutes();
  const utcOffsetMinutes = utcHour * 60 + utcMinute;

  // Target: 19:30 local. Window: ±30 min from the start of this hour.
  // i.e. users whose UTC offset makes local time 19:00–20:00.
  const TARGET_LOCAL_MINUTES = 19 * 60 + 30;
  const windowStart = TARGET_LOCAL_MINUTES - 30;
  const windowEnd = TARGET_LOCAL_MINUTES + 30;

  const today = nowUtc.toISOString().split("T")[0]!;

  // Fetch all users who have a timezone set, push tokens, and a current child
  const candidates = await db
    .select({
      userId: usersTable.id,
      timezone: usersTable.timezone,
      currentChildId: usersTable.currentChildId,
    })
    .from(usersTable)
    .where(and(eq(usersTable.isDeleted, false), isNotNull(usersTable.currentChildId)));

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of candidates) {
    try {
      if (!user.currentChildId) { skipped++; continue; }

      // Determine user's local time offset
      const localOffsetMinutes = getTimezoneOffsetMinutes(user.timezone ?? "Asia/Kolkata", nowUtc);
      const localMinutes = (utcOffsetMinutes + localOffsetMinutes + 1440) % 1440;

      if (localMinutes < windowStart || localMinutes >= windowEnd) {
        skipped++;
        continue;
      }

      // Check if pick exists and push not yet sent today
      const [pick] = await db
        .select({ id: dailyPicksTable.id, storyId: dailyPicksTable.storyId, pushSentAt: dailyPicksTable.pushSentAt })
        .from(dailyPicksTable)
        .where(
          and(
            eq(dailyPicksTable.childId, user.currentChildId),
            eq(dailyPicksTable.pickDate, today),
            isNull(dailyPicksTable.pushSentAt),
          ),
        )
        .limit(1);

      if (!pick) { skipped++; continue; }

      // Fetch story title
      const [story] = await db
        .select({ title: storiesTable.title })
        .from(storiesTable)
        .where(eq(storiesTable.id, pick.storyId))
        .limit(1);

      if (!story) { skipped++; continue; }

      // Fetch child name
      const [child] = await db
        .select({ name: childrenTable.name })
        .from(childrenTable)
        .where(eq(childrenTable.id, user.currentChildId))
        .limit(1);

      // Fetch active push tokens
      const tokens = await db
        .select({ id: pushTokensTable.id, fcmToken: pushTokensTable.fcmToken })
        .from(pushTokensTable)
        .where(and(eq(pushTokensTable.userId, user.userId), eq(pushTokensTable.isActive, true)));

      if (tokens.length === 0) { skipped++; continue; }

      const title = `Today's story for ${child?.name ?? "your little one"} is ready 🌙`;
      const body = story.title;
      const data = { story_id: pick.storyId, deep_link: `storytime://story/${pick.storyId}` };

      for (const token of tokens) {
        try {
          await admin.messaging().send({
            token: token.fcmToken,
            notification: { title, body },
            data,
            android: { priority: "normal" },
            apns: { payload: { aps: { sound: "default" } } },
          });
        } catch (fcmErr: unknown) {
          const fcmMsg = fcmErr instanceof Error ? fcmErr.message : String(fcmErr);
          const isInvalid =
            fcmMsg.includes("registration-token-not-registered") ||
            fcmMsg.includes("invalid-registration-token");
          if (isInvalid) {
            await db
              .update(pushTokensTable)
              .set({ isActive: false, updatedAt: new Date() })
              .where(eq(pushTokensTable.id, token.id));
            logger.info({ tokenId: token.id }, "FCM token deactivated — no longer registered");
          } else {
            logger.warn({ fcmErr }, "FCM send error");
          }
        }
      }

      // Mark push as sent
      await db
        .update(dailyPicksTable)
        .set({ pushSentAt: new Date() })
        .where(eq(dailyPicksTable.id, pick.id));

      sent++;
    } catch (err) {
      logger.error(err, `Push sender failed for user ${user.userId}`);
      failed++;
    }
  }

  logger.info({ sent, skipped, failed }, "daily_push_sender completed");
}

/**
 * Returns the UTC offset in minutes for a given IANA timezone at a specific point in time.
 * e.g. Asia/Kolkata → +330 (IST = UTC+5:30)
 */
function getTimezoneOffsetMinutes(tz: string, at: Date): number {
  try {
    // Format date in target timezone and in UTC, diff the hours
    const local = new Date(at.toLocaleString("en-US", { timeZone: tz }));
    const utc = new Date(at.toLocaleString("en-US", { timeZone: "UTC" }));
    return Math.round((local.getTime() - utc.getTime()) / 60000);
  } catch {
    return 330; // Default IST
  }
}
