# Dial

**Call, get shit done.** Your computer is one phone call away.

Dial lets someone finish a digital task with an ordinary phone call. The first workflow is a job application: the user has saved a
reviewed profile, a CV and a role. They call, Dial prepares a tailored email and PDF, reads back the recipient and the changes, takes
revisions, and sends the exact approved version once. The caller needs cellular service, not mobile data. Dial's servers need the
internet. Calls are not free: carrier charges apply.

> **Status (honest):** the web workspace, API, worker and durable approval/send pipeline are built and tested against **simulated
> providers**. Nothing here has been run against live BimpeAI, OpenAI, Resend or Supabase, and there is no deployment. See
> [Release status](#release-status).

## Layout

```
apps/web      Next.js 16 App Router, Tailwind v4, Manrope, Dial identity (docs/BRAND.md)
apps/api      Fastify + Zod: web API, BimpeAI voice tools, email webhook, SSE
apps/worker   Persistent Node worker: claims DB jobs (draft, PDF, send), retention purge
packages/contracts  Zod schemas, task state machine, tool contracts
packages/db         Drizzle schema + SQL migrations (RLS on every table), PGlite/Postgres client
packages/core       Workflow service, review tokens, durable jobs, PDF template, config (fails closed)
packages/providers  Storage (local/Supabase), email (Resend/sandbox), drafter (OpenAI/simulated)
docs/               BIMPE.md (verified platform contract), VOICE_AGENT.md, BRAND.md, COMPONENTS.md
```

## Run it locally (all simulated: sandbox email, simulated drafter, dev sign-in)

```bash
pnpm install
cd apps/api && DEV_AUTH=true EMBED_WORKER=true pnpm exec tsx src/main.ts     # API + embedded worker on :8080
cd apps/web && DEV_AUTH=true API_URL=http://localhost:8080 pnpm exec next dev  # web on :3000
```

Sign in with any user name on the dev form, confirm a profile, add a role, prepare, review and approve. The UI marks the email
provider as a **test setup**; nothing is delivered. For separate API/worker processes use real Postgres (`docker compose up db`,
`DATABASE_URL=postgres://postgres:dial@localhost:54329/dial`, `pnpm --filter @dial/db migrate`).

Checks: `pnpm -r typecheck`, `pnpm -r test` (35 tests), `pnpm exec playwright test` (9 e2e, desktop + mobile; Playwright 1.61 is pinned
to the Chromium build already cached on the dev machine), `pnpm build`.

## How the workflow stays safe

- **Durable jobs.** Preparation and sending run in the worker from a Postgres `jobs` table: atomic `FOR UPDATE SKIP LOCKED`
  claims, lease expiry, bounded attempts with backoff, dead-job handling. An HTTP request never owns background work.
- **Approval is bound to content.** A review token (HMAC, 10 min) binds user, task, draft version and a hash of recipient, subject,
  body and attachment hash. The hash is recomputed from the stored draft at confirm time and again before sending. Any revision, a
  changed recipient or a changed attachment invalidates it.
- **Send once.** Confirm atomically claims `ready_for_review -> sending`, records the approval and queues the send in one transaction.
  The idempotency key is stable per immutable draft. A timeout after the provider accepted retries with the same key, so no duplicate.
  "Submitted" (provider accepted) is tracked separately from delivery (signed, de-duplicated webhooks).
- **Isolation.** Every query is scoped to the authenticated user; other users get 404. RLS is on for all tables with no policies, so
  only the API's server credentials reach data. Files are private; downloads use 5-minute signed links.
- **Untrusted text.** Job descriptions and revision text go to the model as delimited untrusted data; output is schema-validated and
  entry IDs must exist in the profile. Citing an entry is auditability, not proof the wording is right.
- **Fails closed.** In production the API refuses to start with dev auth, sandbox email, the simulated drafter, local storage or
  missing secrets.

## Where a request runs

**Cloud** works today: Dial uses what it holds (your confirmed profile, CV, saved roles) plus its own email sender, and your laptop can be off.
**Laptop** is *not built*: there is no companion app, so Dial can't touch your files or desktop apps, and a laptop that's off can't be reached from
the cloud. Choosing "Use my laptop" shows why it can't run and offers the cloud only when the cloud can really do the job. The Connections page
renders a server-side registry (`packages/core/src/integrations.ts`): Google Drive, Calendar, Gmail, Zapier and the laptop companion are listed as
**not built**, with no scopes, no sign-in and nothing to revoke, until they genuinely work.

## Voice (BimpeAI)

See [docs/BIMPE.md](docs/BIMPE.md) (what the docs verify and what they don't) and [docs/VOICE_AGENT.md](docs/VOICE_AGENT.md)
(setup, tool contracts, agent prompt). Key limit: BimpeAI custom tools carry one static bearer token and no documented per-call
identity, so Dial maps the voice token to **one isolated demo profile** and public phone access stays off. Review tokens prove
content, not spoken consent; the stored evidence is "agent invoked confirm with a valid token".

## Production

Images: `Dockerfile.api`, `Dockerfile.worker`, `Dockerfile.web`. Order: migrate (`node apps/api/dist/migrate.js` with `DATABASE_URL`),
start API, start worker (SIGTERM drains the current job), start web. Health: API `/healthz` and `/readyz` (checks the database),
worker `:8081`. Required env: see `.env.example`; `loadConfig` lists every missing value at startup.

**Rollback:** redeploy the previous image tags; migrations are forward-only, so ship backwards-compatible schema changes.
**Backups:** use Supabase point-in-time recovery; files live in the private `dial-files` bucket (enable versioning).
**Monitoring (to add before launch):** alert on `/readyz` failing, jobs with `status='dead'`, tasks stuck in `send_uncertain`, and
webhook 401 spikes. Logs are JSON with a correlation ID (`x-request-id`) and redact auth headers.
**Retention:** finished applications and files after 90 days, call sessions after 30 (worker, every 6 h). No call audio or full
transcripts are stored. Users can delete everything from Connections.

## Release status

| Gate | State |
|---|---|
| Typecheck, 35 unit/API tests, 9 Playwright e2e (desktop + mobile), production builds | Pass |
| Built API and worker run the full flow (draft, PDF, approve, send, drain) | Pass (simulated providers) |
| UI inspected on desktop and mobile; keyboard skip link; no horizontal overflow | Pass |
| Live Resend email: real send via the real pipeline, controlled recipient, PDF attached | **Pass** (2026-10-03): arrived in the inbox with `Dial-Live-Test-CV.pdf`; local database and simulated drafter |
| Supabase project: schema, RLS and private bucket applied | **Pass** (tables, 4 migrations tracked, `dial-files` private) |
| Docker images build | **Not verified**: the Docker daemon was not running on the build machine |
| Real authentication (Supabase) | **Unverified**: code written; project configured (JWKS), no end-to-end sign-in run yet |
| Live OpenAI drafting, Resend email + webhook, Supabase storage | **Unverified**: no credentials |
| Phone number | **Requested** (Nigeria, inbound), waiting on BimpeAI review |
| Real phone workflow | **Blocked**: needs the approved number and a deployed API |
| Deployment | **Not deployed**: needs a Vercel token and the Supabase database URL and service-role key. See `docs/DEPLOY.md` |

Not production-ready until the unverified and blocked rows pass. When they do, release the web workspace or a controlled private pilot
with public phone access disabled.

## Demo script (three minutes, once live)

1. Show the web profile and role (controlled recipient). 2. Call the number: "Apply for the Paystack role." 3. Dial says "I'm on it";
the request appears live in Dial. 4. Dial reads back recipient, attachment, changes. Say "use my original CV". 5. Dial reads it again.
Say yes. 6. Dial says it's being sent; the Proof panel shows submitted, then delivered when the webhook lands. 7. Open the controlled
inbox and show the PDF.

## Known limitations

CJK and other non-Latin text in generated CV PDFs renders as `?` (standard PDF fonts; embedding a font is future work). Profile import
from a scanned CV is not implemented (manual entry only). Wordmark is Manrope ExtraBold because the Figma file has no wordmark vector.
Gmail sending is not implemented; Resend sends from Dial's address with the user's address as Reply-To.
