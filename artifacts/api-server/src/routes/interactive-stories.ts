import { Router, type IRouter } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  db,
  interactiveStoriesTable,
  storySegmentsTable,
  storyOptionsTable,
} from "@workspace/db";
import { requireAdminAuth } from "../middleware/auth";
import { z } from "zod/v4";

const router: IRouter = Router();

// ── Public: list all published interactive stories ──────────────────────────

router.get("/interactive-stories", async (req, res) => {
  try {
    const stories = await db
      .select()
      .from(interactiveStoriesTable)
      .where(eq(interactiveStoriesTable.published, true))
      .orderBy(asc(interactiveStoriesTable.createdAt));
    res.json(stories);
  } catch (err) {
    req.log.error(err, "Failed to list interactive stories");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Public: get full story tree (segments + options) ─────────────────────────

router.get("/interactive-stories/:id", async (req, res) => {
  const storyId = String(req.params["id"]);
  try {
    const [story] = await db
      .select()
      .from(interactiveStoriesTable)
      .where(
        and(
          eq(interactiveStoriesTable.id, storyId),
          eq(interactiveStoriesTable.published, true),
        ),
      )
      .limit(1);

    if (!story) {
      res.status(404).json({ error: "Interactive story not found" });
      return;
    }

    const segments = await db
      .select()
      .from(storySegmentsTable)
      .where(eq(storySegmentsTable.storyId, storyId))
      .orderBy(asc(storySegmentsTable.orderIndex));

    const segmentIds = segments.map((s) => s.id);
    const options =
      segmentIds.length > 0
        ? await db
            .select()
            .from(storyOptionsTable)
            .where(inArray(storyOptionsTable.segmentId, segmentIds))
            .orderBy(asc(storyOptionsTable.displayOrder))
        : [];

    const optionsBySegment = options.reduce<
      Record<string, typeof storyOptionsTable.$inferSelect[]>
    >((acc, opt) => {
      if (!acc[opt.segmentId]) acc[opt.segmentId] = [];
      acc[opt.segmentId]!.push(opt);
      return acc;
    }, {});

    const segmentsWithOptions = segments.map((seg) => ({
      ...seg,
      options: optionsBySegment[seg.id] ?? [],
    }));

    res.json({ ...story, segments: segmentsWithOptions });
  } catch (err) {
    req.log.error(err, "Failed to get interactive story");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Schemas ──────────────────────────────────────────────────────────────────

const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(40),
  emoji: z.string().max(10).default(""),
  imageUrl: z.string().default(""),
  isCorrect: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
});

const segmentSchema = z.object({
  id: z.string().min(1),
  orderIndex: z.number().int().min(0),
  type: z.enum(["narration", "checkpoint"]),
  audioUrl: z.string().default(""),
  sceneImageUrl: z.string().default(""),
  questionText: z.string().default(""),
  options: z.array(optionSchema).default([]),
});

const interactiveStoryBodySchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().min(1).max(120),
  language: z.enum(["en", "ml"]).default("en"),
  description: z.string().max(500).default(""),
  thumbnailUrl: z.string().default(""),
  ageMin: z.number().int().min(1).max(5).default(2),
  ageMax: z.number().int().min(1).max(5).default(5),
  published: z.boolean().default(false),
  segments: z.array(segmentSchema).default([]),
});

const updateInteractiveStoryBodySchema = interactiveStoryBodySchema.partial().omit({ id: true }).extend({
  segments: z.array(segmentSchema).optional(),
});

// ── Admin: create ─────────────────────────────────────────────────────────────

router.post("/admin/interactive-stories", requireAdminAuth, async (req, res) => {
  const parsed = interactiveStoryBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
    return;
  }
  const { segments, ...storyData } = parsed.data;
  try {
    await db.transaction(async (tx) => {
      await tx.insert(interactiveStoriesTable).values(storyData);
      for (const seg of segments) {
        const { options, ...segData } = seg;
        await tx.insert(storySegmentsTable).values({ ...segData, storyId: storyData.id });
        for (const opt of options) {
          await tx.insert(storyOptionsTable).values({ ...opt, segmentId: seg.id });
        }
      }
    });
    const [story] = await db
      .select()
      .from(interactiveStoriesTable)
      .where(eq(interactiveStoriesTable.id, storyData.id));
    res.status(201).json(story);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("duplicate key")) {
      res.status(400).json({ error: "A story with this ID already exists" });
      return;
    }
    req.log.error(err, "Failed to create interactive story");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: update (replaces segments entirely) ────────────────────────────────

router.put("/admin/interactive-stories/:id", requireAdminAuth, async (req, res) => {
  const storyId = String(req.params["id"]);
  const parsed = updateInteractiveStoryBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
    return;
  }
  const { segments, ...storyData } = parsed.data;
  try {
    const [updated] = await db.transaction(async (tx) => {
      const rows = await tx
        .update(interactiveStoriesTable)
        .set({ ...storyData, updatedAt: new Date() })
        .where(eq(interactiveStoriesTable.id, storyId))
        .returning();
      if (!rows[0]) return [];

      if (segments !== undefined) {
        // Replace all segments and options for this story
        await tx
          .delete(storySegmentsTable)
          .where(eq(storySegmentsTable.storyId, storyId));
        for (const seg of segments) {
          const { options, ...segData } = seg;
          await tx.insert(storySegmentsTable).values({ ...segData, storyId });
          for (const opt of options) {
            await tx.insert(storyOptionsTable).values({ ...opt, segmentId: seg.id });
          }
        }
      }
      return rows;
    });
    if (!updated) {
      res.status(404).json({ error: "Interactive story not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error(err, "Failed to update interactive story");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: delete ─────────────────────────────────────────────────────────────

router.delete("/admin/interactive-stories/:id", requireAdminAuth, async (req, res) => {
  const storyId = String(req.params["id"]);
  const [deleted] = await db
    .delete(interactiveStoriesTable)
    .where(eq(interactiveStoriesTable.id, storyId))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Interactive story not found" });
    return;
  }
  res.status(204).send();
});

export default router;
