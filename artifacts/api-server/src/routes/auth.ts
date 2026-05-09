import { Router, type IRouter } from "express";
import { db, usersTable, otpCodesTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod/v4";
import { signToken, requireAuth } from "../middleware/auth";

const router: IRouter = Router();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, "");
}

function toMsg91Mobile(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

async function sendOtpViaMSG91(phone: string, otp: string): Promise<void> {
  const authKey = process.env["MSG91_AUTH_KEY"];
  const templateId = process.env["MSG91_TEMPLATE_ID"];
  if (!authKey || !templateId) throw new Error("MSG91_AUTH_KEY or MSG91_TEMPLATE_ID not set");

  const mobile = toMsg91Mobile(phone);
  const res = await fetch("https://control.msg91.com/api/v5/otp", {
    method: "POST",
    headers: {
      authkey: authKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ template_id: templateId, mobile, otp }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MSG91 error ${res.status}: ${body}`);
  }
}

const sendOtpSchema = z.object({
  phone: z.string().min(7).max(20),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(7).max(20),
  otp: z.string().length(6),
});

router.post("/auth/send-otp", async (req, res) => {
  const parsed = sendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please provide a valid phone number." });
    return;
  }
  const phone = normalizePhone(parsed.data.phone);
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  try {
    await db.insert(otpCodesTable).values({ id: generateId(), phone, code: otp, expiresAt });

    const authKey = process.env["MSG91_AUTH_KEY"];
    const templateId = process.env["MSG91_TEMPLATE_ID"];

    if (authKey && templateId) {
      await sendOtpViaMSG91(phone, otp);
      req.log.info({ phone }, "OTP sent via MSG91");
      res.json({ ok: true });
    } else {
      req.log.warn({ phone, otp }, "MSG91 not configured — returning OTP in response (dev mode)");
      res.json({ ok: true, devOtp: otp });
    }
  } catch (err) {
    req.log.error(err, "Failed to send OTP");
    res.status(500).json({ error: "Failed to send OTP. Please try again." });
  }
});

router.post("/auth/verify-otp", async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request." });
    return;
  }
  const phone = normalizePhone(parsed.data.phone);
  const { otp } = parsed.data;

  try {
    const now = new Date();
    const [record] = await db
      .select()
      .from(otpCodesTable)
      .where(
        and(
          eq(otpCodesTable.phone, phone),
          eq(otpCodesTable.code, otp),
          eq(otpCodesTable.used, false),
          gt(otpCodesTable.expiresAt, now)
        )
      )
      .orderBy(otpCodesTable.createdAt)
      .limit(1);

    if (!record) {
      res.status(401).json({ error: "Incorrect or expired OTP. Please try again." });
      return;
    }

    await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, record.id));

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, phone))
      .limit(1);

    let user = existing;
    if (!user) {
      const [created] = await db
        .insert(usersTable)
        .values({ id: generateId(), phone, name: "Parent" })
        .returning();
      user = created;
    }

    const token = signToken({ userId: user.id, phone: user.phone! });
    res.json({ token, user: { id: user.id, phone: user.phone, name: user.name } });
  } catch (err) {
    req.log.error(err, "OTP verification failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.auth!.userId))
      .limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ id: user.id, phone: user.phone, name: user.name });
  } catch (err) {
    req.log.error(err, "Get me failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", (_req, res) => {
  res.json({ ok: true });
});

export default router;
