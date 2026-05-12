import { Router, type IRouter } from "express";
import { db, listeningEventsTable } from "@workspace/db";
import { and, countDistinct, eq, gte, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.get("/dashboard/week", requireAuth, async (req, res) => {
  const { sub: userId, child_id: childId } = req.auth!;

  if (!childId) {
    res.json({
      stories_listened: 0,
      total_minutes: 0,
      daily_minutes: [0, 0, 0, 0, 0, 0, 0],
    });
    return;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [statsRow] = await db
    .select({
      storiesListened: countDistinct(listeningEventsTable.storyId),
      totalSeconds: sql<number>`COALESCE(SUM(${listeningEventsTable.secondsListened}), 0)`,
    })
    .from(listeningEventsTable)
    .where(
      and(
        eq(listeningEventsTable.userId, userId),
        eq(listeningEventsTable.childId, childId),
        gte(listeningEventsTable.startedAt, sevenDaysAgo),
        gte(listeningEventsTable.percentCompleted, 50),
      ),
    );

  const dailyRows = await db
    .select({
      day: sql<string>`DATE(${listeningEventsTable.startedAt})`,
      seconds: sql<number>`COALESCE(SUM(${listeningEventsTable.secondsListened}), 0)`,
    })
    .from(listeningEventsTable)
    .where(
      and(
        eq(listeningEventsTable.userId, userId),
        eq(listeningEventsTable.childId, childId),
        gte(listeningEventsTable.startedAt, sevenDaysAgo),
      ),
    )
    .groupBy(sql`DATE(${listeningEventsTable.startedAt})`);

  const dailyMap = new Map(dailyRows.map((r) => [r.day, Math.round(r.seconds / 60)]));

  const daily_minutes: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split("T")[0]!;
    daily_minutes.push(dailyMap.get(key) ?? 0);
  }

  res.json({
    stories_listened: statsRow?.storiesListened ?? 0,
    total_minutes: Math.round((statsRow?.totalSeconds ?? 0) / 60),
    daily_minutes,
  });
});

export default router;
