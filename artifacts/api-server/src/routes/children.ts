import { Router, type IRouter } from "express";
import { db, childrenTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

const VALID_CATEGORIES = [
  "bedtime", "adventure", "animal", "songs", "mythology",
  "learning", "yoga", "nature", "funny", "classic",
] as const;

const NAME_REGEX = /^[^<>'"&]+$/;

const childCreateSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(50, "Name must be 50 characters or fewer")
      .regex(NAME_REGEX, "Name contains invalid characters"),
    age: z.number().int("Age must be an integer").min(1, "Minimum age is 1").max(5, "Maximum age is 5"),
    preferences: z
      .array(z.enum(VALID_CATEGORIES))
      .min(3, "Please select at least 3 categories")
      .max(10, "Maximum 10 categories"),
  })
  .strict();

const childUpdateSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(50)
      .regex(NAME_REGEX, "Name contains invalid characters")
      .optional(),
    age: z.number().int().min(1).max(5).optional(),
    preferences: z.array(z.enum(VALID_CATEGORIES)).min(3).max(10).optional(),
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

router.post("/children", requireAuth, async (req, res) => {
  const parsed = childCreateSchema.safeParse(req.body);
  if (!parsed.success) { validationError(parsed.error.issues[0], res); return; }
  const userId = req.auth!.sub;
  const { name, age, preferences } = parsed.data;

  try {
    const [child] = await db
      .insert(childrenTable)
      .values({ userId, name, age, preferences })
      .returning();

    await db
      .update(usersTable)
      .set({ currentChildId: child.id })
      .where(eq(usersTable.id, userId));

    res.status(201).json(child);
  } catch (err) {
    req.log.error(err, "Failed to create child");
    res.status(500).json({ error: { code: "INTERNAL", message: "Internal server error" } });
  }
});

router.patch("/children/:id", requireAuth, async (req, res) => {
  const childId = String(req.params["id"]);
  const parsed = childUpdateSchema.safeParse(req.body);
  if (!parsed.success) { validationError(parsed.error.issues[0], res); return; }
  const userId = req.auth!.sub;

  try {
    const [existing] = await db
      .select()
      .from(childrenTable)
      .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Child profile not found" } });
      return;
    }

    const [updated] = await db
      .update(childrenTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error(err, "Failed to update child");
    res.status(500).json({ error: { code: "INTERNAL", message: "Internal server error" } });
  }
});

router.get("/children/me/current", requireAuth, async (req, res) => {
  const userId = req.auth!.sub;
  const childId = req.auth!.child_id;

  if (!childId) {
    res.json(null);
    return;
  }

  const [child] = await db
    .select()
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);

  res.json(child ?? null);
});

export default router;
