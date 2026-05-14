import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { rateLimit } from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { startJobs } from "./jobs";

const app: Express = express();

app.set("trust proxy", 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    hsts: { maxAge: 31536000, includeSubDomains: true },
    contentSecurityPolicy: false, // Mobile API — no HTML served
    referrerPolicy: { policy: "no-referrer" },
    frameguard: { action: "deny" },
    noSniff: true,
  }),
);
app.disable("x-powered-by");

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env["APP_BASE_URL"]
  ? [process.env["APP_BASE_URL"]]
  : null; // null = allow all in dev

app.use(
  cors({
    origin: allowedOrigins ?? true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);

// ── Request logging ───────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── Cookies ───────────────────────────────────────────────────────────────────
const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";
app.use(cookieParser(SESSION_SECRET));

// ── Body parsing (raw body captured for Razorpay webhook HMAC) ────────────────
app.use(
  express.json({
    verify: (req: Request, _res: Response, buf: Buffer) => {
      if (req.path.includes("/webhooks/razorpay")) {
        (req as any).rawBody = buf;
      }
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

// ── Global rate limit (100 req/min per IP, excludes healthz + webhooks) ───────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) =>
    req.path === "/api/healthz" || req.path.startsWith("/api/webhooks"),
  message: {
    error: {
      code: "RATE_LIMIT",
      message: "Too many requests. Please slow down.",
    },
  },
});

app.use("/api", globalLimiter);
app.use("/api", router);

startJobs();

export default app;
