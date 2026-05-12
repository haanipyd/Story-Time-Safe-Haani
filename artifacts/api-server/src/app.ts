import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { startJobs } from "./jobs";

const app: Express = express();

app.set("trust proxy", 1);

const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";
app.use(cookieParser(SESSION_SECRET));

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

// Capture raw body for Razorpay webhook signature verification
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.path.includes("/webhooks/razorpay")) {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      (req as any).rawBody = Buffer.concat(chunks);
      next();
    });
  } else {
    next();
  }
});

const allowedOrigins = process.env["APP_BASE_URL"]
  ? [process.env["APP_BASE_URL"]]
  : ["*"];

app.use(
  cors({
    origin: allowedOrigins.includes("*") ? true : allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

startJobs();

export default app;
