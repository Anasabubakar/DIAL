import type { IncomingMessage, ServerResponse } from "node:http";
import { waitUntil } from "@vercel/functions";
import { createDb } from "@dial/db";
import { DialService, buildProviders, loadConfig } from "@dial/core";
import { buildApp } from "./app";
import { createDrainer } from "./kick";
import type { FastifyInstance } from "fastify";

/** Vercel entrypoint. Same app as the server, started once per instance. Requires DATABASE_URL (no embedded database here). */
let ready: Promise<FastifyInstance> | null = null;

function boot(): Promise<FastifyInstance> {
  return (async () => {
    const cfg = loadConfig();
    if (!cfg.DATABASE_URL) throw new Error("DATABASE_URL is required on Vercel");
    const h = await createDb({ url: cfg.DATABASE_URL });
    const p = buildProviders(cfg);
    const svc = new DialService({ db: h.db, ...p, cfg: { emailFrom: cfg.EMAIL_FROM, reviewSecret: cfg.reviewSecret, downloadSecret: cfg.downloadSecret, controlledRecipient: cfg.CONTROLLED_RECIPIENT ?? null } });
    const d = createDrainer(h.db, svc, `vercel-${Math.random().toString(36).slice(2, 8)}`);
    const app = await buildApp({ cfg, svc, db: h.db, email: p.email, kick: () => d.kick((p) => waitUntil(p)), drain: d.drainFor });
    await app.ready();
    return app;
  })();
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    ready ??= boot();
    const app = await ready;
    app.server.emit("request", req, res);
  } catch (e) {
    ready = null; // let the next request retry boot
    console.error(JSON.stringify({ msg: "boot failed", error: e instanceof Error ? e.message : String(e) }));
    res.statusCode = 503; res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "unavailable", message: "Dial is starting up or misconfigured." }));
  }
}
