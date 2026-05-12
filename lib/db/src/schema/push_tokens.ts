import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const pushTokensTable = pgTable(
  "push_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    fcmToken: text("fcm_token").notNull(),
    platform: text("platform").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("push_tokens_user_fcm_idx").on(t.userId, t.fcmToken)],
);

export type DbPushToken = typeof pushTokensTable.$inferSelect;
