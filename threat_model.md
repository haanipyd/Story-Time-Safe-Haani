# Threat Model

## Project Overview

Storytime is a pnpm monorepo with a production Express 5 API server (`artifacts/api-server`) backed by PostgreSQL/Drizzle, plus an Expo mobile client (`artifacts/mobile`) that consumes the API. The primary production capabilities are story browsing, phone-based user sign-in, subscription purchase flows, and a browser-accessible content management page under `/api/admin`.

This threat model assumes production deployments run with `NODE_ENV=production`, TLS is terminated by the platform, and `artifacts/mockup-sandbox` is development-only unless future scans find a production path to it.

## Assets

- **Story catalog integrity** — story metadata, publication state, and hosted media URLs determine what content users receive. Unauthorized changes can deface the product, distribute malicious or inappropriate media, or remove service content.
- **User accounts and sessions** — JWT bearer tokens and phone-number-based identities gate premium subscription operations and personalized state.
- **Payment and subscription state** — subscription records, Razorpay order/payment identifiers, and payment verification flows determine premium access and billing integrity.
- **Phone numbers and OTP secrets** — phone numbers are personal data, and active OTP codes are authentication factors. Disclosure or brute-force compromise enables account takeover.
- **Application secrets** — `SESSION_SECRET`, database credentials, Twilio credentials, and Razorpay keys protect authentication, storage, and payment interactions.

## Trust Boundaries

- **Mobile client / browser to API** — all `/api/*` endpoints receive untrusted input from users and attackers. Validation, authentication, authorization, and abuse controls must be enforced server-side.
- **API to PostgreSQL** — the API server can create and mutate stories, users, OTP codes, and subscriptions. Broken access control or injection at the API layer directly affects persisted data.
- **API to third parties** — the server calls Twilio and Razorpay with privileged credentials. Inputs that influence these integrations must be validated, and secret material must never leak to clients or logs.
- **Public / authenticated boundary** — story listing and some auth bootstrapping are public, while account and subscription operations require a valid token. This boundary must be explicit and enforced route-by-route.
- **Public / admin boundary** — story-management capabilities and unpublished story visibility are administrative functions and must not be reachable by unauthenticated users.
- **Production / dev-only boundary** — `artifacts/mockup-sandbox` and development conveniences must stay isolated from production paths.

## Scan Anchors

- **Production entry points**: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/*.ts`, `artifacts/mobile/context/AuthContext.tsx`, `artifacts/mobile/app/phone-auth.tsx`
- **Highest-risk areas**: `routes/admin.ts`, `routes/stories.ts`, `routes/auth.ts`, `routes/subscriptions.ts`, `middleware/auth.ts`
- **Public surfaces**: `/api/stories`, `/api/auth/send-otp`, `/api/auth/verify-otp`, `/api/admin`, `/api/subscriptions/checkout`
- **Authenticated surfaces**: `/api/auth/me`, `/api/subscriptions/*` except checkout
- **Dev-only areas to usually ignore**: `artifacts/mockup-sandbox/**`

## Threat Categories

### Spoofing

Storytime uses phone OTP login and long-lived JWT bearer tokens. The API must ensure OTP issuance and verification endpoints resist brute force and abuse, and every protected route must verify a valid token signed with `SESSION_SECRET`. Production must not expose development authentication shortcuts when SMS delivery is unavailable.

### Tampering

Story records, publication flags, and subscription rows are high-value state. Administrative story creation, editing, and deletion must require an authenticated administrative principal, and payment-related state changes must only occur after server-side verification of the relevant payment artifacts. Clients must never be able to change catalog or subscription state solely by knowing a public endpoint.

### Information Disclosure

The API and admin UI can expose unpublished stories, phone numbers, OTP values, and secrets if responses, pages, or logs are overly permissive. Public endpoints must return only intended records, development-only debugging data must never be emitted in production responses, and logs must avoid storing authentication secrets or one-time codes.

### Denial of Service

Public auth endpoints and admin/content-management endpoints are abuse targets. Storytime must rate-limit or otherwise throttle OTP issuance and verification attempts, and it should prevent unauthenticated users from driving expensive or high-volume state changes such as SMS sends or repeated database writes.

### Elevation of Privilege

The main privilege boundary is between the public internet and administrative content-management functions, plus between anonymous users and authenticated subscription actions. The application must enforce server-side authorization on every state-changing route, keep unpublished/admin-only content out of public reach, and ensure no public endpoint can be used to gain premium or administrative capabilities.