import { describe, expect, test } from "vitest";
import { createDb, migrate, MIGRATIONS_DIR } from "@dial/db";
import { DialService, loadConfig, processNext } from "@dial/core";
import { MemoryStorage, SandboxEmail, SimulatedDrafter } from "@dial/providers";
import { buildApp } from "../src/app";

const VOICE = "v".repeat(40);
const PROFILE = { fullName: "Ada Obi", email: "ada@example.com", headline: "Frontend engineer", summary: "", entries: [{ id: "e1", kind: "experience", title: "Frontend Engineer", organization: "Acme", bullets: ["Built a React design system"] }] };
const ROLE = { title: "Frontend Engineer", company: "Paystack", description: "React and TypeScript frontend engineer for our dashboard.", applyEmail: "jobs@paystack.test" };

async function make(env: Record<string, string> = {}) {
  const cfg = loadConfig({ NODE_ENV: "test", DEV_AUTH: "true", VOICE_MODE: "demo", VOICE_TOOL_TOKEN: VOICE, VOICE_DEMO_USER_ID: "demo", ...env });
  const h = await createDb({ dataDir: "memory://" });
  await migrate(h, MIGRATIONS_DIR);
  const email = new SandboxEmail();
  const svc = new DialService({ db: h.db, storage: new MemoryStorage(), drafter: new SimulatedDrafter(), email, cfg: { emailFrom: cfg.EMAIL_FROM, reviewSecret: cfg.reviewSecret, downloadSecret: cfg.downloadSecret } });
  const app = await buildApp({ cfg, svc, db: h.db, email });
  const drain = async () => { while (await processNext(h.db, svc, "w", { backoffMs: 0 })); };
  const web = (user: string) => ({ "x-dev-user": user });
  const voice = async (tool: string, body: object = {}, token = VOICE) =>
    (await app.inject({ method: "POST", url: `/v1/voice/tools/${tool}`, headers: { authorization: `Bearer ${token}` }, payload: body }));
  return { app, svc, email, drain, web, voice };
}

describe("config fails closed in production", () => {
  const prod = { NODE_ENV: "production" };
  test("rejects dev auth, sandbox email, simulated drafter, missing secrets", () => {
    expect(() => loadConfig({ ...prod, DEV_AUTH: "true" })).toThrow(/DEV_AUTH/);
    expect(() => loadConfig({ ...prod })).toThrow(/EMAIL_PROVIDER must be resend[\s\S]*DRAFTER must be openai/);
  });
  test("voice demo needs a long token and a user", () => {
    expect(() => loadConfig({ VOICE_MODE: "demo", VOICE_TOOL_TOKEN: "short" })).toThrow(/VOICE_TOOL_TOKEN/);
  });
});

