# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (Replit built-in, no external service needed)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo Router (React Native)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

- **API Server** (`artifacts/api-server`) — Express 5, serves `/api/*`
- **Mobile App** (`artifacts/mobile`) — Expo Router, audio storytelling app "Storytime"
- **Mockup Sandbox** (`artifacts/mockup-sandbox`) — Component preview server for canvas

## Content Management

Stories are stored in PostgreSQL. The mobile app fetches from `/api/stories` at startup and falls back to the static `data/stories.ts` if the server is unreachable.

### Admin UI
Navigate to `/api/admin` in the browser to add, edit, and delete stories without touching code. Fields supported:
- ID (unique slug, e.g. `s21`)
- Title, Category, Duration, Age range, Description
- Thumbnail URL (image hosted anywhere)
- Audio URL (MP3/M4A hosted anywhere)
- Video URL (MP4, optional)
- Published toggle

### API Endpoints
- `GET  /api/stories` — list all published stories
- `POST /api/stories` — create story (JSON)
- `GET  /api/stories/:id` — single story
- `PUT  /api/stories/:id` — update story
- `DELETE /api/stories/:id` — delete story

### Database Schema (`lib/db/src/schema/stories.ts`)
Table `stories`: id (PK), title, category, duration, age_min, age_max, description, thumbnail_url, audio_url, video_url, published, created_at, updated_at

### Adding content in production
1. Go to `/api/admin` on your deployed domain
2. Fill in the form with title, description, age range, and paste URLs for thumbnail and audio
3. Hit "Add Story" — it appears in the app on next launch

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
