import { Router, type IRouter } from "express";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import {
  childrenTable,
  dailyPicksTable,
  db,
  listeningEventsTable,
  storiesTable,
  subscriptionsTable,
} from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { generateSignedUrl } from "../lib/storage";
import { z } from "zod/v4";
import type { DbStory } from "@workspace/db";

const router: IRouter = Router();

// Mobile app Story type uses `duration` but the DB column is `durationMin`.
// Add `duration` as an alias on every outgoing story so the mobile client
// never receives undefined for this field.
function serialize(story: DbStory): DbStory & { duration: number } {
  return { ...story, duration: story.durationMin };
}

function maskAudio(
  story: DbStory,
  isFreeUser: boolean,
): DbStory & { duration: number } {
  if (isFreeUser && !story.isFree) {
    return serialize({ ...story, audioUrl: "" });
  }
  return serialize(story);
}

router.get("/stories", async (req, res) => {
  try {
    const stories = await db
      .select()
      .from(storiesTable)
      .where(eq(storiesTable.isActive, true))
      .orderBy(desc(storiesTable.publishedAt));
    res.json(stories.map(serialize));
  } catch (err) {
    req.log.error(err, "Failed to list stories");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stories/home", requireAuth, async (req, res) => {
  const { sub: userId, child_id: childId, sub_state: subState } = req.auth!;
  const isFreeUser = subState === "free" || subState === "expired";

  if (!childId) {
    const freeStories = await db
      .select()
      .from(storiesTable)
      .where(and(eq(storiesTable.isActive, true), eq(storiesTable.isFree, true)))
      .orderBy(desc(storiesTable.playCount))
      .limit(12);
    const mask = (s: DbStory) => maskAudio(s, isFreeUser);
    res.json({
      today_pick: freeStories[0] ? mask(freeStories[0]) : null,
      continue_listening: [],
      favorites: freeStories.slice(0, 4).map(mask),
      quick_listens: freeStories.filter((s) => s.durationMin <= 5).map(mask),
      bedtime: freeStories.filter((s) => s.category === "bedtime").map(mask),
      more_like_this: [],
      age_matched: freeStories.map(mask),
    });
    return;
  }

  const [child] = await db
    .select()
    .from(childrenTable)
    .where(eq(childrenTable.id, childId))
    .limit(1);

  if (!child) {
    res.status(404).json({ error: { code: "CHILD_NOT_FOUND", message: "Child profile not found" } });
    return;
  }

  const today = new Date().toISOString().split("T")[0]!;
  const ageFilter = and(
    lte(storiesTable.ageMin, child.age),
    gte(storiesTable.ageMax, child.age),
    eq(storiesTable.isActive, true),
  );

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [todayPickRows, continueRows, quickRows, bedtimeRows, ageRows] =
    await Promise.all([
      db
        .select({ story: storiesTable })
        .from(dailyPicksTable)
        .innerJoin(storiesTable, eq(dailyPicksTable.storyId, storiesTable.id))
        .where(and(eq(dailyPicksTable.childId, childId), eq(dailyPicksTable.pickDate, today)))
        .limit(1),

      db
        .select({ story: storiesTable, pct: listeningEventsTable.percentCompleted })
        .from(listeningEventsTable)
        .innerJoin(storiesTable, eq(listeningEventsTable.storyId, storiesTable.id))
        .where(
          and(
            eq(listeningEventsTable.childId, childId),
            eq(listeningEventsTable.completed, false),
            gte(listeningEventsTable.percentCompleted, 5),
            lte(listeningEventsTable.percentCompleted, 95),
            eq(storiesTable.isActive, true),
            gte(listeningEventsTable.startedAt, sevenDaysAgo),
          ),
        )
        .orderBy(desc(listeningEventsTable.startedAt))
        .limit(8),

      db
        .select()
        .from(storiesTable)
        .where(and(ageFilter, lte(storiesTable.durationMin, 5)))
        .orderBy(desc(storiesTable.playCount))
        .limit(8),

      db
        .select()
        .from(storiesTable)
        .where(and(ageFilter, eq(storiesTable.category, "bedtime")))
        .orderBy(desc(storiesTable.playCount))
        .limit(8),

      db
        .select()
        .from(storiesTable)
        .where(ageFilter)
        .orderBy(desc(storiesTable.playCount))
        .limit(15),
    ]);

  const favRows =
    child.preferences.length > 0
      ? await db
          .select()
          .from(storiesTable)
          .where(and(ageFilter, inArray(storiesTable.category, child.preferences)))
          .orderBy(desc(storiesTable.playCount))
          .limit(10)
      : [];

  const mask = (s: DbStory) => maskAudio(s, isFreeUser);

  const continueListening = continueRows.map((r) => ({
    ...mask(r.story),
    percent_completed: r.pct,
  }));

  const result: Record<string, unknown> = {
    today_pick: todayPickRows[0]?.story ? mask(todayPickRows[0].story) : null,
    ...(continueListening.length > 0 ? { continue_listening: continueListening } : {}),
    new: ageRows.slice(0, 8).map(mask),
    trending: ageRows.map(mask),
    favorites: favRows.map(mask),
    quick_listens: quickRows.map(mask),
    bedtime: bedtimeRows.map(mask),
    age_matched: ageRows.map(mask),
  };

  const hour = new Date().getHours();
  if (hour >= 18) {
    const { bedtime, today_pick, continue_listening, ...rest } = result;
    res.json({ today_pick, ...(continue_listening ? { continue_listening } : {}), bedtime, ...rest });
    return;
  }

  res.json(result);
});

router.get("/stories/categories/:category", requireAuth, async (req, res) => {
  const { category } = req.params;
  const { child_id: childId, sub_state: subState } = req.auth!;
  const isFreeUser = subState === "free" || subState === "expired";

  try {
    const cat = String(category);
    let query = db
      .select()
      .from(storiesTable)
      .where(and(eq(storiesTable.isActive, true), eq(storiesTable.category, cat)));

    if (childId) {
      const [child] = await db
        .select()
        .from(childrenTable)
        .where(eq(childrenTable.id, childId))
        .limit(1);
      if (child) {
        query = db
          .select()
          .from(storiesTable)
          .where(
            and(
              eq(storiesTable.isActive, true),
              eq(storiesTable.category, cat),
              lte(storiesTable.ageMin, child.age),
              gte(storiesTable.ageMax, child.age),
            ),
          );
      }
    }

    const stories = await query.orderBy(desc(storiesTable.playCount));
    res.json(stories.map((s) => maskAudio(s, isFreeUser)));
  } catch (err) {
    req.log.error(err, "Failed to list stories by category");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stories/:id/stream-url", requireAuth, async (req, res) => {
  const storyId1 = String(req.params["id"]);
  const { sub_state: subState } = req.auth!;

  const [story] = await db
    .select()
    .from(storiesTable)
    .where(and(eq(storiesTable.id, storyId1), eq(storiesTable.isActive, true)))
    .limit(1);

  if (!story) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Story not found" } });
    return;
  }

  const isFreeUser = subState === "free" || subState === "expired";
  if (!story.isFree && isFreeUser) {
    res.status(402).json({ error: { code: "PAYMENT_REQUIRED", message: "This story requires a premium subscription" } });
    return;
  }

  try {
    const audioUrl = await generateSignedUrl(story.audioUrl, 3600);
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
    req.log.info({ storyId: storyId1, userId: req.auth!.sub }, "Stream URL generated");
    res.json({ audio_url: audioUrl, expires_at: expiresAt });
  } catch (err) {
    req.log.error(err, "Failed to generate stream URL");
    res.status(500).json({ error: { code: "INTERNAL", message: "Failed to generate stream URL" } });
  }
});

router.get("/stories/:id", async (req, res) => {
  const sid = String(req.params["id"]);
  const [story] = await db
    .select()
    .from(storiesTable)
    .where(and(eq(storiesTable.id, sid), eq(storiesTable.isActive, true)));
  if (!story) {
    res.status(404).json({ error: "Story not found" });
    return;
  }
  res.json(serialize(story));
});

const insertStorySchema = z.object({
  id: z.string().min(1).max(10),
  title: z.string().min(1).max(100),
  category: z.string(),
  durationMin: z.number().int().min(1).max(60),
  ageMin: z.number().int().min(1).max(5),
  ageMax: z.number().int().min(1).max(5),
  description: z.string().min(1).max(300),
  audioUrl: z.string().default(""),
  thumbnailUrl: z.string().default(""),
  isFree: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

router.post("/stories", requireAuth, async (req, res) => {
  const parsed = insertStorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
    return;
  }
  try {
    const [story] = await db.insert(storiesTable).values(parsed.data).returning();
    res.status(201).json(story);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("duplicate key")) {
      res.status(400).json({ error: "A story with this ID already exists" });
      return;
    }
    req.log.error(err, "Failed to create story");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/stories/:id", requireAuth, async (req, res) => {
  const putId = String(req.params["id"]);
  const parsed = insertStorySchema.partial().omit({ id: true }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
    return;
  }
  try {
    const [story] = await db
      .update(storiesTable)
      .set(parsed.data)
      .where(eq(storiesTable.id, putId))
      .returning();
    if (!story) {
      res.status(404).json({ error: "Story not found" });
      return;
    }
    res.json(serialize(story));
  } catch (err) {
    req.log.error(err, "Failed to update story");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/stories/:id", requireAuth, async (req, res) => {
  const delId = String(req.params["id"]);
  const [story] = await db.delete(storiesTable).where(eq(storiesTable.id, delId)).returning();
  if (!story) {
    res.status(404).json({ error: "Story not found" });
    return;
  }
  res.status(204).send();
});

export default router;
