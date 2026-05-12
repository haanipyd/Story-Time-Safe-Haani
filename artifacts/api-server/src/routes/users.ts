import { Router, type IRouter } from "express";
import { db, usersTable, childrenTable, listeningEventsTable, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.delete("/users/me/delete", requireAuth, async (req, res) => {
  const userId = req.auth!.sub;

  await db
    .update(usersTable)
    .set({ isDeleted: true })
    .where(eq(usersTable.id, userId));

  req.log.info({ userId }, "User soft-deleted (DPDP right to deletion)");
  res.json({ ok: true, message: "Account marked for deletion. Data will be permanently removed within 30 days." });
});

router.get("/users/me/export", requireAuth, async (req, res) => {
  const userId = req.auth!.sub;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user || user.isDeleted) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
    return;
  }

  const [children, events, subs] = await Promise.all([
    db.select().from(childrenTable).where(eq(childrenTable.userId, userId)),
    db.select().from(listeningEventsTable).where(eq(listeningEventsTable.userId, userId)),
    db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId)),
  ]);

  res.json({
    user: {
      id: user.id,
      phone_number: user.phoneNumber,
      created_at: user.createdAt,
      last_login_at: user.lastLoginAt,
    },
    children,
    listening_events: events,
    subscriptions: subs.map((s) => ({
      id: s.id,
      state: s.state,
      plan: s.plan,
      trial_ends_at: s.trialEndsAt,
      current_period_end: s.currentPeriodEnd,
      created_at: s.createdAt,
    })),
    exported_at: new Date().toISOString(),
  });
});

export default router;
