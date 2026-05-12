import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const ADMIN_COOKIE = "admin_session";
const ADMIN_COOKIE_VALUE = "authenticated";

export interface AuthPayload {
  sub: string;
  userId: string;
  phone: string;
  child_id: string | null;
  sub_state: string;
  iat?: number;
  exp?: number;
}

function getJwtSecret(): string {
  const secret = process.env["JWT_SECRET"] ?? process.env["SESSION_SECRET"];
  if (!secret) throw new Error("JWT_SECRET or SESSION_SECRET must be set");
  return secret;
}

export function signAccessToken(payload: Omit<AuthPayload, "userId" | "iat" | "exp">): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "15m" });
}

export function verifyAccessToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthPayload;
    return { ...decoded, userId: decoded.sub };
  } catch {
    return null;
  }
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateUserId(): string {
  return crypto.randomUUID();
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ error: { code: "UNAUTHORIZED", message: "Missing authorization header" } });
    return;
  }
  const token = header.slice(7);
  const payload = verifyAccessToken(token);
  if (!payload) {
    res
      .status(401)
      .json({ error: { code: "TOKEN_EXPIRED", message: "Token expired or invalid" } });
    return;
  }
  req.auth = payload;
  next();
}

export function setAdminCookie(res: Response): void {
  res.cookie(ADMIN_COOKIE, ADMIN_COOKIE_VALUE, {
    signed: true,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000,
  });
}

export function clearAdminCookie(res: Response): void {
  res.clearCookie(ADMIN_COOKIE);
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const signedCookies = (
    req as Request & { signedCookies: Record<string, string | false> }
  ).signedCookies;
  if (signedCookies[ADMIN_COOKIE] === ADMIN_COOKIE_VALUE) {
    next();
    return;
  }
  res.redirect("/api/admin/login");
}
