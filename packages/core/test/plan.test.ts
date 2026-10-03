import { describe, expect, test } from "vitest";
import { planApplication } from "../src";
import { harness } from "./harness";

const base = { profileConfirmed: true, hasRole: true, hasCv: true, useOriginalCv: false, email: { provider: "resend", simulated: false } };

describe("execution plan", () => {
  test("cloud request with everything in place is ready and names the consequential step", () => {
    const p = planApplication(base);
    expect(p).toMatchObject({ mode: "cloud", status: "ready" });
    expect(p.confirmations.join(" ")).toMatch(/Sending the email/);
  });
  test("missing setup is reported before claiming it can proceed", () => {
    const p = planApplication({ ...base, profileConfirmed: false, hasRole: false });
    expect(p.status).toBe("needs_setup");
    expect(p.needs.filter((n) => !n.met).map((n) => n.fixHref)).toEqual(["/app/profile", "/app/roles"]);
  });
  test("original CV is required only when asked for", () => {
    expect(planApplication({ ...base, hasCv: false }).status).toBe("ready");
    expect(planApplication({ ...base, hasCv: false, useOriginalCv: true }).status).toBe("needs_setup");
  });
  test("laptop is never executable today; cloud is offered only when it can really do the job", () => {
    const ok = planApplication({ ...base, requested: "laptop" });
    expect(ok).toMatchObject({ mode: null, status: "blocked", alternative: { mode: "cloud" } });
    expect(ok.notes.join(" ")).toMatch(/off, asleep or offline/);
    const notReady = planApplication({ ...base, requested: "laptop", hasRole: false });
    expect(notReady).toMatchObject({ mode: null, status: "blocked", alternative: null });
  });
  test("test email setups are flagged, never presented as real delivery", () => {
    const p = planApplication({ ...base, email: { provider: "sandbox", simulated: true, restrictedTo: "me@x.test" } });
    expect(p.notes.join(" ")).toMatch(/test setup/);
    expect(p.notes.join(" ")).toMatch(/me@x.test/);
  });
});

describe("service guard", () => {
  test("a laptop request is refused and creates no task or job", async () => {
    const { svc, setup } = await harness();
    const role = await setup();
    await expect(svc.prepareApplication("u1", { roleId: role.id, mode: "laptop" })).rejects.toThrow(/laptop/);
    expect(await svc.listTasks("u1")).toHaveLength(0);
  });
  test("planFor reflects stored data and records cloud mode on the task", async () => {
    const { svc, setup } = await harness();
    const role = await setup();
    expect((await svc.planFor("u1", { roleId: role.id })).status).toBe("ready");
    expect((await svc.planFor("u1", { mode: "laptop" })).status).toBe("blocked");
    const { task } = await svc.prepareApplication("u1", { roleId: role.id, mode: "cloud" });
    expect(task.executionMode).toBe("cloud");
  });
});
