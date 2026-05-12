import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { childrenTable } from "./children";
import { storiesTable } from "./stories";

export const dailyPicksTable = pgTable(
  "daily_picks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    childId: uuid("child_id")
      .notNull()
      .references(() => childrenTable.id, { onDelete: "cascade" }),
    storyId: text("story_id")
      .notNull()
      .references(() => storiesTable.id),
    pickDate: date("pick_date").notNull(),
    pushSentAt: timestamp("push_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("daily_picks_child_date_idx").on(t.childId, t.pickDate),
    index("daily_picks_child_date_desc_idx").on(t.childId, t.pickDate),
  ],
);

export type DbDailyPick = typeof dailyPicksTable.$inferSelect;
