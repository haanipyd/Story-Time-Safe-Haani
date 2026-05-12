import { Router, type IRouter } from "express";
import { db, pushTokensTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.post("/push/register", requireAuth, async (req, res) => {
  const schema = z.object({
    fcm_token: z.string().min(1),
    platform: z.enum(["android", "ios"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "fcm_token and platform (android|ios) are required" } });
    return;
  }
  const userId = req.auth!.sub;
  const { fcm_token, platform } = parsed.data;

  try {
    await db
      .insert(pushTokensTable)
      .values({ userId, fcmToken: fcm_token, platform, isActive: true })
      .onConflictDoUpdate({
        target: [pushTokensTable.userId, pushTokensTable.fcmToken],
        set: { isActive: true, platform, updatedAt: new Date() },
      });
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Failed to register push token");
    res.status(500).json({ error: { code: "INTERNAL", message: "Internal server error" } });
  }
});

router.post("/push/unregister", requireAuth, async (req, res) => {
  const schema = z.object({ fcm_token: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "fcm_token is required" } });
    return;
  }
  const userId = req.auth!.sub;
  const { fcm_token } = parsed.data;

  await db
    .update(pushTokensTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(pushTokensTable.userId, userId), eq(pushTokensTable.fcmToken, fcm_token)));

  res.json({ ok: true });
});

export default router;
