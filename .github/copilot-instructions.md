<!-- Copilot / AI agent quick-start for Breakup-music -->

# Quick orientation for code-writing agents

This is a Next.js 16 (App Router) TypeScript app that converts short user stories into "breakup songs" using external AI/music providers and persists metadata in Postgres via Drizzle. The goal below is to point AI contributors to the exact places, conventions, and workflows you must follow to be productive and avoid regressions.

Core architecture (big picture)
- Frontend: `src/app` — App Router pages and client components (React + Tailwind + Framer Motion). Key pages: `src/app/story/page.tsx`, `src/app/checkout/page.tsx`.
- Server/API: `src/app/api/*` — Next server route handlers (exported functions like `export async function POST(request)`) that orchestrate prompts, generator clients, and DB writes. Important routes: `generate-song`, `generate-preview`, `webhook`.
- Database: Drizzle ORM. Canonical schema lives in `src/db/schema.ts`. Use those generated types in all queries.
- Integrations: `lib/` contains thin provider clients (e.g. `lib/suno.ts`, `lib/openrouter.ts`, `lib/lyrics.ts`, `lib/file-storage.ts`). Clients export factories and small `generateX` methods used by API handlers.

Key files to inspect before editing
- `src/app/api/generate-song/route.ts` — full generation flow: prompt -> OpenRouter -> Suno -> DB insert (`songs`).
- `src/app/api/generate-preview/route.ts` — preview-only generation path.
- `src/app/api/webhook/route.ts` — Paddle webhook verification + transaction persistence. Do not change signature/verification logic lightly.
- `src/db/schema.ts` — source of truth for table/column names (`songs.isPurchased`, `purchaseTransactionId`, etc.).
- `lib/db-service.ts` — common Drizzle query helpers and examples (`onConflict`, `returning`, `eq`, `desc`).
- Example clients: `lib/suno.ts`, `lib/openrouter.ts`, `lib/lyrics.ts`, `lib/file-storage.ts` — follow their patterns when adding providers.

Developer workflows & exact commands
- Install: `npm install`
- Dev server (local): `npm run dev`  (Next runs on port 5000: `next dev -p 5000 -H 0.0.0.0`).
- Build & start: `npm run build` && `npm run start` (production server binds to port 5000).
- Lint: `npm run lint`.
- DB schema push: `npm run db:push` (uses `drizzle-kit`).
- Seed templates: `npm run db:seed` (runs `tsx scripts/seed-templates.ts`).

Environment & secrets (where to look)
- Paddle/Payments: `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `PADDLE_API_KEY`, `PADDLE_NOTIFICATION_WEBHOOK_SECRET`, `NEXT_PUBLIC_PADDLE_ENVIRONMENT` — used by webhook verification and client flows.
- Provider keys: check `lib/*` for exact env var names for OpenRouter, Suno, OpenAI, ElevenLabs, etc.

Data & control flows (concrete examples)
- Generation flow: POST body { story, style } → `generate-song/route.ts` constructs prompt (via `lib/openrouter`), calls `lib/suno` to create audio, then inserts into `songs` with `isPurchased=false` and preview/full URLs.
- Purchase flow: frontend initiates Paddle checkout; Paddle sends webhook → `webhook/route.ts` verifies signature, writes `transactions`, and calls fulfillment helpers to mark `songs.isPurchased = true` and set `purchaseTransactionId`.

Conventions & repository patterns
- API routes: use App Router handlers and return `NextResponse` objects.
- DB: always import tables/types from `src/db/schema.ts` and use `lib/db-service.ts` helpers where available.
- Provider clients: keep them thin. Export a factory (if necessary) and a small set of methods like `generateAudio`, `generateLyrics`.
- Error handling: APIs include fallbacks and safe defaults (see `generate-song/route.ts` fallback prompts/audio placeholders). Preserve defensive patterns.

Safety notes — do not change without review
- Webhook verification & transaction persistence: changing signature logic or transaction fulfillment can break payments.
- Drizzle schema shapes and column names: many queries depend on exact names; migrating schema requires `npm run db:push` and seed updates.

How to add an integration (example)
1. Add `lib/<provider>.ts` mirroring `lib/suno.ts` style (factory + methods).
2. Update the API route to call new client methods; keep fallbacks in place.
3. Add required env vars to README/SETUP and update any server route that needs them.

If something is unclear
- Open a focused PR and add comments linking the file you relied on (e.g., `generate-song/route.ts`, `webhook/route.ts`, `src/db/schema.ts`). Keep changes small and test locally using `npm run dev` and `npm run db:seed`.

— End of Copilot instructions
