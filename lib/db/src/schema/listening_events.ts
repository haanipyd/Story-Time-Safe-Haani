import {
  bigserial,
  boolean,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { childrenTable } from "./children";
import { usersTable } from "./users";
import { storiesTable } from "./stories";

export const listeningEventsTable = pgTable(
  "listening_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    childId: uuid("child_id")
      .notNull()
      .references(() => childrenTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    storyId: text("story_id")
      .notNull()
      .references(() => storiesTable.id),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    secondsListened: integer("seconds_listened").notNull().default(0),
    percentCompleted: smallint("percent_completed").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
  },
  (t) => [
    index("listening_events_child_started_idx").on(t.childId, t.startedAt),
    index("listening_events_story_id_idx").on(t.storyId),
  ],
);

export type DbListeningEvent = typeof listeningEventsTable.$inferSelect;
