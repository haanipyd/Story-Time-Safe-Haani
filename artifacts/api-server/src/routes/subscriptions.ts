import { Router, type IRouter } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db, subscriptionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

function getRazorpay() {
  const key_id = process.env["RAZORPAY_KEY_ID"];
  const key_secret = process.env["RAZORPAY_KEY_SECRET"];
  if (!key_id || !key_secret) throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
  return { client: new Razorpay({ key_id, key_secret }), key_id };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

const PLANS = {
  monthly: { amount: 39900, label: "₹399 / month" },
  yearly: { amount: 299900, label: "₹2,999 / year" },
} as const;

router.get("/subscriptions/status", requireAuth, async (req, res) => {
  try {
    const [sub] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, req.auth!.userId))
      .orderBy(subscriptionsTable.createdAt)
      .limit(1);

    if (!sub || !sub.active) {
      res.json({ active: false, plan: null, currentPeriodEnd: null, status: "inactive" });
      return;
    }

    const expired = sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < new Date();
    if (expired) {
      res.json({ active: false, plan: sub.plan, currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null, status: "expired" });
      return;
    }

    res.json({
      active: true,
      plan: sub.plan,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      status: sub.status,
    });
  } catch (err) {
    req.log.error(err, "Failed to get subscription status");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/subscriptions/create-order", requireAuth, async (req, res) => {
  const schema = z.object({ plan: z.enum(["monthly", "yearly"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "plan must be 'monthly' or 'yearly'" });
    return;
  }
  try {
    const { client, key_id } = getRazorpay();
    const plan = parsed.data.plan;
    const order = await client.orders.create({
      amount: PLANS[plan].amount,
      currency: "INR",
      receipt: `storytime_${req.auth!.userId}_${Date.now()}`,
    });

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: key_id, plan });
  } catch (err) {
    req.log.error(err, "Failed to create Razorpay order");
    res.status(500).json({ error: "Payment service unavailable. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." });
  }
});

const verifySchema = z.object({
  razorpay_payment_id: z.string(),
  razorpay_order_id: z.string(),
  razorpay_signature: z.string(),
  plan: z.enum(["monthly", "yearly"]).optional(),
});

router.post("/subscriptions/verify", requireAuth, async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payment data" });
    return;
  }
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan = "monthly" } = parsed.data;

  const key_secret = process.env["RAZORPAY_KEY_SECRET"];
  if (!key_secret) {
    res.status(500).json({ error: "Payment service not configured" });
    return;
  }

  const expected = crypto
    .createHmac("sha256", key_secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature) {
    res.status(400).json({ error: "Payment signature verification failed" });
    return;
  }

  try {
    const periodEnd = new Date();
    if (plan === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const [existing] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, req.auth!.userId))
      .limit(1);

    if (existing) {
      await db
        .update(subscriptionsTable)
        .set({
          active: true,
          status: "active",
          plan,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          currentPeriodEnd: periodEnd,
          cancelledAt: null,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionsTable.userId, req.auth!.userId));
    } else {
      await db.insert(subscriptionsTable).values({
        id: generateId(),
        userId: req.auth!.userId,
        active: true,
        status: "active",
        plan,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        currentPeriodEnd: periodEnd,
      });
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Failed to save subscription");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/subscriptions/cancel", requireAuth, async (req, res) => {
  try {
    await db
      .update(subscriptionsTable)
      .set({ active: false, status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(subscriptionsTable.userId, req.auth!.userId));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Failed to cancel subscription");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/subscriptions/checkout", async (req, res) => {
  const { orderId, amount, currency = "INR", email, name, keyId, plan = "monthly", token } = req.query as Record<string, string>;

  if (!orderId || !amount || !keyId) {
    res.status(400).send("Missing required parameters");
    return;
  }

  let userId: string | null = null;
  if (token) {
    const { verifyToken } = await import("../middleware/auth");
    const payload = verifyToken(token);
    userId = payload?.userId ?? null;
  }
  const [user] = userId
    ? await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1)
    : [];
  const userEmail = user?.email ?? email ?? "";
  const userName = user?.name ?? name ?? "Parent";

  const planKey = (plan in PLANS ? plan : "monthly") as keyof typeof PLANS;
  const planLabel = PLANS[planKey].label;

  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Storytime Premium</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; background: #FDF6E3; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: white; border-radius: 20px; padding: 32px 24px; max-width: 380px; width: 100%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
    .icon { font-size: 48px; margin-bottom: 12px; }
    h1 { font-size: 22px; color: #2D3E5E; margin-bottom: 8px; }
    p { color: #888; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
    .plan { background: #FDF6E3; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
    .plan-name { font-size: 16px; font-weight: 700; color: #2D3E5E; }
    .plan-price { font-size: 24px; font-weight: 800; color: #E8826B; margin-top: 4px; }
    button { background: #E8826B; color: white; border: none; border-radius: 14px; padding: 16px 32px; font-size: 16px; font-weight: 700; width: 100%; cursor: pointer; }
    button:disabled { opacity: 0.6; }
    .loading { color: #888; font-size: 14px; margin-top: 16px; display: none; }
    .error { color: #e55; font-size: 13px; margin-top: 12px; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⭐</div>
    <h1>Storytime Premium</h1>
    <p>Unlimited stories for your little one — all categories, new stories every week.</p>
    <div class="plan">
      <div class="plan-name">${plan === "yearly" ? "Yearly Plan" : "Monthly Plan"}</div>
      <div class="plan-price">${planLabel}</div>
    </div>
    <button id="payBtn" onclick="startPayment()">Pay Securely with Razorpay</button>
    <div class="loading" id="loading">Processing...</div>
    <div class="error" id="errMsg"></div>
  </div>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    function startPayment() {
      document.getElementById('payBtn').disabled = true;
      document.getElementById('loading').style.display = 'block';
      var options = {
        key: '${keyId}',
        amount: '${amount}',
        currency: '${currency}',
        name: 'Storytime',
        description: 'Premium Subscription - ${planLabel}',
        order_id: '${orderId}',
        prefill: { email: '${userEmail}', name: '${userName}' },
        theme: { color: '#E8826B' },
        handler: function(response) {
          var url = 'storytime://payment-success?paymentId=' + encodeURIComponent(response.razorpay_payment_id) + '&orderId=' + encodeURIComponent(response.razorpay_order_id) + '&signature=' + encodeURIComponent(response.razorpay_signature) + '&plan=${plan}';
          window.location.href = url;
        },
        modal: {
          ondismiss: function() {
            window.location.href = 'storytime://payment-cancelled';
          }
        }
      };
      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function(resp) {
        document.getElementById('payBtn').disabled = false;
        document.getElementById('loading').style.display = 'none';
        document.getElementById('errMsg').style.display = 'block';
        document.getElementById('errMsg').textContent = 'Payment failed: ' + resp.error.description;
      });
      rzp.open();
    }
    window.onload = function() { startPayment(); };
  </script>
</body>
</html>`);
});

export default router;
