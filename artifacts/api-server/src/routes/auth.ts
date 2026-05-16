import { Router, type IRouter, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db, usersTable, otpRequestsTable, refreshTokensTable, subscriptionsTable, childrenTable } from "@workspace/db";
import { eq, and, gt, desc } from "drizzle-orm";
import { z } from "zod/v4";
import {
  signAccessToken,
  requireAuth,
  requireAdminAuth,
  generateRefreshToken,
  hashToken,
  generateUserId,
} from "../middleware/auth";

const router: IRouter = Router();

const OTP_TTL_MINUTES = 5;
const OTP_BCRYPT_COST = 10;
const MAX_OTP_ATTEMPTS = 5;
const MAX_OTP_PER_PHONE_PER_HOUR = 3;

// ── Validation schemas (strict — reject unknown fields) ─────────────────────
const phoneSchema = z
  .string()
  .regex(/^\+91[6-9]\d{9}$/, "Phone must be +91 followed by 10 digits starting 6-9");

const requestOtpSchema = z
  .object({ phone_number: phoneSchema })
  .strict();

const verifyOtpSchema = z
  .object({
    phone_number: phoneSchema,
    otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
    request_id: z.string().uuid("request_id must be a valid UUID"),
  })
  .strict();

const refreshSchema = z
  .object({ refresh_token: z.string().min(1).max(256) })
  .strict();

// ── Per-IP rate limiters ─────────────────────────────────────────────────────
const requestOtpIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMIT", message: "Too many OTP requests from this IP. Try again later." } },
});

const verifyOtpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMIT", message: "Too many verification attempts. Try again later." } },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMIT", message: "Too many refresh attempts. Try again later." } },
});

function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
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
  phoneNumber: string,
  res: Response,
): Promise<void> {
  const [child] = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId))
    .orderBy(desc(childrenTable.createdAt))
    .limit(1);

  const [user] = await db
    .select({ currentChildId: usersTable.currentChildId })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const childId = user?.currentChildId ?? child?.id ?? null;
  const subState = await getSubState(userId);

  const accessToken = signAccessToken({
    sub: userId,
    phone: phoneNumber,
    child_id: childId,
    sub_state: subState,
  });

  const refreshToken = generateRefreshToken();
  const hashedToken = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokensTable).values({
    userId,
    tokenHash: hashedToken,
    expiresAt,
  });

  res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 15 * 60,
    child_id: childId,
    sub_state: subState,
  });
}

// ── POST /auth/request-otp ──────────────────────────────────────────────────
router.post("/auth/request-otp", requestOtpIpLimiter, async (req, res) => {
  const parsed = requestOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    res.status(400).json({
      error: { code: "validation_error", message: issue?.message ?? "Invalid request", field: issue?.path[0] ?? "phone_number" },
    });
    return;
  }
  const { phone_number } = parsed.data;

  // Per-phone rate limit: 3 OTPs per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await db
    .select({ id: otpRequestsTable.id })
    .from(otpRequestsTable)
    .where(
      and(
        eq(otpRequestsTable.phoneNumber, phone_number),
        gt(otpRequestsTable.createdAt, oneHourAgo),
      ),
    );

  if (recentCount.length >= MAX_OTP_PER_PHONE_PER_HOUR) {
    res.status(429).json({
      error: {
        code: "OTP_RATE_LIMIT",
        message: `Maximum ${MAX_OTP_PER_PHONE_PER_HOUR} OTP requests per hour. Please wait.`,
        field: "phone_number",
      },
    });
    return;
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, OTP_BCRYPT_COST);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  const [otpRecord] = await db
    .insert(otpRequestsTable)
    .values({ phoneNumber: phone_number, otpHash, expiresAt, attempts: 0 })
    .returning({ id: otpRequestsTable.id });

  const hasMSG91 = !!(process.env["MSG91_AUTH_KEY"] && process.env["MSG91_TEMPLATE_ID"]);
  if (hasMSG91) {
    try {
      await sendOtpViaMSG91(phone_number, otp);
    } catch (err) {
      req.log.error(err, "MSG91 OTP send failed");
      res.status(503).json({
        error: { code: "SMS_ERROR", message: "Could not send OTP. Please try again.", field: "phone_number" },
      });
      return;
    }
  }

  req.log.info({ phone: maskPhone(phone_number) }, "OTP issued");

  res.json({
    success: true,
    request_id: otpRecord!.id,
    expires_in: OTP_TTL_MINUTES * 60,
    ...(!hasMSG91 ? { devOtp: otp } : {}),
  });
});

