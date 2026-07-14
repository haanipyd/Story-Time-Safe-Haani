import { Router, type IRouter } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db, subscriptionsTable, paymentEventsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

const MONTHLY_AMOUNT_PAISE = 14900;  // ₹149/month
const ANNUAL_AMOUNT_PAISE = 99900;   // ₹999/year
const TRIAL_AMOUNT_PAISE = 100;      // ₹1 trial
const TRIAL_DAYS = 1;                // 1-day trial

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

async function getOrCreateMonthlyPlan(): Promise<string> {
  const planId = process.env["RAZORPAY_MONTHLY_PLAN_ID"];
  if (planId) return planId;

  const rzp = getRazorpay();
  const plan = await (rzp.plans.create({
    period: "monthly",
    interval: 1,
    item: {
      name: "StoryLamp Monthly",
      amount: MONTHLY_AMOUNT_PAISE,
      currency: "INR",
      description: "Unlimited stories for kids",
    },
  }) as unknown as Promise<{ id: string }>);
  return plan.id;
}

async function getOrCreateAnnualPlan(): Promise<string> {
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
  const schema = z.object({ plan: z.enum(["monthly", "annual"]).default("annual") });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "plan must be 'monthly' or 'annual'" } });
    return;
  }
  const userId = req.auth!.sub;
  const selectedPlan = parsed.data.plan;

  // Generate a unique event ID for Meta deduplication between CAPI (fired from
  // the webhook) and the client SDK event (fired after payment confirmation).
  const metaEventId = crypto.randomUUID();

  try {
    const planId = selectedPlan === "monthly"
      ? await getOrCreateMonthlyPlan()
      : await getOrCreateAnnualPlan();

    const rzp = getRazorpay();

    const trialStartAt = Math.floor(Date.now() / 1000);
    const trialEndAt = trialStartAt + TRIAL_DAYS * 24 * 3600;

    const totalCount = selectedPlan === "monthly" ? 12 : 1;

    const rzpSub = await (rzp.subscriptions.create({
      plan_id: planId,
      total_count: totalCount,
      quantity: 1,
      customer_notify: 1,
      start_at: trialEndAt,
      addons: [
        {
          item: {
            name: "1-day trial",
            amount: TRIAL_AMOUNT_PAISE,
            currency: "INR",
          },
        },
      ],
      // Store meta_event_id in notes so the webhook handler can use it when
      // firing the CAPI Purchase/StartTrial event, enabling deduplication.
      notes: { userId, plan: selectedPlan, meta_event_id: metaEventId },
    }) as unknown as Promise<{ id: string; short_url: string }>);

    const subId = generateId();
    await db.insert(subscriptionsTable).values({
      id: subId,
      userId,
      state: "free",
      plan: selectedPlan,
      razorpaySubscriptionId: rzpSub.id,
    });

    req.log.info({ userId, rzpSubId: rzpSub.id, plan: selectedPlan }, "Razorpay subscription created");

    res.json({
      subscription_id: subId,
      razorpay_subscription_id: rzpSub.id,
      short_url: rzpSub.short_url,
      // Returned to the client so the mobile SDK can fire the matching event
      // with the same ID, enabling server↔client deduplication in Meta.
      meta_event_id: metaEventId,
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
