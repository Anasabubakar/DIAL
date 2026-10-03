import type { Db } from "@dial/db";
import { claim, complete, fail, reapDead } from "./jobs";
import type { DialService } from "./service";

/** Processes at most one due job. Returns true if a job was handled (success or failure). */
export async function processNext(db: Db, svc: DialService, workerId: string, opts: { leaseMs?: number; backoffMs?: number } = {}): Promise<boolean> {
  for (const dead of await reapDead(db)) await svc.onJobDead(dead.type, dead.payload);
  const job = await claim(db, workerId, opts.leaseMs ?? 60_000);
  if (!job) return false;
  try {
    const taskId = job.payload.taskId as string;
    if (job.type === "prepare") await svc.runPreparation(taskId, null);
    else if (job.type === "revise") await svc.runPreparation(taskId, (job.payload.instruction as string | null) ?? null);
    else if (job.type === "send") await svc.runSend(taskId);
    else throw new Error(`unknown job type ${job.type}`);
    await complete(db, job.id);
  } catch (e) {
    const dead = await fail(db, job, e instanceof Error ? e.message : String(e), opts.backoffMs);
    if (dead) await svc.onJobDead(job.type, job.payload);
  }
  return true;
}

/** Polls for jobs until `signal.stopping` is set. Finishes the current job before returning (graceful shutdown). */
export async function runWorkerLoop(db: Db, svc: DialService, workerId: string, state: { stopping: boolean; lastTick: number }, opts: { pollMs?: number; leaseMs?: number } = {}) {
  let nextPurge = 0;
  while (!state.stopping) {
    state.lastTick = Date.now();
    if (Date.now() >= nextPurge) {
      nextPurge = Date.now() + 6 * 3600_000;
      try { const r = await svc.purgeExpired(); if (r.tasksDeleted || r.callSessionsDeleted) console.log(JSON.stringify({ msg: "retention purge", ...r })); }
      catch (e) { console.error(JSON.stringify({ msg: "retention purge failed", error: e instanceof Error ? e.message : String(e) })); }
    }
    let did = false;
    try { did = await processNext(db, svc, workerId, { leaseMs: opts.leaseMs ?? 90_000 }); }
    catch (e) { console.error(JSON.stringify({ msg: "worker loop error", error: e instanceof Error ? e.message : String(e) })); }
    if (!did) await new Promise((r) => setTimeout(r, opts.pollMs ?? 1000));
  }
}
