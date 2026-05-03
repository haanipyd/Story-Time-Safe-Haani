import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const storiesTable = pgTable("stories", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  duration: integer("duration").notNull(),
  ageMin: integer("age_min").notNull(),
  ageMax: integer("age_max").notNull(),
  description: text("description").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  audioUrl: text("audio_url"),
  videoUrl: text("video_url"),
  published: boolean("published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStorySchema = createInsertSchema(storiesTable).omit({
  createdAt: true,
  updatedAt: true,
});

export const updateStorySchema = insertStorySchema.partial().omit({ id: true });

export type InsertStory = z.infer<typeof insertStorySchema>;
export type UpdateStory = z.infer<typeof updateStorySchema>;
export type DbStory = typeof storiesTable.$inferSelect;
