import { Router, type IRouter } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db, subscriptionsTable, paymentEventsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

const ANNUAL_AMOUNT_PAISE = 59900;
const TRIAL_AMOUNT_PAISE = 200;
const TRIAL_DAYS = 7;

function getRazorpay() {
  const key_id = process.env["RAZORPAY_KEY_ID"];
  const key_secret = process.env["RAZORPAY_KEY_SECRET"];
  if (!key_id || !key_secret) throw new Error("Razorpay keys not configured");
  return new Razorpay({ key_id, key_secret });
}

function generateId(): string {
  return crypto.randomUUID();
}

function rzpAuth(): string {
  const key_id = process.env["RAZORPAY_KEY_ID"] ?? "";
  const key_secret = process.env["RAZORPAY_KEY_SECRET"] ?? "";
  return "Basic " + Buffer.from(`${key_id}:${key_secret}`).toString("base64");
}

async function getOrCreateRazorpayPlan(): Promise<string> {
  const planId = process.env["RAZORPAY_PLAN_ID"];
  if (planId) return planId;

  const rzp = getRazorpay();
  const plan = await (rzp.plans.create({
    period: "yearly",
    interval: 1,
    item: {
      name: "StoryLamp Annual",
      amount: ANNUAL_AMOUNT_PAISE,
      currency: "INR",
      description: "Unlimited stories for kids",
    },
  }) as unknown as Promise<{ id: string }>);
  return plan.id;
}

router.get("/subscription/me", requireAuth, async (req, res) => {
  const userId = req.auth!.sub;
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .orderBy(desc(subscriptionsTable.createdAt))
    .limit(1);

  if (!sub) {
    res.json({ state: "free", plan: null, trial_ends_at: null, current_period_end: null });
    return;
  }

  res.json({
    state: sub.state,
    plan: sub.plan,
    trial_ends_at: sub.trialEndsAt?.toISOString() ?? null,
    trial_started_at: sub.trialStartedAt?.toISOString() ?? null,
    current_period_start: sub.currentPeriodStart?.toISOString() ?? null,
    current_period_end: sub.currentPeriodEnd?.toISOString() ?? null,
    razorpay_subscription_id: sub.razorpaySubscriptionId ?? null,
    cancelled_at: sub.cancelledAt?.toISOString() ?? null,
  });
});

router.post("/subscription/create", requireAuth, async (req, res) => {
  const schema = z.object({ plan: z.literal("annual") });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "plan must be 'annual'" } });
    return;
  }
  const userId = req.auth!.sub;

  try {
    const planId = await getOrCreateRazorpayPlan();
    const rzp = getRazorpay();

    const trialStartAt = Math.floor(Date.now() / 1000);
    const trialEndAt = trialStartAt + TRIAL_DAYS * 24 * 3600;

    const rzpSub = await (rzp.subscriptions.create({
      plan_id: planId,
      total_count: 12,
      quantity: 1,
      customer_notify: 1,
      start_at: trialEndAt,
      addons: [
        {
          item: {
            name: "7-day trial",
            amount: TRIAL_AMOUNT_PAISE,
            currency: "INR",
          },
        },
      ],
      notes: { userId, plan: "annual" },
    }) as unknown as Promise<{ id: string; short_url: string }>);

    const subId = generateId();
    await db.insert(subscriptionsTable).values({
      id: subId,
      userId,
      state: "free",
      plan: "annual",
      razorpaySubscriptionId: rzpSub.id,
    });

    req.log.info({ userId, rzpSubId: rzpSub.id }, "Razorpay subscription created");

    res.json({
      subscription_id: subId,
      razorpay_subscription_id: rzpSub.id,
      short_url: rzpSub.short_url,
    });
  } catch (err) {
    req.log.error(err, "Failed to create Razorpay subscription");
    res.status(500).json({ error: { code: "PAYMENT_ERROR", message: "Could not create subscription. Please try again." } });
  }
});

router.post("/subscription/cancel", requireAuth, async (req, res) => {
  const userId = req.auth!.sub;
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .orderBy(desc(subscriptionsTable.createdAt))
    .limit(1);

  if (!sub || !sub.razorpaySubscriptionId) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "No active subscription found" } });
    return;
  }

  try {
    const auth = rzpAuth();
    const cancelRes = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${sub.razorpaySubscriptionId}/cancel`,
      { method: "POST", headers: { Authorization: auth } },
    );

    if (!cancelRes.ok) {
      let detail = "";
      try {
        const body = await cancelRes.json() as { error?: { description?: string } };
        detail = body?.error?.description ?? "";
      } catch {
        detail = await cancelRes.text().catch(() => "");
      }
      req.log.error({ status: cancelRes.status, detail }, "Razorpay cancel API error");
      res.status(502).json({
        error: {
          code: "PAYMENT_ERROR",
          message: detail || "Razorpay could not cancel the subscription. Please try again.",
        },
      });
      return;
    }

    await db
      .update(subscriptionsTable)
      .set({ state: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(subscriptionsTable.id, sub.id));

    req.log.info({ userId, subId: sub.id }, "Subscription cancelled");
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Failed to cancel subscription");
    res.status(500).json({ error: { code: "PAYMENT_ERROR", message: "Could not cancel subscription. Please try again." } });
  }
});

router.get("/subscriptions/status", requireAuth, async (req, res) => {
  const userId = req.auth!.sub;
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .orderBy(desc(subscriptionsTable.createdAt))
    .limit(1);

  if (!sub) {
    res.json({ active: false, plan: null, currentPeriodEnd: null, status: "free" });
    return;
  }

  const activeStates = ["trial", "active"];
  const isActive = activeStates.includes(sub.state);
  res.json({
    active: isActive,
    plan: sub.plan,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    status: sub.state,
    state: sub.state,
  });
});

export default router;
