import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { createDb, migrate, MIGRATIONS_DIR } from "@dial/db";
import { DialService, buildProviders, loadConfig, runWorkerLoop } from "@dial/core";

const cfg = loadConfig();
const h = await createDb({ url: cfg.DATABASE_URL, dataDir: `${cfg.DATA_DIR}/pglite` });
if (h.kind === "pglite") await migrate(h, MIGRATIONS_DIR);
const p = buildProviders(cfg);
const svc = new DialService({ db: h.db, ...p, cfg: { emailFrom: cfg.EMAIL_FROM, reviewSecret: cfg.reviewSecret, downloadSecret: cfg.downloadSecret, controlledRecipient: cfg.CONTROLLED_RECIPIENT ?? null } });

const workerId = `worker-${randomUUID().slice(0, 8)}`;

const state = { stopping: false, lastTick: Date.now() };
// Minimal health endpoint so the platform can restart a wedged worker.
const port = Number(process.env.WORKER_HEALTH_PORT ?? 8081);
createServer((_req, res) => {
  const healthy = Date.now() - state.lastTick < 60_000;
  res.writeHead(healthy ? 200 : 503, { "content-type": "application/json" }).end(JSON.stringify({ ok: healthy, workerId }));
}).listen(port);

const stop = () => { state.stopping = true; };
process.on("SIGTERM", stop);
process.on("SIGINT", stop);

console.log(JSON.stringify({ msg: "worker started", workerId, db: h.kind, drafter: p.drafter.name, email: p.email.name }));
await runWorkerLoop(h.db, svc, workerId, state, { pollMs: Number(process.env.WORKER_POLL_MS ?? 1000) });
console.log(JSON.stringify({ msg: "worker draining and exiting", workerId }));
await h.close();
process.exit(0);
