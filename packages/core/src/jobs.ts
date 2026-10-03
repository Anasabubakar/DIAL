import { sql, eq } from "drizzle-orm";
import { jobs, type Db } from "@dial/db";
import { newId, rowsOf } from "./util";

export interface Job { id: string; type: string; payload: Record<string, unknown>; attempts: number; maxAttempts: number }

export async function enqueue(db: Db, type: string, payload: Record<string, unknown>, opts: { maxAttempts?: number; delayMs?: number } = {}) {
  const id = newId("job");
  await db.insert(jobs).values({
    id, type, payload, maxAttempts: opts.maxAttempts ?? 4,
    runAt: new Date(Date.now() + (opts.delayMs ?? 0)),
  });
  return id;
}

const map = (r: Record<string, unknown>): Job => ({
  id: r.id as string, type: r.type as string, payload: r.payload as Record<string, unknown>,
  attempts: Number(r.attempts), maxAttempts: Number(r.max_attempts),
});

/** Jobs whose lease expired after their final attempt are dead; surface them so callers can fail the task. */
export async function reapDead(db: Db): Promise<Job[]> {
  const res = await db.execute(sql`
    UPDATE jobs SET status = 'dead', last_error = coalesce(last_error, 'lease expired after final attempt')
    WHERE status = 'leased' AND lease_expires_at < now() AND attempts >= max_attempts
    RETURNING id, type, payload, attempts, max_attempts`);
  return rowsOf<Record<string, unknown>>(res).map(map);
}

/** Atomically claims one due job (queued, or leased with an expired lease). Safe across many workers. */
export async function claim(db: Db, workerId: string, leaseMs: number): Promise<Job | null> {
  const res = await db.execute(sql`
    UPDATE jobs SET status = 'leased', leased_by = ${workerId}, attempts = attempts + 1,
      lease_expires_at = now() + (${leaseMs} * interval '1 millisecond')
    WHERE id = (
      SELECT id FROM jobs
      WHERE (status = 'queued' AND run_at <= now())
         OR (status = 'leased' AND lease_expires_at < now() AND attempts < max_attempts)
      ORDER BY run_at LIMIT 1 FOR UPDATE SKIP LOCKED)
    RETURNING id, type, payload, attempts, max_attempts`);
  const r = rowsOf<Record<string, unknown>>(res)[0];
  return r ? map(r) : null;
}

export async function complete(db: Db, id: string) {
  await db.update(jobs).set({ status: "done", leaseExpiresAt: null }).where(eq(jobs.id, id));
}

/** Retry with exponential backoff, or mark dead once attempts are exhausted. Returns true if dead. */
export async function fail(db: Db, job: Job, error: string, baseBackoffMs = 2000): Promise<boolean> {
  const msg = error.slice(0, 500);
  if (job.attempts >= job.maxAttempts) {
    await db.update(jobs).set({ status: "dead", lastError: msg, leaseExpiresAt: null }).where(eq(jobs.id, job.id));
    return true;
  }
  const delay = baseBackoffMs * 2 ** (job.attempts - 1);
  await db.update(jobs).set({ status: "queued", lastError: msg, leaseExpiresAt: null, runAt: new Date(Date.now() + delay) }).where(eq(jobs.id, job.id));
  return false;
}
