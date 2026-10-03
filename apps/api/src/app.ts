import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { randomUUID } from "node:crypto";
import { ZodError, z } from "zod";
import {
  ConfirmAndSendArgs, GetApplicationStatusArgs, ListSavedRolesArgs, PrepareApplicationArgs, ReviewApplicationArgs, ReviseApplicationArgs,
  type ToolResult,
} from "@dial/contracts";
import { DialError, type DialService } from "@dial/core";
import type { Db } from "@dial/db";
import type { EmailProvider } from "@dial/providers";
import { sql } from "drizzle-orm";
import { makeAuth } from "./auth";
import type { Config } from "@dial/core";

export interface AppDeps { cfg: Config; svc: DialService; db: Db; email: EmailProvider }

const REDACT = ["req.headers.authorization", "req.headers.cookie", "req.headers['x-api-key']", "req.headers['x-dev-user']"];

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { cfg, svc } = deps;
  const auth = makeAuth(cfg);
  const app = Fastify({
    logger: cfg.NODE_ENV === "test" ? false : { level: "info", redact: REDACT },
    genReqId: (req) => (typeof req.headers["x-request-id"] === "string" && /^[\w-]{6,64}$/.test(req.headers["x-request-id"]) ? req.headers["x-request-id"] : randomUUID()),
    bodyLimit: 7 * 1024 * 1024,
    trustProxy: true,
    maxParamLength: 600,
  });
  await app.register(cors, { origin: cfg.WEB_ORIGIN.split(","), credentials: false });
  await app.register(rateLimit, { global: true, max: 120, timeWindow: "1 minute" });
  app.addHook("onSend", async (req, reply) => { reply.header("x-request-id", req.id); reply.header("cache-control", "no-store"); });
  app.addContentTypeParser("application/pdf", { parseAs: "buffer" }, (_r, body, done) => done(null, body));
  // Raw body is needed for webhook signature verification.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    (req as FastifyRequest & { rawBody?: string }).rawBody = body as string;
    try { done(null, body === "" ? {} : JSON.parse(body as string)); } catch (e) { done(e as Error, undefined); }
  });

  app.setErrorHandler((err: unknown, req, reply) => {
    const isVoice = req.url.startsWith("/v1/voice/");
    if (err instanceof DialError) {
      if (isVoice && err.code !== "forbidden" && err.code !== "unavailable") return reply.send({ ok: false, spoken: err.message } satisfies ToolResult);
      return reply.code(err.status).send({ error: err.code, message: err.message, requestId: req.id });
    }
    if (err instanceof ZodError) {
      if (isVoice) return reply.send({ ok: false, spoken: "I didn't get the details I needed for that. Could you say it again?" } satisfies ToolResult);
      return reply.code(422).send({ error: "validation", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })), requestId: req.id });
    }
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status < 500) return reply.code(status).send({ error: "bad_request", message: (err as Error).message, requestId: req.id });
    req.log.error({ err: (err as Error).message }, "unhandled error");
    return reply.code(500).send({ error: "internal", message: "Something went wrong.", requestId: req.id });
  });

  const user = (req: FastifyRequest) => auth.webUser(req);
  const lim = (max: number) => ({ config: { rateLimit: { max, timeWindow: "1 minute" } } });

  /* ---------------- health ---------------- */
  app.get("/healthz", async () => ({ ok: true }));
  app.get("/readyz", async (_req, reply) => {
    try { await deps.db.execute(sql`select 1`); }
    catch { return reply.code(503).send({ ok: false, db: false }); }
    return {
      ok: true, db: true,
      providers: { email: deps.email.name, emailSimulated: deps.email.simulated },
      voice: cfg.VOICE_MODE, phoneConfigured: !!process.env.PUBLIC_PHONE_NUMBER,
    };
  });

  /* ---------------- web: profile / cv / roles ---------------- */
  app.get("/v1/me", async (req) => {
    const userId = await user(req);
    const [profile, cv, roles] = await Promise.all([svc.getProfile(userId), svc.activeCv(userId), svc.listRoles(userId)]);
    return {
      userId, profile, cv: cv && { id: cv.id, filename: cv.filename, sizeBytes: cv.sizeBytes, createdAt: cv.createdAt }, roles,
      voice: { mode: cfg.VOICE_MODE, isDemoUser: cfg.VOICE_MODE === "demo" && cfg.VOICE_DEMO_USER_ID === userId, phoneNumber: process.env.PUBLIC_PHONE_NUMBER ?? null },
      email: { provider: deps.email.name, simulated: deps.email.simulated, from: cfg.EMAIL_FROM, controlledRecipient: cfg.CONTROLLED_RECIPIENT ?? null },
    };
  });
  app.put("/v1/profile", lim(30), async (req) => {
    const b = z.object({ profile: z.unknown(), confirmReviewed: z.boolean().default(false) }).parse(req.body);
    return svc.saveProfile(await user(req), b.profile, b.confirmReviewed);
  });
  app.post("/v1/cv", lim(10), async (req) => {
    const userId = await user(req);
    const name = z.string().min(1).max(120).parse((req.query as { filename?: string }).filename ?? "cv.pdf");
    if (!Buffer.isBuffer(req.body)) throw new DialError("validation", "Send the PDF as application/pdf");
    const cv = await svc.uploadCv(userId, name, new Uint8Array(req.body));
    return { id: cv.id, filename: cv.filename, sizeBytes: cv.sizeBytes };
  });
  app.post("/v1/roles", lim(30), async (req) => svc.saveRole(await user(req), req.body));
  app.delete("/v1/roles/:id", async (req, reply) => { await svc.deleteRole(await user(req), (req.params as { id: string }).id); return reply.code(204).send(); });

  /* ---------------- web: tasks ---------------- */
  app.get("/v1/tasks", async (req) => svc.listTasks(await user(req)));
  app.post("/v1/tasks", lim(20), async (req) => {
    const b = z.object({ roleId: z.string(), useOriginalCv: z.boolean().optional() }).parse(req.body);
    const r = await svc.prepareApplication(await user(req), b);
    return { taskId: r.task.id, reused: r.reused };
  });
  app.get("/v1/tasks/:id", async (req) => svc.taskDetail(await user(req), (req.params as { id: string }).id));
  app.post("/v1/tasks/:id/revise", lim(20), async (req) => {
    const b = z.object({ instruction: z.string().max(500).optional(), useOriginalCv: z.boolean().optional() }).parse(req.body);
    await svc.reviseApplication(await user(req), (req.params as { id: string }).id, b);
    return { ok: true };
  });
  app.post("/v1/tasks/:id/cancel", async (req) => { await svc.cancelTask(await user(req), (req.params as { id: string }).id); return { ok: true }; });
  app.post("/v1/tasks/:id/reconcile", lim(10), async (req) => { await svc.reconcileSend(await user(req), (req.params as { id: string }).id); return { ok: true }; });
  app.post("/v1/tasks/:id/review", lim(30), async (req) => svc.reviewApplication(await user(req), (req.params as { id: string }).id));
  app.post("/v1/tasks/:id/confirm", lim(10), async (req) => {
    const userId = await user(req);
    const { reviewToken } = z.object({ reviewToken: z.string() }).parse(req.body);
    const r = await svc.confirmAndSend(userId, (req.params as { id: string }).id, reviewToken, { kind: "web-click", at: new Date().toISOString(), requestId: req.id });
    return { queued: true, alreadyQueued: r.alreadyQueued };
  });
  app.post("/v1/tasks/:id/download-url", async (req) => {
    const userId = await user(req);
    const t = await svc.ownedTask(userId, (req.params as { id: string }).id);
    if (!t.currentVersion) throw new DialError("not_found", "No document yet");
    return { url: `/v1/files/${svc.signDownload(userId, t.id, t.currentVersion)}`, expiresInSec: 300 };
  });
  app.get("/v1/files/:token", async (req, reply) => {
    const f = await svc.redeemDownload((req.params as { token: string }).token);
    return reply.header("content-type", "application/pdf").header("content-disposition", `inline; filename="${f.filename.replace(/"/g, "")}"`).send(Buffer.from(f.bytes));
  });
  app.delete("/v1/account", lim(3), async (req, reply) => { await svc.deleteAccountData(await user(req)); return reply.code(204).send(); });

  /** Server-Sent Events: pushes the task detail whenever its event count or status changes. */
  app.get("/v1/tasks/:id/stream", async (req, reply) => {
    const userId = await user(req);
    const id = (req.params as { id: string }).id;
    await svc.ownedTask(userId, id);
    reply.hijack();
    reply.raw.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive", "access-control-allow-origin": cfg.WEB_ORIGIN.split(",")[0]! });
    let last = "";
    let closed = false;
    req.raw.on("close", () => { closed = true; });
    while (!closed) {
      try {
        const d = await svc.taskDetail(userId, id);
        const sig = `${d.task.status}:${d.events.length}:${d.attempt?.deliveryStatus}`;
        if (sig !== last) { last = sig; reply.raw.write(`event: task\ndata: ${JSON.stringify(d)}\n\n`); }
        else reply.raw.write(": ping\n\n");
      } catch { break; }
      await new Promise((r) => setTimeout(r, 1500));
    }
    reply.raw.end();
  });

  /* ---------------- email webhooks ---------------- */
  app.post("/v1/webhooks/email", { config: { rateLimit: { max: 300, timeWindow: "1 minute" } } }, async (req, reply) => {
    const raw = (req as FastifyRequest & { rawBody?: string }).rawBody ?? "";
    let evt;
    try { evt = deps.email.parseWebhook(raw, req.headers); } catch { return reply.code(401).send({ error: "invalid_signature" }); }
    const r = await svc.handleDelivery(deps.email.name, evt);
    return { ok: true, ...r };
  });

  /* ---------------- voice tools (BimpeAI custom HTTP tools) ---------------- */
  const voice = async <T>(req: FastifyRequest, reply: FastifyReply, schema: z.ZodType<T>, run: (a: T, ctx: { userId: string; callSessionId: string; fp: string }) => Promise<ToolResult>) => {
    const { userId, fp } = auth.voiceUser(req);
    const args = schema.parse(req.body ?? {});
    const callSessionId = await svc.ensureCallSession(userId, "voice-demo", fp);
    return reply.send(await run(args, { userId, callSessionId, fp }));
  };
  const V = (name: string, max: number) => ({ url: `/v1/voice/tools/${name}`, ...lim(max) });

  app.post("/v1/voice/tools/list_saved_roles", lim(60), async (req, reply) => voice(req, reply, ListSavedRolesArgs, async (_a, { userId }) => {
    const rs = await svc.listRoles(userId);
    return { ok: true, spoken: rs.length ? `You have ${rs.length} saved ${rs.length === 1 ? "role" : "roles"}: ${rs.map((r) => `${r.title} at ${r.company}`).join("; ")}.` : "You don't have any saved roles yet.", data: { roles: rs.map((r) => ({ role_id: r.id, title: r.title, company: r.company })) } };
  }));
  void V;
  app.post("/v1/voice/tools/prepare_application", lim(20), async (req, reply) => voice(req, reply, PrepareApplicationArgs, async (a, { userId, callSessionId }) => {
    const role = await svc.resolveRole(userId, a.role_id, a.role_hint);
    const { task, reused } = await svc.prepareApplication(userId, { roleId: role.id, useOriginalCv: a.use_original_cv, callSessionId });
    return { ok: true, spoken: reused ? `I'm already working on your ${role.company} application.` : `Okay, I'm preparing your application for ${role.title} at ${role.company}. Ask me for the status in a few seconds.`, data: { task_id: task.id, status: task.status } };
  }));
  app.post("/v1/voice/tools/get_application_status", lim(120), async (req, reply) => voice(req, reply, GetApplicationStatusArgs, async (a, { userId }) => {
    const s = await svc.getStatus(userId, a.task_id);
    return { ok: true, spoken: s.spoken, data: { task_id: a.task_id, status: s.task.status, delivery: s.attempt?.deliveryStatus ?? "none" } };
  }));
  app.post("/v1/voice/tools/revise_application", lim(20), async (req, reply) => voice(req, reply, ReviseApplicationArgs, async (a, { userId }) => {
    await svc.reviseApplication(userId, a.task_id, { instruction: a.use_original_cv && a.instruction.length < 3 ? undefined : a.instruction, useOriginalCv: a.use_original_cv });
    return { ok: true, spoken: a.use_original_cv ? "Done, I'm switching to your original CV. Any earlier approval no longer applies." : "Okay, I'm updating the draft. Any earlier approval no longer applies.", data: { task_id: a.task_id, status: "preparing" } };
  }));
  app.post("/v1/voice/tools/review_application", lim(30), async (req, reply) => voice(req, reply, ReviewApplicationArgs, async (a, { userId }) => {
    const r = await svc.reviewApplication(userId, a.task_id);
    return {
      ok: true,
      spoken: `Here's what I'd send. It goes to ${r.recipient}, subject: ${r.subject}. The attachment is ${r.attachment}. ${r.changeSummary.join(" ")} Do you want me to send it?`,
      data: { review_token: r.token, recipient: r.recipient, subject: r.subject, attachment: r.attachmentChoice, version: r.version, expires_in_sec: r.expiresInSec },
    };
  }));
  app.post("/v1/voice/tools/confirm_and_send", lim(10), async (req, reply) => voice(req, reply, ConfirmAndSendArgs, async (a, { userId, callSessionId, fp }) => {
    const r = await svc.confirmAndSend(userId, a.task_id, a.review_token, {
      kind: "voice-tool-invocation", callSessionId, tokenFingerprint: fp, at: new Date().toISOString(),
      note: "Platform provides no caller audio or per-call identity; this records that the agent invoked the tool with a valid review token.",
    });
    return { ok: true, spoken: r.alreadyQueued ? "That one is already on its way. Ask me for the status if you like." : "Approved. I'm sending it now. I'll tell you once the email service has accepted it.", data: { task_id: a.task_id, status: r.task.status } };
  }));

  return app;
}
