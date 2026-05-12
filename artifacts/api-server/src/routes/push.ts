import { Router, type IRouter } from "express";
import { db, pushTokensTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

const registerSchema = z
  .object({
    fcm_token: z.string().min(1, "fcm_token is required").max(4096, "fcm_token too long"),
    platform: z.enum(["android", "ios"]),
  })
  .strict();

const unregisterSchema = z
  .object({
    fcm_token: z.string().min(1, "fcm_token is required").max(4096),
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

router.post("/push/register", requireAuth, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) { validationError(parsed.error.issues[0], res); return; }
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
  const parsed = unregisterSchema.safeParse(req.body);
  if (!parsed.success) { validationError(parsed.error.issues[0], res); return; }
  const userId = req.auth!.sub;
  const { fcm_token } = parsed.data;

  await db
    .update(pushTokensTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(pushTokensTable.userId, userId), eq(pushTokensTable.fcmToken, fcm_token)));

  res.json({ ok: true });
});

export default router;
