import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const flashcardSetsTable = pgTable("flashcard_sets", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  emoji: text("emoji").notNull().default("📚"),
  color: text("color").notNull().default("#6C5CE7"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const flashcardsTable = pgTable("flashcards", {
  id: text("id").primaryKey(),
  setId: text("set_id")
    .notNull()
    .references(() => flashcardSetsTable.id, { onDelete: "cascade" }),
  word: text("word").notNull(),
  emoji: text("emoji").notNull().default("❓"),
  color: text("color").notNull().default("#E17055"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFlashcardSetSchema = createInsertSchema(flashcardSetsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertFlashcardSchema = createInsertSchema(flashcardsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export const updateFlashcardSetSchema = insertFlashcardSetSchema.partial().omit({ id: true });
export const updateFlashcardSchema = insertFlashcardSchema.partial().omit({ id: true });

export type InsertFlashcardSet = z.infer<typeof insertFlashcardSetSchema>;
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type DbFlashcardSet = typeof flashcardSetsTable.$inferSelect;
export type DbFlashcard = typeof flashcardsTable.$inferSelect;
