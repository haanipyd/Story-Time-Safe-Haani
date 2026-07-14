import crypto from "crypto";
import { logger } from "./logger";

const GRAPH_API_VERSION = "v21.0";

function sha256hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

interface CapiUserData {
  userId: string;
  phone?: string | null;
}

interface CapiEvent {
  eventName: string;
  eventId: string;
  eventTime?: number;
  userData: CapiUserData;
  customData?: Record<string, unknown>;
}

async function sendCapiEvents(events: CapiEvent[]): Promise<void> {
  const pixelId = process.env["META_PIXEL_ID"];
  const accessToken = process.env["META_CAPI_ACCESS_TOKEN"];

  if (!pixelId || !accessToken) {
    logger.debug("Meta CAPI skipped — META_PIXEL_ID or META_CAPI_ACCESS_TOKEN not set");
    return;
  }

  const data = events.map((e) => {
    const user_data: Record<string, unknown> = {
      external_id: [sha256hex(e.userData.userId)],
    };
    if (e.userData.phone) {
      user_data["ph"] = [sha256hex(normalizePhone(e.userData.phone))];
    }

    return {
      event_name: e.eventName,
      event_time: e.eventTime ?? Math.floor(Date.now() / 1000),
      event_id: e.eventId,
      action_source: "app",
      user_data,
      ...(e.customData ? { custom_data: e.customData } : {}),
    };
  });

  const body: Record<string, unknown> = { data };
  const testCode = process.env["META_TEST_EVENT_CODE"];
  if (testCode) body["test_event_code"] = testCode;

  const url =
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(pixelId)}/events` +
    `?access_token=${encodeURIComponent(accessToken)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.warn(
        { status: res.status, body: text.slice(0, 500) },
        "Meta CAPI request failed",
      );
    } else {
      logger.info(
        { events: events.map((e) => `${e.eventName}:${e.eventId}`) },
        "Meta CAPI events sent",
      );
    }
  } catch (err) {
    logger.warn({ err }, "Meta CAPI fetch error — tracking skipped");
  }
}

export function trackCompleteRegistration(params: {
  eventId: string;
  userId: string;
  phone: string;
}): void {
  sendCapiEvents([
    {
      eventName: "CompleteRegistration",
      eventId: params.eventId,
      userData: { userId: params.userId, phone: params.phone },
      customData: { status: "registered" },
    },
  ]).catch(() => {});
}

export function trackStartTrial(params: {
  eventId: string;
  userId: string;
  phone?: string | null;
}): void {
  sendCapiEvents([
    {
      eventName: "StartTrial",
      eventId: params.eventId,
      userData: { userId: params.userId, phone: params.phone },
      customData: { currency: "INR", value: 1 },
    },
  ]).catch(() => {});
}

export function trackPurchase(params: {
  eventId: string;
  userId: string;
  phone?: string | null;
  amountPaise: number;
  plan?: string;
}): void {
  sendCapiEvents([
    {
      eventName: "Purchase",
      eventId: params.eventId,
      userData: { userId: params.userId, phone: params.phone },
      customData: {
        value: params.amountPaise / 100,
        currency: "INR",
        content_name: params.plan ?? "subscription",
        content_type: "product",
      },
    },
  ]).catch(() => {});
}