describe("web auth", () => {
  test("no credentials -> 403; with DEV_AUTH off the dev header is ignored", async () => {
    const { app } = await make();
    expect((await app.inject({ method: "GET", url: "/v1/me" })).statusCode).toBe(403);
    const off = await make({ DEV_AUTH: "false" });
    expect((await off.app.inject({ method: "GET", url: "/v1/me", headers: off.web("u1") })).statusCode).toBe(403);
  });
  test("a forged JWT is rejected", async () => {
    const { app } = await make({ SUPABASE_JWT_SECRET: "s".repeat(40), DEV_AUTH: "false" });
    const r = await app.inject({ method: "GET", url: "/v1/me", headers: { authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSJ9.bad" } });
    expect(r.statusCode).toBe(403);
  });
  test("another user gets 404 for a task and cannot download its file", async () => {
    const { app, web, drain } = await make();
    const put = (u: string, url: string, payload: object) => app.inject({ method: url.startsWith("/v1/profile") ? "PUT" : "POST", url, headers: web(u), payload });
    await put("u1", "/v1/profile", { profile: PROFILE, confirmReviewed: true });
    const role = (await put("u1", "/v1/roles", ROLE)).json();
    const { taskId } = (await put("u1", "/v1/tasks", { roleId: role.id })).json();
    await drain();
    expect((await app.inject({ method: "GET", url: `/v1/tasks/${taskId}`, headers: web("u2") })).statusCode).toBe(404);
    expect((await app.inject({ method: "POST", url: `/v1/tasks/${taskId}/download-url`, headers: web("u2") })).statusCode).toBe(404);
    const { url } = (await app.inject({ method: "POST", url: `/v1/tasks/${taskId}/download-url`, headers: web("u1") })).json();
    const f = await app.inject({ method: "GET", url });
    expect(f.statusCode).toBe(200);
    expect(f.headers["content-type"]).toBe("application/pdf");
    expect(f.rawPayload.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

describe("voice tools", () => {
  test("bad or missing token is rejected; disabled mode refuses everything", async () => {
    const { voice } = await make();
    expect((await voice("list_saved_roles", {}, "wrong".repeat(10))).statusCode).toBe(403);
    const off = await make({ VOICE_MODE: "disabled" });
    expect((await off.voice("list_saved_roles")).statusCode).toBe(503);
  });
  test("a caller-supplied user id is rejected, never trusted", async () => {
    const { voice, svc } = await make();
    await svc.saveProfile("victim", PROFILE, true);
    const r = (await voice("list_saved_roles", { user_id: "victim" })).json();
    expect(r.ok).toBe(false);
  });
  test("full phone workflow: prepare -> status -> review -> confirm -> sent, never claims sent early", async () => {
    const { voice, svc, drain, email } = await make();
    await svc.saveProfile("demo", PROFILE, true);
    await svc.saveRole("demo", ROLE);
    expect((await voice("list_saved_roles")).json().spoken).toMatch(/Paystack/);
    const prep = (await voice("prepare_application", {})).json();
    expect(prep.ok).toBe(true);
    const taskId = prep.data.task_id as string;
    expect((await voice("get_application_status", { task_id: taskId })).json().data.status).toBe("preparing");
    await drain();
    expect((await voice("get_application_status", { task_id: taskId })).json().data.status).toBe("ready_for_review");
    const rev = (await voice("review_application", { task_id: taskId })).json();
    expect(rev.spoken).toMatch(/jobs@paystack.test/);
    const conf = (await voice("confirm_and_send", { task_id: taskId, review_token: rev.data.review_token })).json();
    expect(conf.spoken).not.toMatch(/\bsent\b/i);
    expect(email.sent).toHaveLength(0);
    await drain();
    expect(email.sent).toHaveLength(1);
    expect((await voice("get_application_status", { task_id: taskId })).json().spoken).toMatch(/accepted/);
    const a = await svc.taskDetail("demo", taskId);
    expect((a.approval!.evidence as { kind: string }).kind).toBe("voice-tool-invocation");
  });
  test("a voice caller cannot touch another user's task", async () => {
    const { voice, svc, drain } = await make();
    await svc.saveProfile("other", PROFILE, true);
    const r = await svc.saveRole("other", ROLE);
    const { task } = await svc.prepareApplication("other", { roleId: r.id });
    await drain();
    const out = (await voice("get_application_status", { task_id: task.id })).json();
    expect(out.ok).toBe(false);
    expect((await voice("review_application", { task_id: task.id })).json().ok).toBe(false);
  });
});

describe("email webhook", () => {
  test("unsigned or badly signed requests get 401; signed ones apply once", async () => {
    const { app, svc, email, drain, voice } = await make();
    await svc.saveProfile("demo", PROFILE, true); await svc.saveRole("demo", ROLE);
    const taskId = (await voice("prepare_application")).json().data.task_id; await drain();
    const tok = (await voice("review_application", { task_id: taskId })).json().data.review_token;
    await voice("confirm_and_send", { task_id: taskId, review_token: tok }); await drain();
    const mid = (await svc.latestAttempt(taskId))!.providerMessageId!;
    const body = JSON.stringify({ id: "e1", messageId: mid, delivery: "delivered" });
    const post = (sig: string) => app.inject({ method: "POST", url: "/v1/webhooks/email", headers: { "content-type": "application/json", "x-sandbox-signature": sig }, payload: body });
    expect((await post("nope")).statusCode).toBe(401);
    expect((await post(email.sign(body))).json().applied).toBe(true);
    expect((await post(email.sign(body))).json().duplicate).toBe(true);
  });
});

describe("execution modes and integrations", () => {
  test("plan endpoint reports laptop as blocked and offers cloud only when ready", async () => {
    const { app, web } = await make();
    const h = (u: string) => ({ "x-dev-user": u });
    await app.inject({ method: "PUT", url: "/v1/profile", headers: h("p1"), payload: { profile: PROFILE, confirmReviewed: true } });
    await app.inject({ method: "POST", url: "/v1/roles", headers: h("p1"), payload: ROLE });
    const laptop = (await app.inject({ method: "POST", url: "/v1/plan", headers: h("p1"), payload: { mode: "laptop" } })).json();
    expect(laptop).toMatchObject({ mode: null, status: "blocked", alternative: { mode: "cloud" } });
    const cloud = (await app.inject({ method: "POST", url: "/v1/plan", headers: h("p1"), payload: {} })).json();
    expect(cloud).toMatchObject({ mode: "cloud", status: "ready" });
    const fresh = (await app.inject({ method: "POST", url: "/v1/plan", headers: h("p-new"), payload: { mode: "laptop" } })).json();
    expect(fresh.alternative).toBeNull();
    void web;
  });
  test("starting a laptop task over the API is refused and nothing is created", async () => {
    const { app } = await make();
    const h = { "x-dev-user": "p2" };
    await app.inject({ method: "PUT", url: "/v1/profile", headers: h, payload: { profile: PROFILE, confirmReviewed: true } });
    const role = (await app.inject({ method: "POST", url: "/v1/roles", headers: h, payload: ROLE })).json();
    const r = await app.inject({ method: "POST", url: "/v1/tasks", headers: h, payload: { roleId: role.id, mode: "laptop" } });
    expect(r.statusCode).toBe(409);
    expect((await app.inject({ method: "GET", url: "/v1/tasks", headers: h })).json()).toHaveLength(0);
  });
  test("integrations are truthful: planned ones have no scopes or revoke, email test setup is flagged", async () => {
    const { app } = await make();
    const cards = (await app.inject({ method: "GET", url: "/v1/integrations", headers: { "x-dev-user": "p3" } })).json() as { id: string; state: string; scopes: string[]; error: string | null }[];
    expect(cards.find((c) => c.id === "drive")).toMatchObject({ state: "planned", scopes: [] });
    expect(cards.find((c) => c.id === "email")).toMatchObject({ state: "test" });
    expect(cards.find((c) => c.id === "email")!.error).toMatch(/Test setup/);
  });
  test("voice: 'use my laptop' gets an honest answer and creates no task", async () => {
    const { voice, svc } = await make();
    await svc.saveProfile("demo", PROFILE, true); await svc.saveRole("demo", ROLE);
    const r = (await voice("prepare_application", { mode: "laptop" })).json();
    expect(r.ok).toBe(true);
    expect(r.spoken).toMatch(/can't reach your laptop/);
    expect(r.data).toMatchObject({ status: "blocked", cloud_available: true });
    expect(await svc.listTasks("demo")).toHaveLength(0);
  });
});
