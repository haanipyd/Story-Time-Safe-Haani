import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const ADMIN_COOKIE = "admin_session";
const ADMIN_COOKIE_VALUE = "authenticated";

export interface AuthPayload {
  userId: string;
  phone: string;
}

function getJwtSecret(): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "90d" });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AuthPayload;
  } catch {
    return null;
  }
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
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
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
  const signedCookies = (req as Request & { signedCookies: Record<string, string | false> }).signedCookies;
  if (signedCookies[ADMIN_COOKIE] === ADMIN_COOKIE_VALUE) {
    next();
    return;
  }
  const header = req.headers["authorization"];
  if (header?.startsWith("Bearer ")) {
    const payload = verifyToken(header.slice(7));
    if (payload) {
      req.auth = payload;
      next();
      return;
    }
  }
  res.redirect("/api/admin/login");
}
