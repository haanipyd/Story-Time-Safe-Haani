import {
  boolean,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const storiesTable = pgTable(
  "stories",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    durationMin: smallint("duration_min").notNull(),
    ageMin: smallint("age_min").notNull(),
    ageMax: smallint("age_max").notNull(),
    description: text("description").notNull(),
    audioUrl: text("audio_url").notNull().default(""),
    thumbnailUrl: text("thumbnail_url").notNull().default(""),
    isFree: boolean("is_free").notNull().default(false),
    playCount: integer("play_count").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [
    index("stories_category_is_active_idx").on(t.category, t.isActive),
    index("stories_is_free_is_active_idx").on(t.isFree, t.isActive),
  ],
);

export const insertStorySchema = createInsertSchema(storiesTable).omit({
  publishedAt: true,
  playCount: true,
});

export const updateStorySchema = insertStorySchema.partial().omit({ id: true });

export type InsertStory = z.infer<typeof insertStorySchema>;
export type UpdateStory = z.infer<typeof updateStorySchema>;
export type DbStory = typeof storiesTable.$inferSelect;
