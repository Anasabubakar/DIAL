import type { Db } from "@dial/db";
import { processNext, type DialService } from "@dial/core";

/**
 * Serverless job draining. Jobs always live in Postgres, so nothing is lost if a function stops: a leased job whose
 * worker disappeared is reclaimed after its lease expires. This only decides *when* we look for due jobs.
 */
export function createDrainer(db: Db, svc: DialService, workerId: string) {
  let running = false;
  let lastKick = 0;

  /** Process due jobs until none are left or the time budget is spent. */
  async function drainFor(budgetMs: number) {
    if (running) return 0;
    running = true;
    const deadline = Date.now() + budgetMs;
    let n = 0;
    try {
      while (Date.now() < deadline && (await processNext(db, svc, workerId, { leaseMs: 60_000 }))) n++;
    } finally { running = false; }
    return n;
  }

  /** Fire-and-forget, at most once per few seconds per instance. `extend` keeps the function alive (waitUntil). */
  function kick(extend: (p: Promise<unknown>) => void, budgetMs = 25_000) {
    if (Date.now() - lastKick < 3_000) return;
    lastKick = Date.now();
    extend(drainFor(budgetMs).catch((e) => console.error(JSON.stringify({ msg: "drain failed", error: e instanceof Error ? e.message : String(e) }))));
  }
  return { drainFor, kick };
}
