import cron from "node-cron";
import { db, childrenTable, storiesTable, dailyPicksTable, subscriptionsTable, usersTable } from "@workspace/db";
import { and, eq, gte, ne, notInArray, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

export function startJobs(): void {
  if (process.env["NODE_ENV"] !== "production" && !process.env["RUN_JOBS"]) {
    logger.info("Scheduled jobs disabled in dev (set RUN_JOBS=1 to enable)");
    return;
  }

  // daily_pick_generator — runs every hour
  cron.schedule("0 * * * *", () => {
    dailyPickGenerator().catch((err) => logger.error(err, "daily_pick_generator failed"));
  });

  // subscription_reconciler — runs every 4 hours
  cron.schedule("0 */4 * * *", () => {
    subscriptionReconciler().catch((err) => logger.error(err, "subscription_reconciler failed"));
  });

  logger.info("Scheduled jobs started");
}

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
      // Check if pick already exists for today
      const [existing] = await db
        .select({ id: dailyPicksTable.id })
        .from(dailyPicksTable)
        .where(and(eq(dailyPicksTable.childId, child.id), eq(dailyPicksTable.pickDate, today)))
        .limit(1);

      if (existing) continue;

      // Get user's subscription state
      const [sub] = await db
        .select({ state: subscriptionsTable.state })
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.userId, child.userId))
        .limit(1);

      const isPremium = sub?.state === "active" || sub?.state === "trial";

      // Stories played in last 30 days — avoid repeats
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

      // Prefer stories matching child preferences
      const preferred = child.preferences.length > 0
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

async function subscriptionReconciler(): Promise<void> {
  const now = new Date();

  // Trial ended but state still 'trial'
  const expiredTrials = await db
    .select({ id: subscriptionsTable.id, razorpaySubscriptionId: subscriptionsTable.razorpaySubscriptionId })
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.state, "trial"),
        sql`${subscriptionsTable.trialEndsAt} < ${now}`,
      ),
    );

  for (const sub of expiredTrials) {
    if (!sub.razorpaySubscriptionId) {
      await db
        .update(subscriptionsTable)
        .set({ state: "expired", updatedAt: now })
        .where(eq(subscriptionsTable.id, sub.id));
      continue;
    }

    try {
      const auth = "Basic " + Buffer.from(
        `${process.env["RAZORPAY_KEY_ID"] ?? ""}:${process.env["RAZORPAY_KEY_SECRET"] ?? ""}`,
      ).toString("base64");

      const res = await fetch(`https://api.razorpay.com/v1/subscriptions/${sub.razorpaySubscriptionId}`, {
        headers: { Authorization: auth },
      });

      if (res.ok) {
        const data = await res.json() as { status?: string };
        const newState = data.status === "active" ? "active" : data.status === "cancelled" ? "cancelled" : "expired";
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

  // Active subscriptions past their period end
  const expiredActive = await db
    .select({ id: subscriptionsTable.id })
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.state, "active"),
        sql`${subscriptionsTable.currentPeriodEnd} < ${now}`,
      ),
    );

  if (expiredActive.length > 0) {
    await db
      .update(subscriptionsTable)
      .set({ state: "expired", updatedAt: now })
      .where(
        and(
          eq(subscriptionsTable.state, "active"),
          sql`${subscriptionsTable.currentPeriodEnd} < ${now}`,
        ),
      );
    logger.info({ count: expiredActive.length }, "Expired active subscriptions updated");
  }
}
