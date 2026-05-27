# Threat Model

## Project Overview

Storytime is a pnpm monorepo with a production Express 5 API server (`artifacts/api-server`) backed by PostgreSQL/Drizzle, plus an Expo mobile client (`artifacts/mobile`) that consumes the API. The main production capabilities are story browsing and playback, phone-number OTP sign-in, subscription purchase and entitlement flows, bedtime/push notifications, and a browser-accessible content-management page under `/api/admin`.

This threat model assumes production deployments run with `NODE_ENV=production`, TLS is terminated by the platform, `artifacts/mockup-sandbox` is development-only unless future scans prove a production path to it, and public deployments are reachable from the internet unless deployment visibility says otherwise.

## Assets

- **Story catalog integrity** — story metadata, publication state, and hosted media URLs determine what content every child receives. Unauthorized changes can deface the product, remove content, or distribute malicious or inappropriate media.
- **User accounts and sessions** — JWT bearer tokens, refresh tokens, and admin session cookies gate account access and privileged operations.
- **Phone numbers and OTP secrets** — phone numbers are personal data, and active OTP codes are authentication factors. Disclosure or brute-force compromise enables account takeover.
- **Payment and subscription state** — subscription rows, Razorpay subscription identifiers, and webhook-driven entitlement changes determine premium access and billing integrity.
- **Push tokens and notification content** — device tokens, child names, and story recommendations can reveal family-specific information if routed to the wrong account or device.
- **Application secrets** — `SESSION_SECRET`, `JWT_SECRET`, `ADMIN_PASSWORD`, MSG91 credentials, Razorpay keys, webhook secrets, and database credentials protect authentication, payments, and privileged integrations.

## Trust Boundaries

- **Mobile client / browser to API** — all `/api/*` endpoints receive untrusted input. Validation, authentication, authorization, and abuse controls must be enforced server-side.
- **API to PostgreSQL** — the API can mutate stories, users, OTP requests, subscriptions, payment events, listening history, and push-token bindings. Broken access control or injection at the API layer directly affects persisted state.
- **API to third parties** — the server calls MSG91 and Razorpay with privileged credentials. Inputs that influence those integrations must be validated, and missing secrets must fail closed in production.
- **Public / authenticated boundary** — browsing and auth bootstrapping are public, while account, playback, notification, and subscription operations require a valid token. This boundary must be explicit and enforced route-by-route.
- **Public / admin boundary** — story-management, flashcard-management, and OTP testing capabilities are administrative functions and must not be reachable by unauthenticated or normal authenticated users.
- **Production / dev-only boundary** — development conveniences such as OTP-returning fallbacks, default secrets, or signature-bypass modes must not stay reachable in production.

## Scan Anchors

- **Production entry points**: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/index.ts`, `artifacts/mobile/context/AuthContext.tsx`, `artifacts/mobile/app/phone-auth.tsx`
- **Highest-risk code areas**: `routes/auth.ts`, `routes/stories.ts`, `routes/admin.ts`, `routes/subscriptions.ts`, `routes/webhooks.ts`, `middleware/auth.ts`, `routes/push.ts`, `jobs/index.ts`
- **Public surfaces**: `/api/auth/request-otp`, `/api/auth/verify-otp`, `/api/stories`, `/api/stories/:id`, `/api/flashcards/*`, `/api/admin/login`, `/api/webhooks/razorpay`
- **Authenticated surfaces**: `/api/auth/me`, `/api/auth/logout`, `/api/subscription/*`, `/api/children/*`, `/api/listening/*`, `/api/dashboard/week`, `/api/push/*`, `/api/users/me/*`, `/api/stories/home`, `/api/stories/:id/stream-url`
- **Admin surfaces**: `/api/admin`, `/api/admin/stories*`, `/api/auth/test-otp`, flashcard mutation endpoints protected by admin auth
- **Dev-only areas to usually ignore**: `artifacts/mockup-sandbox/**`

## Threat Categories

### Spoofing

Storytime uses phone OTP login, refresh tokens, and a signed admin cookie. Production must never expose developer OTP shortcuts or predictable secret fallbacks; OTP issuance and verification must resist abuse, and every protected route must verify a valid token or admin session derived from deployment-specific secrets.

### Tampering

Story records, publication flags, flashcard content, and subscription rows are high-value state. Administrative content-management functions and payment-state transitions must require the correct privilege level, and webhook-driven changes must only occur after strong server-side authenticity checks.

### Information Disclosure

The API and notification system can expose phone numbers, OTP values, child names, recommendations, unpublished content, or secrets if responses, logs, or token bindings are too permissive. Public endpoints must return only intended data, sensitive values must never appear in production responses, and notification delivery must stay scoped to the correct account and device.

### Denial of Service

Public auth and webhook endpoints are abuse targets. Storytime must rate-limit OTP issuance and verification, avoid allowing unauthenticated callers to trigger expensive external actions or excessive database writes, and ensure webhook endpoints do not become easy probing targets.

### Elevation of Privilege

The main privilege boundaries are between the public internet and admin functions, between anonymous and authenticated users, and between regular users and premium/admin capabilities. The application must enforce server-side authorization on every state-changing route, prevent low-privilege users from mutating shared catalog state, and ensure payment or auth fallbacks cannot be used to mint privileged access.