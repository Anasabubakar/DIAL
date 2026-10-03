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

import { describeIntegrations } from "../src";
describe("integrations registry", () => {
  const ctx = { voice: { mode: "demo" as const, phoneNumber: null, isDemoUser: true }, email: { provider: "resend", simulated: false, from: "Dial <apply@x.dev>", restrictedTo: null, replyTo: "me@x.dev" } };
  test("only what's built can be connected; nothing planned has scopes or revoke controls", () => {
    const cards = describeIntegrations(ctx);
    for (const id of ["gmail", "drive", "calendar", "zapier", "laptop"]) {
      const c = cards.find((x) => x.id === id)!;
      expect(c.state).toBe("planned");
      expect(c.scopes).toEqual([]);
      expect(c.disconnect.supported).toBe(false);
      expect(c.can).toEqual([]);
    }
  });
  test("phone is waiting without a number, connected with one, off when disabled", () => {
    expect(describeIntegrations(ctx).find((c) => c.id === "phone")!.state).toBe("waiting");
    expect(describeIntegrations({ ...ctx, voice: { ...ctx.voice, phoneNumber: "+234 1" } }).find((c) => c.id === "phone")!.state).toBe("connected");
    expect(describeIntegrations({ ...ctx, voice: { ...ctx.voice, mode: "disabled" } }).find((c) => c.id === "phone")!.state).toBe("off");
  });
  test("simulated email is flagged as a test and carries an error note", () => {
    const e = describeIntegrations({ ...ctx, email: { ...ctx.email, simulated: true } }).find((c) => c.id === "email")!;
    expect(e).toMatchObject({ state: "test" });
    expect(e.error).toMatch(/Test setup/);
    expect(e.cannot.join(" ")).toMatch(/Read your inbox/);
  });
});

import { loadConfig } from "../src";
describe("drafter config", () => {
  const prod = { NODE_ENV: "production" };
  test("gemini needs a key and model; production accepts gemini but never the simulated drafter", () => {
    expect(() => loadConfig({ DRAFTER: "gemini" })).toThrow(/GEMINI_API_KEY[\s\S]*GEMINI_MODEL/);
    expect(() => loadConfig({ ...prod, DRAFTER: "simulated" })).toThrow(/DRAFTER must be gemini or openai/);
    expect(() => loadConfig({ DRAFTER: "gemini", GEMINI_API_KEY: "k", GEMINI_MODEL: "m" })).not.toThrow();
  });
});
