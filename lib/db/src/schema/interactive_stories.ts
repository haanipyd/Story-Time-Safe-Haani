import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const segmentTypeEnum = pgEnum("segment_type", ["narration", "checkpoint"]);

export const interactiveStoriesTable = pgTable(
  "interactive_stories",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    language: text("language").notNull().default("en"),
    description: text("description").notNull().default(""),
    thumbnailUrl: text("thumbnail_url").notNull().default(""),
    ageMin: smallint("age_min").notNull().default(2),
    ageMax: smallint("age_max").notNull().default(5),
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("interactive_stories_published_idx").on(t.published),
    index("interactive_stories_language_idx").on(t.language),
  ],
);

export const storySegmentsTable = pgTable(
  "story_segments",
  {
    id: text("id").primaryKey(),
    storyId: text("story_id")
      .notNull()
      .references(() => interactiveStoriesTable.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    type: segmentTypeEnum("type").notNull(),
    audioUrl: text("audio_url").notNull().default(""),
    sceneImageUrl: text("scene_image_url").notNull().default(""),
    questionText: text("question_text").notNull().default(""),
  },
  (t) => [index("story_segments_story_id_idx").on(t.storyId)],
);

export const storyOptionsTable = pgTable(
  "story_options",
  {
    id: text("id").primaryKey(),
    segmentId: text("segment_id")
      .notNull()
      .references(() => storySegmentsTable.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    emoji: text("emoji").notNull().default(""),
    imageUrl: text("image_url").notNull().default(""),
    isCorrect: boolean("is_correct").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
  },
  (t) => [index("story_options_segment_id_idx").on(t.segmentId)],
);

export const insertInteractiveStorySchema = createInsertSchema(interactiveStoriesTable).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertStorySegmentSchema = createInsertSchema(storySegmentsTable);
export const insertStoryOptionSchema = createInsertSchema(storyOptionsTable);

export type DbInteractiveStory = typeof interactiveStoriesTable.$inferSelect;
export type DbStorySegment = typeof storySegmentsTable.$inferSelect;
export type DbStoryOption = typeof storyOptionsTable.$inferSelect;
export type InsertInteractiveStory = z.infer<typeof insertInteractiveStorySchema>;
