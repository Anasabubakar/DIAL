/**
 * One real email through the real pipeline: profile -> draft -> PDF -> review -> approve -> send via Resend.
 * Locked to CONTROLLED_RECIPIENT (the provider wrapper rejects any other address). Uses a throwaway local database.
 *   cd apps/api && set -a; . ../../.env; set +a; CONTROLLED_RECIPIENT=you@example.com pnpm exec tsx scripts/live-email-test.mts
 */
import { createDb, migrate, MIGRATIONS_DIR } from "@dial/db";
import { DialService, processNext } from "@dial/core";
import { MemoryStorage, ResendEmail, SimulatedDrafter, restrictRecipient } from "@dial/providers";

const need = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`${k} required`); return v; };
const to = need("CONTROLLED_RECIPIENT");
const email = restrictRecipient(new ResendEmail(need("RESEND_API_KEY"), "unused-in-this-test"), to);
const h = await createDb({ dataDir: "memory://" }); await migrate(h, MIGRATIONS_DIR);
const svc = new DialService({ db: h.db, storage: new MemoryStorage(), drafter: new SimulatedDrafter(), email,
  cfg: { emailFrom: need("EMAIL_FROM"), reviewSecret: "r".repeat(32), downloadSecret: "d".repeat(32), controlledRecipient: to } });
const drain = async () => { while (await processNext(h.db, svc, "live", { backoffMs: 0 })); };

await svc.saveProfile("tester", { fullName: "Dial Live Test", email: to, headline: "Frontend engineer", summary: "A one-off test of Dial's real email pipeline.",
  entries: [{ id: "e1", kind: "experience", title: "Frontend Engineer", organization: "Acme", bullets: ["Built a React design system", "Shipped a Next.js dashboard"] }] }, true);
const role = await svc.saveRole("tester", { title: "Frontend Engineer", company: "Dial Test Co", description: "A test role for React and TypeScript frontend work on a dashboard.", applyEmail: to });
const { task } = await svc.prepareApplication("tester", { roleId: role.id }); await drain();
const rev = await svc.reviewApplication("tester", task.id);
console.log("review:", { to: rev.recipient, subject: rev.subject, attachment: rev.attachment });
await svc.confirmAndSend("tester", task.id, rev.token, { kind: "live-test" }); await drain();
const d = await svc.taskDetail("tester", task.id);
console.log("task:", d.task.status, "| attempt:", d.attempt?.status, d.attempt?.provider, d.attempt?.providerMessageId, "| error:", d.attempt?.error ?? null);
// A second send to any other address must be refused by the guard (never reaches Resend).
const refused = await email.send({ from: need("EMAIL_FROM"), to: "someone.else@example.com", replyTo: to, subject: "x", text: "x", attachment: { filename: "a.pdf", content: new Uint8Array([37]), contentType: "application/pdf" }, idempotencyKey: "guard-check" });
console.log("guard:", refused);
await h.close();
