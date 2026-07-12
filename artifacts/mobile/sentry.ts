import * as Sentry from "@sentry/react-native";

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    enableNativeNagger: false,
    tracesSampleRate: 0.2,
    environment: __DEV__ ? "development" : "production",
    enabled: !__DEV__,
  });
}

export { Sentry };
