import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    phoneNumber: text("phone_number").unique().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    currentChildId: text("current_child_id"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
  },
  (t) => [index("users_phone_number_idx").on(t.phoneNumber)],
);

export type DbUser = typeof usersTable.$inferSelect;
