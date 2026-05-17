import { Router, type IRouter } from "express";
import { db, flashcardSetsTable, flashcardsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdminAuth } from "../middleware/auth";

const router: IRouter = Router();

router.get("/api/flashcards/sets", async (req, res) => {
  try {
    const sets = await db
      .select()
      .from(flashcardSetsTable)
      .where(eq(flashcardSetsTable.isActive, true))
      .orderBy(asc(flashcardSetsTable.displayOrder));
    res.json({ sets });
  } catch (err) {
    req.log.error(err, "Failed to fetch flashcard sets");
    res.status(500).json({ error: "Failed to fetch flashcard sets" });
  }
});

router.get("/api/flashcards/sets/:id/cards", async (req, res) => {
  try {
    const id = String(req.params['id'] ?? '');
    const [set] = await db
      .select()
      .from(flashcardSetsTable)
      .where(eq(flashcardSetsTable.id, id))
      .limit(1);
    if (!set) {
      res.status(404).json({ error: "Set not found" });
      return;
    }
    const cards = await db
      .select()
      .from(flashcardsTable)
      .where(eq(flashcardsTable.setId, id))
      .orderBy(asc(flashcardsTable.displayOrder));
    res.json({ set, cards });
  } catch (err) {
    req.log.error(err, "Failed to fetch flashcards");
    res.status(500).json({ error: "Failed to fetch flashcards" });
  }
});

router.get("/api/flashcards/all", async (req, res) => {
  try {
    const sets = await db
      .select()
      .from(flashcardSetsTable)
      .where(eq(flashcardSetsTable.isActive, true))
      .orderBy(asc(flashcardSetsTable.displayOrder));
    const cards = await db
      .select()
      .from(flashcardsTable)
      .where(eq(flashcardsTable.isActive, true))
      .orderBy(asc(flashcardsTable.displayOrder));
    res.json({ sets, cards });
  } catch (err) {
    req.log.error(err, "Failed to fetch all flashcards");
    res.status(500).json({ error: "Failed to fetch all flashcard data" });
  }
});

router.post("/api/flashcards/sets", requireAdminAuth, async (req, res) => {
  try {
    const { id, title, emoji, color, displayOrder } = req.body as Record<string, string>;
    if (!id || !title) {
      res.status(400).json({ error: "id and title are required" });
      return;
    }
    const [created] = await db
      .insert(flashcardSetsTable)
      .values({
        id: String(id).trim().toLowerCase().replace(/\s+/g, "-"),
        title: String(title).trim(),
        emoji: String(emoji ?? "📚"),
        color: String(color ?? "#6C5CE7"),
        displayOrder: parseInt(String(displayOrder ?? "0"), 10),
        isActive: true,
      })
      .returning();
    res.status(201).json({ set: created });
  } catch (err) {
    req.log.error(err, "Failed to create flashcard set");
    res.status(500).json({ error: "Failed to create flashcard set" });
  }
});

router.put("/api/flashcards/sets/:id", requireAdminAuth, async (req, res) => {
  try {
    const id = String(req.params['id'] ?? '');
    const { title, emoji, color, displayOrder, isActive } = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = String(title).trim();
    if (emoji !== undefined) updates.emoji = String(emoji);
    if (color !== undefined) updates.color = String(color);
    if (displayOrder !== undefined) updates.displayOrder = Number(displayOrder);
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    const [updated] = await db
      .update(flashcardSetsTable)
      .set(updates)
      .where(eq(flashcardSetsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Set not found" });
      return;
    }
    res.json({ set: updated });
  } catch (err) {
    req.log.error(err, "Failed to update flashcard set");
    res.status(500).json({ error: "Failed to update flashcard set" });
  }
});

router.delete("/api/flashcards/sets/:id", requireAdminAuth, async (req, res) => {
  try {
    const id = String(req.params['id'] ?? '');
    await db.delete(flashcardSetsTable).where(eq(flashcardSetsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Failed to delete flashcard set");
    res.status(500).json({ error: "Failed to delete flashcard set" });
  }
});

router.post("/api/flashcards/cards", requireAdminAuth, async (req, res) => {
  try {
    const { id, setId, word, emoji, color, displayOrder } = req.body as Record<string, string>;
    if (!id || !setId || !word) {
      res.status(400).json({ error: "id, setId and word are required" });
      return;
    }
    const [created] = await db
      .insert(flashcardsTable)
      .values({
        id: String(id).trim(),
        setId: String(setId).trim(),
        word: String(word).trim(),
        emoji: String(emoji ?? "❓"),
        color: String(color ?? "#E17055"),
        displayOrder: parseInt(String(displayOrder ?? "0"), 10),
        isActive: true,
      })
      .returning();
    res.status(201).json({ card: created });
  } catch (err) {
    req.log.error(err, "Failed to create flashcard");
    res.status(500).json({ error: "Failed to create flashcard" });
  }
});

router.put("/api/flashcards/cards/:id", requireAdminAuth, async (req, res) => {
  try {
    const id = String(req.params['id'] ?? '');
    const { word, emoji, color, displayOrder, isActive, setId } = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (word !== undefined) updates.word = String(word).trim();
    if (emoji !== undefined) updates.emoji = String(emoji);
    if (color !== undefined) updates.color = String(color);
    if (displayOrder !== undefined) updates.displayOrder = Number(displayOrder);
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (setId !== undefined) updates.setId = String(setId);
    const [updated] = await db
      .update(flashcardsTable)
      .set(updates)
      .where(eq(flashcardsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Card not found" });
      return;
    }
    res.json({ card: updated });
  } catch (err) {
    req.log.error(err, "Failed to update flashcard");
    res.status(500).json({ error: "Failed to update flashcard" });
  }
});

router.delete("/api/flashcards/cards/:id", requireAdminAuth, async (req, res) => {
  try {
    const id = String(req.params['id'] ?? '');
    await db.delete(flashcardsTable).where(eq(flashcardsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Failed to delete flashcard");
    res.status(500).json({ error: "Failed to delete flashcard" });
  }
});

export default router;
