import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db, paymentEventsTable, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function verifyRazorpaySignature(body: Buffer, signature: string): boolean {
  const secret = process.env["RAZORPAY_WEBHOOK_SECRET"];
  if (!secret) {
    req_log?.warn("RAZORPAY_WEBHOOK_SECRET not set — skipping signature verification (dev mode)");
    return true;
  }
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

let req_log: any = null;

router.post(
  "/webhooks/razorpay",
  (req, _res, next) => {
    req_log = req.log;
    next();
  },
  async (req, res) => {
    const signature = req.headers["x-razorpay-signature"] as string | undefined;
    const rawBody: Buffer = (req as any).rawBody ?? Buffer.from(JSON.stringify(req.body));

    if (signature && !verifyRazorpaySignature(rawBody, signature)) {
      req.log.warn("Razorpay webhook signature mismatch");
      res.status(400).json({ error: "Invalid signature" });
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
    const razorpayEventId = (req.headers["x-razorpay-event-id"] as string | undefined) ?? null;

    const subEntity = payload.payload?.subscription?.entity;
    const payEntity = payload.payload?.payment?.entity;

    const rzpSubId = subEntity?.id ?? payEntity?.subscription_id ?? null;

    let dbSubId: string | null = null;
    if (rzpSubId) {
      const [sub] = await db
        .select({ id: subscriptionsTable.id, userId: subscriptionsTable.userId })
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.razorpaySubscriptionId, rzpSubId))
        .limit(1);
      dbSubId = sub?.id ?? null;

      if (sub) {
        await processSubscriptionEvent(eventType, sub.id, sub.userId, subEntity, payEntity, req.log);
      }
    }

    if (razorpayEventId) {
      const [existing] = await db
        .select({ id: paymentEventsTable.id })
        .from(paymentEventsTable)
        .where(eq(paymentEventsTable.razorpayEventId, razorpayEventId))
        .limit(1);

      if (!existing) {
        await db.insert(paymentEventsTable).values({
          subscriptionId: dbSubId,
          eventType,
          razorpayEventId,
          amountPaise: payEntity?.amount ?? null,
          rawPayload: payload,
        });
      }
    }

    res.status(200).json({ ok: true });
  },
);

async function processSubscriptionEvent(
  eventType: string,
  subId: string,
  _userId: string,
  subEntity: any,
  _payEntity: any,
  log: any,
): Promise<void> {
  try {
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
        log.warn({ subId }, "Payment failed for subscription");
        return;
      default:
        log.info({ eventType, subId }, "Unhandled Razorpay event");
        return;
    }

    await db
      .update(subscriptionsTable)
      .set(updates as any)
      .where(eq(subscriptionsTable.id, subId));

    log.info({ eventType, subId }, "Subscription state updated via webhook");
  } catch (err) {
    log.error(err, "Failed to process subscription webhook event");
  }
}

export default router;
