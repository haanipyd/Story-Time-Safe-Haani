import {
  bigserial,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";
import { subscriptionsTable } from "./subscriptions";

export const paymentEventsTable = pgTable(
  "payment_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    subscriptionId: text("subscription_id").references(
      () => subscriptionsTable.id,
      { onDelete: "set null" },
    ),
    eventType: text("event_type").notNull(),
    razorpayEventId: text("razorpay_event_id").unique().notNull(),
    razorpayPaymentId: text("razorpay_payment_id"),
    razorpaySubscriptionId: text("razorpay_subscription_id"),
    amountPaise: integer("amount_paise"),
    rawPayload: jsonb("raw_payload").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    processingStatus: text("processing_status")
      .notNull()
      .default("success"),
    errorMessage: text("error_message"),
  },
  (t) => [
    index("payment_events_user_id_idx").on(t.userId),
    index("payment_events_subscription_id_idx").on(t.subscriptionId),
    index("payment_events_event_type_idx").on(t.eventType),
    check(
      "payment_events_processing_status_check",
      sql`${t.processingStatus} IN ('success', 'failed', 'skipped_duplicate')`,
    ),
  ],
);

export type DbPaymentEvent = typeof paymentEventsTable.$inferSelect;
