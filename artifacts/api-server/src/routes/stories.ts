import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, storiesTable } from "@workspace/db";
import {
  CreateStoryBody,
  UpdateStoryBody,
  UpdateStoryParams,
  GetStoryParams,
  DeleteStoryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stories", async (req, res) => {
  try {
    const stories = await db
      .select()
      .from(storiesTable)
      .where(eq(storiesTable.published, true))
      .orderBy(storiesTable.createdAt);
    res.json(stories);
  } catch (err) {
    req.log.error(err, "Failed to list stories");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/stories", async (req, res) => {
  const parsed = CreateStoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [story] = await db
      .insert(storiesTable)
      .values({
        ...parsed.data,
        published: parsed.data.published ?? true,
      })
      .returning();
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

router.get("/stories/:id", async (req, res) => {
  const { id } = GetStoryParams.parse(req.params);
  const [story] = await db
    .select()
    .from(storiesTable)
    .where(eq(storiesTable.id, id));
  if (!story) {
    res.status(404).json({ error: "Story not found" });
    return;
  }
  res.json(story);
});

router.put("/stories/:id", async (req, res) => {
  const { id } = UpdateStoryParams.parse(req.params);
  const parsed = UpdateStoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [story] = await db
      .update(storiesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(storiesTable.id, id))
      .returning();
    if (!story) {
      res.status(404).json({ error: "Story not found" });
      return;
    }
    res.json(story);
  } catch (err) {
    req.log.error(err, "Failed to update story");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/stories/:id", async (req, res) => {
  const { id } = DeleteStoryParams.parse(req.params);
  const [story] = await db
    .delete(storiesTable)
    .where(eq(storiesTable.id, id))
    .returning();
  if (!story) {
    res.status(404).json({ error: "Story not found" });
    return;
  }
  res.status(204).send();
});

export default router;
