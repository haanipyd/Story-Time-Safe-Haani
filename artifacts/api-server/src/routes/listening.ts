import { Router, type IRouter } from "express";
import { db, listeningEventsTable, storiesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

const startSchema = z
  .object({
    story_id: z.string().min(1, "story_id is required").max(20, "story_id too long"),
  })
  .strict();

const progressSchema = z
  .object({
    seconds_listened: z.number().int("Must be integer").min(0).max(86400),
    percent_completed: z.number().int("Must be integer").min(0).max(100),
    completed: z.boolean().optional().default(false),
  })
  .strict();

function validationError(issue: z.core.$ZodIssue | undefined, res: any): void {
  res.status(400).json({
    error: {
      code: "validation_error",
      message: issue?.message ?? "Invalid request",
      field: String(issue?.path[0] ?? ""),
    },
  });
}

router.post("/listening/start", requireAuth, async (req, res) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) { validationError(parsed.error.issues[0], res); return; }
  const { story_id } = parsed.data;
  const userId = req.auth!.sub;
  const childId = req.auth!.child_id;

  if (!childId) {
    res.status(400).json({
      error: { code: "NO_CHILD", message: "No child profile set up. Please create a child profile first." },
    });
    return;
  }

  const [story] = await db
    .select({ id: storiesTable.id })
    .from(storiesTable)
    .where(and(eq(storiesTable.id, story_id), eq(storiesTable.isActive, true)))
    .limit(1);

  if (!story) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Story not found" } });
    return;
  }

  try {
    const [event] = await db
      .insert(listeningEventsTable)
      .values({ childId, userId, storyId: story_id })
      .returning({ id: listeningEventsTable.id });

    res.status(201).json({ event_id: event!.id });
  } catch (err) {
    req.log.error(err, "Failed to start listening event");
    res.status(500).json({ error: { code: "INTERNAL", message: "Internal server error" } });
  }
});

router.patch("/listening/:event_id/progress", requireAuth, async (req, res) => {
  const eventId = Number(req.params["event_id"]);
  if (!Number.isFinite(eventId) || eventId <= 0) {
    res.status(400).json({
      error: { code: "validation_error", message: "Invalid event_id", field: "event_id" },
    });
    return;
  }

  const parsed = progressSchema.safeParse(req.body);
  if (!parsed.success) { validationError(parsed.error.issues[0], res); return; }
  const { seconds_listened, percent_completed, completed } = parsed.data;
  const userId = req.auth!.sub;

  const [event] = await db
    .select()
    .from(listeningEventsTable)
    .where(and(eq(listeningEventsTable.id, eventId), eq(listeningEventsTable.userId, userId)))
    .limit(1);

  if (!event) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Listening event not found" } });
    return;
  }

  const updates: Record<string, unknown> = {
    secondsListened: seconds_listened,
    percentCompleted: percent_completed,
    completed,
  };

  if (completed && !event.endedAt) {
    updates["endedAt"] = new Date();
    await db
      .update(storiesTable)
      .set({ playCount: sql`${storiesTable.playCount} + 1` })
      .where(eq(storiesTable.id, event.storyId));
  }

  await db
    .update(listeningEventsTable)
    .set(updates as any)
    .where(eq(listeningEventsTable.id, eventId));

  res.json({ ok: true });
});

export default router;
