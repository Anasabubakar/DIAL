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
