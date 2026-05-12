import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcryptjs";
import { db, usersTable, otpRequestsTable, refreshTokensTable, subscriptionsTable, childrenTable } from "@workspace/db";
import { eq, and, gt, desc } from "drizzle-orm";
import { z } from "zod/v4";
import {
  signAccessToken,
  requireAuth,
  generateRefreshToken,
  hashToken,
  generateUserId,
} from "../middleware/auth";

const router: IRouter = Router();

const OTP_TTL_MINUTES = 5;
const OTP_BCRYPT_COST = 10;
const MAX_OTP_ATTEMPTS = 5;
const MAX_OTP_PER_PHONE_PER_HOUR = 3;

const phoneSchema = z
  .string()
  .regex(/^\+91[6-9]\d{9}$/, "Phone must be +91 followed by 10 digits starting 6-9");

const requestOtpIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMIT", message: "Too many OTP requests from this IP. Try again later." } },
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMIT", message: "Too many verification attempts. Try again later." } },
});

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function maskPhone(phone: string): string {
  return phone.slice(0, 4) + "****" + phone.slice(-3);
}

function toMsg91Mobile(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

async function sendOtpViaMSG91(phone: string, otp: string): Promise<void> {
  const authKey = process.env["MSG91_AUTH_KEY"]!;
  const templateId = process.env["MSG91_TEMPLATE_ID"]!;
  const mobile = toMsg91Mobile(phone);
  const res = await fetch("https://control.msg91.com/api/v5/otp", {
    method: "POST",
    headers: { authkey: authKey, "Content-Type": "application/json" },
    body: JSON.stringify({ template_id: templateId, mobile, otp }),
  });
  if (!res.ok) throw new Error(`MSG91 error ${res.status}: ${await res.text()}`);
}

async function getSubState(userId: string): Promise<string> {
  const [sub] = await db
    .select({ state: subscriptionsTable.state })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .orderBy(desc(subscriptionsTable.createdAt))
    .limit(1);
  return sub?.state ?? "free";
}

async function issueTokens(
  userId: string,
  phone: string,
  childId: string | null,
  deviceInfo?: string,
): Promise<{ access_token: string; refresh_token: string }> {
  const subState = await getSubState(userId);
  const access_token = signAccessToken({
    sub: userId,
    phone,
    child_id: childId,
    sub_state: subState,
  });
  const rawRefresh = generateRefreshToken();
  const tokenHash = hashToken(rawRefresh);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(refreshTokensTable).values({
    userId,
    tokenHash,
    expiresAt,
    deviceInfo: deviceInfo ?? null,
  });
  return { access_token, refresh_token: rawRefresh };
}

const requestOtpSchema = z.object({
  phone_number: phoneSchema.optional(),
  phone: phoneSchema.optional(),
});

async function handleRequestOtp(req: any, res: any): Promise<void> {
  const parsed = requestOtpSchema.safeParse(req.body);
  const phone = parsed.success ? (parsed.data.phone_number ?? parsed.data.phone) : undefined;
  if (!phone) {
    res.status(400).json({ error: { code: "INVALID_PHONE", message: "phone_number must be +91 followed by 10 digits (starting 6-9)" } });
    return;
  }

  const hasMSG91 = !!process.env["MSG91_AUTH_KEY"] && !!process.env["MSG91_TEMPLATE_ID"];
  if (process.env["NODE_ENV"] === "production" && !hasMSG91) {
    req.log.error("MSG91 not configured in production");
    res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "SMS service temporarily unavailable" } });
    return;
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentOtps = await db
    .select({ id: otpRequestsTable.id })
    .from(otpRequestsTable)
    .where(and(eq(otpRequestsTable.phoneNumber, phone), gt(otpRequestsTable.createdAt, oneHourAgo)));

  if (recentOtps.length >= MAX_OTP_PER_PHONE_PER_HOUR) {
    req.log.warn({ phone: maskPhone(phone) }, "Phone OTP rate limit exceeded");
    res.status(429).json({ error: { code: "RATE_LIMIT", message: "Too many OTP requests for this number. Please wait before requesting again." } });
    return;
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, OTP_BCRYPT_COST);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  const ip = (req.ip ?? "unknown") as string;

  const [record] = await db
    .insert(otpRequestsTable)
    .values({ phoneNumber: phone, otpHash, expiresAt, ipAddress: ip })
    .returning({ id: otpRequestsTable.id });

  req.log.info({ phone: maskPhone(phone) }, "OTP requested");

  try {
    if (hasMSG91) {
      await sendOtpViaMSG91(phone, otp);
      res.json({ success: true, request_id: record.id, expires_in: OTP_TTL_MINUTES * 60 });
    } else {
      req.log.warn({ phone: maskPhone(phone) }, "MSG91 not configured — dev mode OTP");
      res.json({ success: true, request_id: record.id, expires_in: OTP_TTL_MINUTES * 60, devOtp: otp });
    }
  } catch (err) {
    req.log.error(err, "MSG91 send failed");
    res.status(500).json({ error: { code: "SMS_FAILED", message: "Failed to send OTP. Please try again." } });
  }
}

router.post("/auth/request-otp", requestOtpIpLimiter, handleRequestOtp);
router.post("/auth/send-otp", requestOtpIpLimiter, handleRequestOtp);

