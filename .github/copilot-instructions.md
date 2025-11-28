<!-- Copilot / AI agent quick-start for ExroastFm (daily-motivation) -->

# Quick orientation for AI coding agents

This repo builds a Next.js (App Router) service that turns short user stories into short audio tracks using external providers (Suno, ElevenLabs, etc.) and persists metadata in Postgres via Drizzle.

Core architecture (big picture)
- Frontend: `src/app` — App Router pages and client components. Key client flows call `/api/generate-preview` and `/api/generate-song`.
- Server/API: `src/app/api/*` — server route handlers (export functions like `export async function POST(request)`) used by frontend and providers.
- Background processing: `server/audio-worker.ts` — long-running job consumer that processes `audio_generation_jobs` and calls provider clients in `lib/`.
- Database: Drizzle schema in `src/db/schema.ts`. Use `@/server/db` and query helpers in `lib/db-service.ts`.

Important patterns and conventions (do not break these lightly)
- Insert-then-enqueue: API handlers insert a placeholder `songs` row (with placeholder `previewUrl`/`fullUrl`) and then call `enqueueAudioJob`. The worker updates the row when audio is ready. See `src/app/api/generate-song/route.ts` and `lib/db-service.ts`.
- Provider task mapping: Persist provider task IDs on `audio_generation_jobs.providerTaskId` so callback handlers can find the job. The worker prefers callback-first flows but will fall back to polling/mp4 packaging as needed (`server/audio-worker.ts`).
- Flexible callback shapes: `src/app/api/suno/callback/route.ts` accepts multiple callback shapes (nested `data`, `task_id`, or top-level `id`) — follow its normalization logic when sending test callbacks.
- Template previews: Free previews use templates (short demo mp3s). See `src/app/api/generate-preview/route.ts` and `lib/lyrics-data.ts`.

Where to add or modify provider integrations
- Keep provider clients thin and side-effect free. Place under `lib/` (e.g., `lib/suno.ts`, `lib/suno-nudge.ts`, `lib/eleven.ts`). Export a factory and methods like `generateSong`, `generateMp4`, `pollForMp4`.
- Prefer callback-first if provider supports it. Use `process.env.SUNO_CALLBACK_URL` or derive from `SITE_DOMAIN` for callback URLs.

Key files to inspect (starter list)
- `src/app/api/generate-song/route.ts` — personalized generation flow (insert + enqueue + optional reserveCredit)
- `src/app/api/generate-preview/route.ts` — template preview path
- `src/app/api/suno/generate/route.ts` and `src/app/api/suno/callback/route.ts` — Suno integration & webhook
- `server/audio-worker.ts` — background processing and mp4 packaging flows
- `src/db/schema.ts` — Drizzle tables (notable columns: `songs.isTemplate`, `songs.previewUrl`, `audio_generation_jobs.providerTaskId`, `subscriptions.songsRemaining`)
- `lib/db-service.ts` — enqueue/claim/mark job helpers; `reserveCredit` / `refundCredit`

Dev workflow & commands
- Install: `npm install`
- Dev server: `npm run dev` (Next runs on port 5000 by default)
- Build: `npm run build`
- Start prod: `npm run start`
- DB: `npm run db:push` then `npm run db:seed` (seeds templates used by preview)

Environment variables to check
- Suno: `SUNO_API_KEY`, `SUNO_CALLBACK_URL`, `SUNO_MP4_CALLBACK`, `SITE_DOMAIN`
- Payments/Paddle: `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `PADDLE_API_KEY`, `PADDLE_NOTIFICATION_WEBHOOK_SECRET`, `NEXT_PUBLIC_PADDLE_ENVIRONMENT`

Testing & debugging tips
- Simulate provider callbacks: POST a JSON payload to `/api/suno/callback` with one of the accepted shapes (e.g., `{ "task_id": "...", "data": [...] }` or `{ "id": "...", "audio_url": "..." }`). The handler will match job by `providerTaskId` and update `songs`.
- Run the worker locally: `node server/audio-worker.ts` (or `tsx server/audio-worker.ts`) after configuring DB and env vars; watch logs for `markJobSucceeded`/`markJobFailed` traces.
- Logs: use the console output from `next dev` and the worker for diagnostics. Many modules use `console.info/warn/error`.

Schema & migration notes
- The canonical schema is `src/db/schema.ts`. If you add columns, update queries in `lib/db-service.ts` and worker code referencing them, then run `npm run db:push`.

Contribution guidance
- Keep changes small and focused. Preserve the placeholder-insert + enqueue pattern unless redesigning the generation pipeline.
- When adding a provider method that returns a task id, ensure the job row or `audio_generation_jobs` is updated with `providerTaskId` so callbacks work reliably.

If you need clarification, reference the exact file and function you inspected and ask one targeted question (e.g., "Should I add provider X's task mapping in `enqueueAudioJob` or in the worker?").
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
