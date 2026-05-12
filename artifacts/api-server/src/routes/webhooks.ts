import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db, paymentEventsTable, subscriptionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function verifyRazorpaySignature(body: Buffer, signature: string): boolean {
  const secret = process.env["RAZORPAY_WEBHOOK_SECRET"];
  if (!secret) {
    logger.warn("RAZORPAY_WEBHOOK_SECRET not set — skipping signature verification (dev mode)");
    return true;
  }
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(signature, "hex"),
  );
}

router.post("/webhooks/razorpay", async (req, res) => {
  const signature = req.headers["x-razorpay-signature"] as string | undefined;
  const rawBody: Buffer = (req as any).rawBody ?? Buffer.from(JSON.stringify(req.body));

  if (signature && !verifyRazorpaySignature(rawBody, signature)) {
    req.log.warn("Razorpay webhook signature mismatch — rejecting");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const payload = req.body as {
    event?: string;
    payload?: {
      subscription?: {
        entity?: {
          id?: string;
          status?: string;
          current_start?: number;
          current_end?: number;
          charge_at?: number;
        };
      };
      payment?: {
        entity?: {
          id?: string;
          amount?: number;
          subscription_id?: string;
        };
      };
    };
  };

  const eventType = payload.event ?? "unknown";
  const razorpayEventId = (req.headers["x-razorpay-event-id"] as string | undefined);

  if (!razorpayEventId) {
    req.log.warn({ eventType }, "Razorpay webhook missing x-razorpay-event-id header");
    res.status(200).json({ ok: true });
    return;
  }

  const subEntity = payload.payload?.subscription?.entity;
  const payEntity = payload.payload?.payment?.entity;
  const rzpSubId = subEntity?.id ?? payEntity?.subscription_id ?? null;

  let dbSubId: string | null = null;
  let dbUserId: string | null = null;

  if (rzpSubId) {
    const [sub] = await db
      .select({ id: subscriptionsTable.id, userId: subscriptionsTable.userId })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.razorpaySubscriptionId, rzpSubId))
      .limit(1);
    dbSubId = sub?.id ?? null;
    dbUserId = sub?.userId ?? null;
  }

  try {
    // Attempt idempotent insert — UNIQUE constraint on razorpay_event_id prevents double processing
    await db.insert(paymentEventsTable).values({
      userId: dbUserId,
      subscriptionId: dbSubId,
      eventType,
      razorpayEventId,
      razorpayPaymentId: payEntity?.id ?? null,
      razorpaySubscriptionId: rzpSubId,
      amountPaise: payEntity?.amount ?? null,
      rawPayload: payload,
      processingStatus: "success",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isDuplicate =
      msg.includes("duplicate key") || msg.includes("unique constraint");

    if (isDuplicate) {
      // Mark existing row as skipped_duplicate — idempotency achieved
      await db
        .update(paymentEventsTable)
        .set({ processingStatus: "skipped_duplicate" })
        .where(eq(paymentEventsTable.razorpayEventId, razorpayEventId));
      req.log.info({ razorpayEventId, eventType }, "Duplicate webhook event skipped");
      res.status(200).json({ ok: true });
      return;
    }

    // Unknown insert error — record as failed, still return 200
    req.log.error(err, "Failed to insert payment_event row");
    res.status(200).json({ ok: true });
    return;
  }

  // Process subscription state change
  if (dbSubId) {
    try {
      await processSubscriptionEvent(eventType, dbSubId, subEntity, payEntity, req.log);
    } catch (err) {
      // Update the already-inserted row to reflect processing failure
      await db
        .update(paymentEventsTable)
        .set({
          processingStatus: "failed",
          errorMessage: err instanceof Error ? err.stack ?? err.message : String(err),
        })
        .where(
          sql`razorpay_event_id = ${razorpayEventId}`,
        );
      req.log.error(err, "Webhook subscription state processing failed");
    }
  }

  res.status(200).json({ ok: true });
});

async function processSubscriptionEvent(
  eventType: string,
  subId: string,
  subEntity: {
    id?: string;
    status?: string;
    current_start?: number;
    current_end?: number;
    charge_at?: number;
  } | undefined,
  _payEntity: { id?: string; amount?: number; subscription_id?: string } | undefined,
  log: typeof logger,
): Promise<void> {
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  switch (eventType) {
    case "subscription.activated": {
      const trialEndsAt = subEntity?.charge_at
        ? new Date(subEntity.charge_at * 1000)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      updates["state"] = "trial";
      updates["trialStartedAt"] = new Date();
      updates["trialEndsAt"] = trialEndsAt;
      break;
    }
    case "subscription.charged": {
      const start = subEntity?.current_start ? new Date(subEntity.current_start * 1000) : new Date();
      const end = subEntity?.current_end ? new Date(subEntity.current_end * 1000) : null;
      updates["state"] = "active";
      updates["currentPeriodStart"] = start;
      if (end) updates["currentPeriodEnd"] = end;
      break;
    }
    case "subscription.completed":
      updates["state"] = "expired";
      break;
    case "subscription.cancelled":
      updates["state"] = "cancelled";
      updates["cancelledAt"] = new Date();
      break;
    case "payment.failed":
      log.warn({ subId }, "Payment failed for subscription — Razorpay will retry");
      return;
    default:
      log.info({ eventType, subId }, "Unhandled Razorpay event — no state change");
      return;
  }

  await db
    .update(subscriptionsTable)
    .set(updates as any)
    .where(eq(subscriptionsTable.id, subId));

  log.info({ eventType, subId }, "Subscription state updated via webhook");
}

export default router;
