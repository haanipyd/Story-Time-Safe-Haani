import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const refreshTokensTable = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").unique().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revoked: boolean("revoked").notNull().default(false),
    deviceInfo: text("device_info"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("refresh_tokens_user_id_idx").on(t.userId),
    index("refresh_tokens_token_hash_idx").on(t.tokenHash),
  ],
);

export type DbRefreshToken = typeof refreshTokensTable.$inferSelect;
