import {
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const feedbackTable = pgTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    type: text("type").notNull().default("suggestion"),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("feedback_user_id_idx").on(t.userId),
    index("feedback_created_at_idx").on(t.createdAt),
  ],
);

export type DbFeedback = typeof feedbackTable.$inferSelect;
