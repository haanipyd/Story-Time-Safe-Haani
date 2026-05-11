import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const otpCodesTable = pgTable("otp_codes", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DbOtpCode = typeof otpCodesTable.$inferSelect;
