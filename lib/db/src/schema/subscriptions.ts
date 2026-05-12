import {
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const subscriptionsTable = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    state: text("state").notNull().default("free"),
    plan: text("plan").notNull().default("annual"),
    trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    razorpaySubscriptionId: text("razorpay_subscription_id").unique(),
    razorpayCustomerId: text("razorpay_customer_id"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("subscriptions_user_id_idx").on(t.userId),
    index("subscriptions_rzp_sub_idx").on(t.razorpaySubscriptionId),
  ],
);

export type DbSubscription = typeof subscriptionsTable.$inferSelect;
