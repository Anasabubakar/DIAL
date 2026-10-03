import { createDb, migrate, MIGRATIONS_DIR } from "@dial/db";
import { randomUUID } from "node:crypto";
import { DialService, buildProviders, loadConfig, runWorkerLoop } from "@dial/core";
import { buildApp } from "./app";

const cfg = loadConfig();
const h = await createDb({ url: cfg.DATABASE_URL, dataDir: `${cfg.DATA_DIR}/pglite` });
if (process.env.RUN_MIGRATIONS === "true" || h.kind === "pglite") await migrate(h, MIGRATIONS_DIR);
const p = buildProviders(cfg);
const svc = new DialService({ db: h.db, ...p, cfg: { emailFrom: cfg.EMAIL_FROM, reviewSecret: cfg.reviewSecret, downloadSecret: cfg.downloadSecret, controlledRecipient: cfg.CONTROLLED_RECIPIENT ?? null } });
const app = await buildApp({ cfg, svc, db: h.db, email: p.email });
// Local dev only: PGlite is single-process, so the API can host the worker loop. Never in production.
const embedded = { stopping: false, lastTick: Date.now() };
if (process.env.EMBED_WORKER === "true") {
  if (cfg.NODE_ENV === "production") throw new Error("EMBED_WORKER is not allowed in production; run the worker process");
  void runWorkerLoop(h.db, svc, `embedded-${randomUUID().slice(0, 6)}`, embedded, { pollMs: 500 });
}
await app.listen({ port: cfg.PORT, host: "0.0.0.0" });
const stop = async () => { embedded.stopping = true; await app.close(); await h.close(); process.exit(0); };
process.on("SIGTERM", stop); process.on("SIGINT", stop);
