import {
  boolean,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const otpRequestsTable = pgTable(
  "otp_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    phoneNumber: text("phone_number").notNull(),
    otpHash: text("otp_hash").notNull(),
    attempts: smallint("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    used: boolean("used").notNull().default(false),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("otp_requests_phone_created_idx").on(t.phoneNumber, t.createdAt),
  ],
);

export type DbOtpRequest = typeof otpRequestsTable.$inferSelect;
