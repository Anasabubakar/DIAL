import { createDb, migrate, MIGRATIONS_DIR, type DbHandle } from "@dial/db";
import { MemoryStorage, SandboxEmail, SimulatedDrafter, type Drafter } from "@dial/providers";
import { DialService, processNext } from "../src";

export const PROFILE = {
  fullName: "Ada Obi", email: "ada@example.com", headline: "Frontend engineer", summary: "Builds fast, accessible web apps.",
  entries: [
    { id: "e1", kind: "experience" as const, title: "Frontend Engineer", organization: "Acme", start: "2022", end: "2025", bullets: ["Built a React design system", "Cut page load time by migrating to Next.js"] },
    { id: "e2", kind: "project" as const, title: "Open-source charts", bullets: ["Maintained a TypeScript charting library"] },
    { id: "e3", kind: "skill" as const, title: "TypeScript, React, CSS", bullets: [] },
  ],
};
export const ROLE = { title: "Frontend Engineer", company: "Paystack", description: "We need a frontend engineer with React and TypeScript experience to build our dashboard.", applyEmail: "jobs@paystack.test" };
const PDF = new TextEncoder().encode("%PDF-1.4\n% fake original cv\n");

export async function harness(over: { drafter?: Drafter } = {}) {
  const h: DbHandle = await createDb({ dataDir: "memory://" });
  await migrate(h, MIGRATIONS_DIR);
  const email = new SandboxEmail();
  const storage = new MemoryStorage();
  const svc = new DialService({ db: h.db, storage, drafter: over.drafter ?? new SimulatedDrafter(), email, cfg: { emailFrom: "DIAL <apply@dial.test>", reviewSecret: "r".repeat(32), downloadSecret: "d".repeat(32) } });
  const drain = async () => { let n = 0; while (await processNext(h.db, svc, "w1", { backoffMs: 0 })) if (++n > 50) throw new Error("job loop"); };
  async function setup(userId = "u1") {
    await svc.saveProfile(userId, PROFILE, true);
    await svc.uploadCv(userId, "cv.pdf", PDF);
    return svc.saveRole(userId, ROLE);
  }
  async function ready(userId = "u1") {
    const role = await setup(userId);
    const { task } = await svc.prepareApplication(userId, { roleId: role.id });
    await drain();
    return { role, taskId: task.id };
  }
  return { h, svc, email, storage, drain, setup, ready };
}