const verifyOtpSchema = z.object({
  phone_number: phoneSchema.optional(),
  phone: phoneSchema.optional(),
  otp: z.string().length(6).regex(/^\d{6}$/),
  device_info: z.string().max(200).optional(),
});

router.post("/auth/verify-otp", verifyOtpLimiter, async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid request body" } });
    return;
  }
  const phone = (parsed.data.phone_number ?? parsed.data.phone);
  if (!phone) {
    res.status(400).json({ error: { code: "INVALID_PHONE", message: "phone_number is required" } });
    return;
  }
  const { otp, device_info } = parsed.data;
  const now = new Date();

  const [record] = await db
    .select()
    .from(otpRequestsTable)
    .where(and(
      eq(otpRequestsTable.phoneNumber, phone),
      eq(otpRequestsTable.used, false),
      gt(otpRequestsTable.expiresAt, now),
    ))
    .orderBy(desc(otpRequestsTable.createdAt))
    .limit(1);

  if (!record) {
    res.status(401).json({ error: { code: "INVALID_OTP", message: "Invalid or expired OTP. Please request a new one." } });
    return;
  }

  const newAttempts = (record.attempts ?? 0) + 1;
  if (newAttempts > MAX_OTP_ATTEMPTS) {
    await db.update(otpRequestsTable).set({ used: true }).where(eq(otpRequestsTable.id, record.id));
    req.log.warn({ phone: maskPhone(phone) }, "OTP burned — max attempts exceeded");
    res.status(401).json({ error: { code: "MAX_ATTEMPTS", message: "Too many incorrect attempts. Please request a new OTP." } });
    return;
  }

  await db.update(otpRequestsTable).set({ attempts: newAttempts }).where(eq(otpRequestsTable.id, record.id));

  const valid = await bcrypt.compare(otp, record.otpHash);
  if (!valid) {
    if (newAttempts >= MAX_OTP_ATTEMPTS) {
      await db.update(otpRequestsTable).set({ used: true }).where(eq(otpRequestsTable.id, record.id));
      res.status(401).json({ error: { code: "MAX_ATTEMPTS", message: "Too many incorrect attempts. Please request a new OTP." } });
    } else {
      res.status(401).json({ error: { code: "INVALID_OTP", message: "Incorrect OTP. Please try again." } });
    }
    return;
  }

  await db.update(otpRequestsTable).set({ used: true }).where(eq(otpRequestsTable.id, record.id));

  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phoneNumber, phone))
    .limit(1);
  const isNewUser = !user;

  if (!user) {
    const id = generateUserId();
    [user] = await db.insert(usersTable).values({ id, phoneNumber: phone }).returning();
  } else {
    await db.update(usersTable).set({ lastLoginAt: now }).where(eq(usersTable.id, user.id));
  }

  const [child] = user.currentChildId
    ? await db.select().from(childrenTable).where(eq(childrenTable.id, user.currentChildId)).limit(1)
    : [];

  const tokens = await issueTokens(user.id, phone, user.currentChildId ?? null, device_info);

  req.log.info({ phone: maskPhone(phone), userId: user.id, isNewUser }, "OTP verified — tokens issued");

  res.json({
    ...tokens,
    is_new_user: isNewUser,
    ...(isNewUser ? {} : {
      user: { id: user.id, phone_number: user.phoneNumber },
      current_child: child ?? null,
    }),
  });
});

router.post("/auth/refresh", async (req, res) => {
  const schema = z.object({ refresh_token: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: "refresh_token is required" } });
    return;
  }
  const tokenHash = hashToken(parsed.data.refresh_token);
  const now = new Date();

  const [record] = await db
    .select()
    .from(refreshTokensTable)
    .where(and(
      eq(refreshTokensTable.tokenHash, tokenHash),
      eq(refreshTokensTable.revoked, false),
      gt(refreshTokensTable.expiresAt, now),
    ))
    .limit(1);

  if (!record) {
    res.status(401).json({ error: { code: "INVALID_REFRESH_TOKEN", message: "Invalid or expired refresh token" } });
    return;
  }

  await db.update(refreshTokensTable).set({ revoked: true }).where(eq(refreshTokensTable.id, record.id));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, record.userId)).limit(1);
  if (!user || user.isDeleted) {
    res.status(401).json({ error: { code: "USER_NOT_FOUND", message: "User account not found" } });
    return;
  }

  const tokens = await issueTokens(user.id, user.phoneNumber, user.currentChildId ?? null, record.deviceInfo ?? undefined);
  res.json(tokens);
});

router.post("/auth/logout", requireAuth, async (req, res) => {
  const schema = z.object({ refresh_token: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (parsed.success && parsed.data.refresh_token) {
    const tokenHash = hashToken(parsed.data.refresh_token);
    await db
      .update(refreshTokensTable)
      .set({ revoked: true })
      .where(eq(refreshTokensTable.tokenHash, tokenHash));
  }
  req.log.info({ userId: req.auth!.sub }, "User logged out");
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.auth!.sub))
    .limit(1);
  if (!user || user.isDeleted) {
    res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User not found" } });
    return;
  }
  const [child] = user.currentChildId
    ? await db.select().from(childrenTable).where(eq(childrenTable.id, user.currentChildId)).limit(1)
    : [];
  res.json({
    id: user.id,
    phone_number: user.phoneNumber,
    current_child: child ?? null,
    created_at: user.createdAt,
    last_login_at: user.lastLoginAt,
  });
});

export default router;
