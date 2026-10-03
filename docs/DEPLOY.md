# Deploying Dial to Vercel (dial.anasmasama.dev)

Two Vercel projects from this one repo, plus Supabase (database, auth, private storage) and Resend (email).

| Project | Root directory | Domain | What it is |
|---|---|---|---|
| `dial-web` | `apps/web` | `dial.anasmasama.dev` | Next.js app |
| `dial-api` | `apps/api` | `api.dial.anasmasama.dev` | Fastify API as one Vercel function (`api/index.js`, built by `pnpm run build:vercel`) |

## DNS records to add (at the DNS host for `anasmasama.dev`)

| Type | Name | Value |
|---|---|---|
| CNAME | `dial` | `cname.vercel-dns.com` |
| CNAME | `api.dial` | `cname.vercel-dns.com` |

If the DNS host is Cloudflare, set both records to **DNS only** (grey cloud) until Vercel issues the certificates. Vercel may show a
project-specific CNAME target in the domain's settings; use that if it differs. `anasmasama.dev` is already verified in Resend for
sending, so no email DNS changes are needed.

## Why the worker is different on Vercel

Vercel has no always-on process. The jobs still live in Postgres, so nothing is lost. The API drains due jobs right after any request
that queues work (`waitUntil`), and again while someone is watching a task or polling status over the phone. For an unattended retry
(a send that timed out, say), call `GET /internal/tick` with `Authorization: Bearer $CRON_SECRET` every minute: Vercel Cron on a Pro plan,
or a free external pinger. A cron entry is deliberately **not** in `vercel.json`, because Hobby accounts only allow daily crons and a bad
one fails the deploy. Without a ticker, a stuck send resumes the next time a request arrives or the task page is open.
If you'd rather run the persistent worker, use `Dockerfile.worker` on any container host and omit the ticker.

## Environment variables

**`dial-api`**: `NODE_ENV=production`, `DATABASE_URL` (Supabase *transaction pooler*, port 6543), `SUPABASE_URL`, `SUPABASE_JWKS_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `STORAGE=supabase`, `STORAGE_BUCKET=dial-files`, `REVIEW_TOKEN_SECRET`, `DOWNLOAD_TOKEN_SECRET`, `CRON_SECRET`
(each 32+ random chars), `DRAFTER=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL` (or `DRAFTER=openai` with `OPENAI_API_KEY`, `OPENAI_MODEL`), `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`,
`RESEND_WEBHOOK_SECRET`, `EMAIL_FROM=Dial <apply@anasmasama.dev>`, `CONTROLLED_RECIPIENT`, `WEB_ORIGIN=https://dial.anasmasama.dev`,
`VOICE_MODE=demo`, `VOICE_TOOL_TOKEN`, `VOICE_DEMO_USER_ID`, `PUBLIC_PHONE_NUMBER` (once the number exists).
The API refuses to start in production if any of these are missing or if anything simulated is selected.

**`dial-web`**: `API_URL=https://api.dial.anasmasama.dev`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PUBLIC_PHONE_NUMBER`.

## Order

1. Supabase: schema is applied and tracked (`drizzle.__drizzle_migrations`), bucket `dial-files` is private. In the Supabase dashboard
   set **Authentication -> URL Configuration -> Site URL** to `https://dial.anasmasama.dev`.
2. Create both Vercel projects, set env, add both domains, add the DNS records.
3. Resend: create a webhook for `https://api.dial.anasmasama.dev/v1/webhooks/email` (events: delivered, delayed, bounced, failed), copy its
   signing secret into `RESEND_WEBHOOK_SECRET`, redeploy the API.
4. Sign up on the site, copy that user's id from Supabase Auth into `VOICE_DEMO_USER_ID`, redeploy.
5. BimpeAI: once the number is approved, set `PUBLIC_PHONE_NUMBER`, run `scripts/bimpe-setup.mts --apply` with
   `DIAL_API_URL=https://api.dial.anasmasama.dev`, then follow `docs/VOICE_AGENT.md`.
6. Smoke test with `CONTROLLED_RECIPIENT` set: the PDF must arrive in that inbox before calling it done.
