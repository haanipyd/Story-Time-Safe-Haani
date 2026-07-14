import { Platform } from "react-native";

type FbSdk = {
  AppEventsLogger: {
    logEvent: (name: string, params?: Record<string, unknown>) => void;
    logPurchase: (amount: number, currency: string, params?: Record<string, unknown>) => void;
  };
  Settings: {
    initializeSDK: () => void;
  };
};

let _sdk: FbSdk | null = null;
let _loaded = false;

function getSdk(): FbSdk | null {
  if (_loaded) return _sdk;
  _loaded = true;
  try {
    // Dynamic require — gracefully no-ops in Expo Go where native module is absent
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _sdk = require("react-native-fbsdk-next") as FbSdk;
    return _sdk;
  } catch {
    return null;
  }
}

export function initMetaSdk(): void {
  if (Platform.OS === "web") return;
  const sdk = getSdk();
  if (!sdk) return;
  try {
    sdk.Settings.initializeSDK();
  } catch {}
}

export function trackRegistrationEvent(eventId: string): void {
  if (Platform.OS === "web") return;
  const sdk = getSdk();
  if (!sdk) return;
  try {
    sdk.AppEventsLogger.logEvent("CompleteRegistration", {
      event_id: eventId,
      fb_registration_method: "phone",
    });
  } catch {}
}

export function trackPurchaseEvent(params: {
  eventId: string;
  amountINR: number;
  plan: string;
}): void {
  if (Platform.OS === "web") return;
  const sdk = getSdk();
  if (!sdk) return;
  try {
    sdk.AppEventsLogger.logPurchase(params.amountINR, "INR", {
      event_id: params.eventId,
      subscription_plan: params.plan,
    });
    sdk.AppEventsLogger.logEvent("Subscribe", {
      event_id: params.eventId,
      subscription_plan: params.plan,
    });
  } catch {}
}

export function trackStartTrialEvent(eventId: string): void {
  if (Platform.OS === "web") return;
  const sdk = getSdk();
  if (!sdk) return;
  try {
    sdk.AppEventsLogger.logEvent("StartTrial", {
      event_id: eventId,
      fb_order_id: eventId,
    });
  } catch {}
}
