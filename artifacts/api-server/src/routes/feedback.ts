import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import crypto from "crypto";
import { db, feedbackTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { requireAdminAuth } from "../middleware/auth";

const router: IRouter = Router();

const feedbackSchema = z.object({
  type: z.enum(["suggestion", "feature", "bug", "other"]).default("suggestion"),
  message: z.string().min(5).max(2000),
});

router.post("/feedback", async (req, res) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "Message must be 5–2000 characters." } });
    return;
  }

  const userId = req.auth?.sub ?? null;

  await db.insert(feedbackTable).values({
    id: crypto.randomUUID(),
    userId,
    type: parsed.data.type,
    message: parsed.data.message,
  });

  req.log.info({ userId, type: parsed.data.type }, "Feedback submitted");
  res.status(201).json({ ok: true });
});

router.get("/admin/feedback", requireAdminAuth, async (req, res) => {
  const rows = await db
    .select()
    .from(feedbackTable)
    .orderBy(desc(feedbackTable.createdAt))
    .limit(200);
  res.json(rows);
});

export default router;