// ── POST /auth/verify-otp ───────────────────────────────────────────────────
router.post("/auth/verify-otp", verifyOtpLimiter, async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    res.status(400).json({
      error: { code: "validation_error", message: issue?.message ?? "Invalid request", field: String(issue?.path[0] ?? "") },
    });
    return;
  }
  const { phone_number, otp, request_id } = parsed.data;

  const now = new Date();
  const [otpRecord] = await db
    .select()
    .from(otpRequestsTable)
    .where(
      and(
        eq(otpRequestsTable.id, request_id),
        eq(otpRequestsTable.phoneNumber, phone_number),
        gt(otpRequestsTable.expiresAt, now),
      ),
    )
    .limit(1);

  if (!otpRecord) {
    res.status(400).json({
      error: { code: "OTP_INVALID", message: "OTP not found or expired. Please request a new one.", field: "otp" },
    });
    return;
  }

  if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
    res.status(400).json({
      error: { code: "OTP_MAX_ATTEMPTS", message: "Too many incorrect attempts. Request a new OTP.", field: "otp" },
    });
    return;
  }

  const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
  if (!isValid) {
    await db
      .update(otpRequestsTable)
      .set({ attempts: otpRecord.attempts + 1 })
      .where(eq(otpRequestsTable.id, request_id));

    res.status(400).json({
      error: { code: "OTP_INVALID", message: "Incorrect OTP. Please try again.", field: "otp" },
    });
    return;
  }

  // Consume OTP
  await db.delete(otpRequestsTable).where(eq(otpRequestsTable.id, request_id));

  // Upsert user
  let userId: string;
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.phoneNumber, phone_number))
    .limit(1);

  if (existing) {
    userId = existing.id;
    await db
      .update(usersTable)
      .set({ lastLoginAt: now })
      .where(eq(usersTable.id, userId));
  } else {
    userId = generateUserId();
    await db.insert(usersTable).values({
      id: userId,
      phoneNumber: phone_number,
      lastLoginAt: now,
    });
  }

  req.log.info({ userId }, "User authenticated via OTP");
  await issueTokens(userId, phone_number, res);
});

// ── POST /auth/refresh ──────────────────────────────────────────────────────
router.post("/auth/refresh", refreshLimiter, async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: "validation_error", message: "refresh_token is required", field: "refresh_token" },
    });
    return;
  }
  const { refresh_token } = parsed.data;
  const hashedToken = hashToken(refresh_token);
  const now = new Date();

  const [stored] = await db
    .select()
    .from(refreshTokensTable)
    .where(
      and(
        eq(refreshTokensTable.tokenHash, hashedToken),
        gt(refreshTokensTable.expiresAt, now),
        eq(refreshTokensTable.revoked, false),
      ),
    )
    .limit(1);

  if (!stored) {
    res.status(401).json({
      error: { code: "REFRESH_INVALID", message: "Invalid or expired refresh token", field: "refresh_token" },
    });
    return;
  }

  // Rotate: revoke old token
  await db
    .update(refreshTokensTable)
    .set({ revoked: true })
    .where(eq(refreshTokensTable.id, stored.id));

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, stored.userId))
    .limit(1);

  if (!user || user.isDeleted) {
    res.status(401).json({
      error: { code: "USER_NOT_FOUND", message: "User account not found", field: "refresh_token" },
    });
    return;
  }

  await issueTokens(user.id, user.phoneNumber, res);
});

// ── POST /auth/logout ───────────────────────────────────────────────────────
router.post("/auth/logout", requireAuth, async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (parsed.success) {
    const hashedToken = hashToken(parsed.data.refresh_token);
    await db
      .update(refreshTokensTable)
      .set({ revoked: true })
      .where(eq(refreshTokensTable.tokenHash, hashedToken));
  }
  res.json({ ok: true });
});

// ── GET /auth/me ────────────────────────────────────────────────────────────
router.get("/auth/me", requireAuth, async (req, res) => {
  const userId = req.auth!.sub;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user || user.isDeleted) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
    return;
  }

  res.json({
    id: user.id,
    phone_number: user.phoneNumber,
    current_child_id: user.currentChildId,
    timezone: user.timezone,
    created_at: user.createdAt,
  });
});

// ── POST /auth/test-otp ─────────────────────────────────────────────────────
// Admin-only: generates a fresh OTP for any phone number and returns it in
// plain text. Use only for testing when MSG91 is not configured.
router.post("/auth/test-otp", requireAdminAuth, async (req, res) => {
  const parsed = z.object({ phone_number: phoneSchema }).strict().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "VALIDATION", message: z.prettifyError(parsed.error) } });
    return;
  }

  const { phone_number } = parsed.data;
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, OTP_BCRYPT_COST);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  const [otpRecord] = await db
    .insert(otpRequestsTable)
    .values({ phoneNumber: phone_number, otpHash, expiresAt, attempts: 0 })
    .returning({ id: otpRequestsTable.id });

  req.log.info({ phone: maskPhone(phone_number) }, "Test OTP generated via admin endpoint");

  res.json({
    otp,
    request_id: otpRecord!.id,
    expires_in: OTP_TTL_MINUTES * 60,
    warning: "This endpoint is for testing only. Remove MSG91 credentials to disable SMS and use this instead.",
  });
});

export default router;
