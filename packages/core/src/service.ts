import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  approvals, callSessions, cvs, draftVersions, emailAttempts, jobs, profiles, roles, taskEvents, tasks, webhookEvents, type Db,
} from "@dial/db";
import {
  DraftOutput, ProfileInput, RoleInput, TASK_TRANSITIONS,
  type AttachmentChoice, type TaskEventType, type TaskStatus,
} from "@dial/contracts";
import type { Drafter, EmailProvider, StorageProvider } from "@dial/providers";
import { DialError } from "./errors";
import { enqueue } from "./jobs";
import { renderCvPdf } from "./pdf";
import { draftContentHash, newId, sha256, signToken, verifyToken } from "./util";

export interface CoreConfig {
  emailFrom: string;
  reviewSecret: string;
  reviewTtlSec?: number;
  downloadSecret: string;
  maxDraftAttempts?: number;
}
export interface Deps { db: Db; storage: StorageProvider; drafter: Drafter; email: EmailProvider; cfg: CoreConfig }
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Q = Db | Tx;

const MAX_CV_BYTES = 5 * 1024 * 1024;
const ACTIVE: TaskStatus[] = ["preparing", "ready_for_review", "sending", "send_uncertain"];

const safeName = (s: string) => s.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "CV";

export class DialService {
  constructor(private d: Deps) {}
  private get db() { return this.d.db; }

  /* ------------------------------ events & transitions ------------------------------ */

  private async ev(q: Q, taskId: string, type: TaskEventType, message: string, data?: Record<string, unknown>) {
    await q.insert(taskEvents).values({ id: newId("evt"), taskId, type, message, data });
  }

  /** Atomic conditional transition. Returns false if the task was not in an allowed source state. */
  private async move(q: Q, taskId: string, from: TaskStatus[], to: TaskStatus, extra: Partial<typeof tasks.$inferInsert> = {}) {
    for (const f of from) if (!TASK_TRANSITIONS[f].includes(to)) throw new Error(`illegal transition ${f} -> ${to}`);
    const res = await q.update(tasks).set({ status: to, updatedAt: new Date(), ...extra })
      .where(and(eq(tasks.id, taskId), inArray(tasks.status, from))).returning({ id: tasks.id });
    return res.length > 0;
  }

  /* ------------------------------ profile / cv / roles ------------------------------ */

  async getProfile(userId: string) {
    return (await this.db.select().from(profiles).where(eq(profiles.userId, userId)))[0] ?? null;
  }

  /** Any edit clears verification unless the caller explicitly confirms the reviewed profile. */
  async saveProfile(userId: string, raw: unknown, confirmReviewed: boolean) {
    const p = ProfileInput.parse(raw);
    const ids = new Set<string>();
    for (const e of p.entries) { if (ids.has(e.id)) throw new DialError("validation", `duplicate entry id ${e.id}`); ids.add(e.id); }
    const row = { fullName: p.fullName, email: p.email, headline: p.headline, summary: p.summary, entries: p.entries, verifiedAt: confirmReviewed ? new Date() : null, updatedAt: new Date() };
    await this.db.insert(profiles).values({ userId, ...row }).onConflictDoUpdate({ target: profiles.userId, set: row });
    return this.getProfile(userId);
  }

  async uploadCv(userId: string, filename: string, bytes: Uint8Array) {
    if (bytes.length === 0 || bytes.length > MAX_CV_BYTES) throw new DialError("validation", "CV must be a PDF under 5 MB");
    if (Buffer.from(bytes.slice(0, 5)).toString("latin1") !== "%PDF-") throw new DialError("validation", "Only PDF files are accepted");
    const id = newId("cv");
    const storagePath = `u/${userId}/cv/${id}.pdf`;
    await this.d.storage.put(storagePath, bytes, "application/pdf");
    await this.db.transaction(async (tx) => {
      await tx.update(cvs).set({ isActive: false }).where(eq(cvs.userId, userId));
      await tx.insert(cvs).values({ id, userId, filename: safeName(filename).replace(/(\.pdf)?$/i, ".pdf"), storagePath, sha256: sha256(bytes), sizeBytes: bytes.length });
    });
    return (await this.db.select().from(cvs).where(eq(cvs.id, id)))[0]!;
  }
  async activeCv(userId: string) {
    return (await this.db.select().from(cvs).where(and(eq(cvs.userId, userId), eq(cvs.isActive, true))))[0] ?? null;
  }

  async saveRole(userId: string, raw: unknown) {
    const r = RoleInput.parse(raw);
    const id = newId("role");
    await this.db.insert(roles).values({ id, userId, ...r });
    return (await this.db.select().from(roles).where(eq(roles.id, id)))[0]!;
  }
  async listRoles(userId: string) {
    return this.db.select().from(roles).where(eq(roles.userId, userId)).orderBy(desc(roles.createdAt));
  }
  async deleteRole(userId: string, roleId: string) {
    const used = await this.db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.roleId, roleId), eq(tasks.userId, userId), inArray(tasks.status, ACTIVE)));
    if (used.length) throw new DialError("conflict", "This role has an application in progress");
    const r = await this.db.delete(roles).where(and(eq(roles.id, roleId), eq(roles.userId, userId))).returning({ id: roles.id });
    if (!r.length) throw new DialError("not_found", "Role not found");
  }

  /** Voice helper: resolves a role from an id or a spoken hint, only within the user's own roles. */
  async resolveRole(userId: string, roleId?: string, hint?: string) {
    const all = await this.listRoles(userId);
    if (roleId) {
      const r = all.find((x) => x.id === roleId);
      if (!r) throw new DialError("not_found", "I couldn't find that saved role.");
      return r;
    }
    if (hint) {
      const h = hint.toLowerCase();
      const m = all.filter((x) => `${x.title} ${x.company}`.toLowerCase().includes(h) || h.includes(x.company.toLowerCase()));
      if (m.length === 1) return m[0]!;
      if (m.length > 1) throw new DialError("conflict", "More than one saved role matches. Which company is it?");
    }
    if (all.length === 1) return all[0]!;
    if (!all.length) throw new DialError("not_found", "You have no saved roles yet.");
    throw new DialError("conflict", "You have several saved roles. Which one should I apply for?");
  }

  async ensureCallSession(userId: string, channel: string, tokenFingerprint: string) {
    const recent = (await this.db.select().from(callSessions)
      .where(and(eq(callSessions.userId, userId), eq(callSessions.channel, channel), sql`${callSessions.startedAt} > now() - interval '30 minutes'`))
      .orderBy(desc(callSessions.startedAt)).limit(1))[0];
    if (recent) return recent.id;
    const id = newId("call");
    await this.db.insert(callSessions).values({ id, userId, channel, tokenFingerprint });
    return id;
  }

  /* ------------------------------ tasks: prepare / revise ------------------------------ */

  async ownedTask(userId: string, taskId: string) {
    const t = (await this.db.select().from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId))))[0];
    if (!t) throw new DialError("not_found", "I couldn't find that application.");
    return t;
  }

  async prepareApplication(userId: string, a: { roleId: string; useOriginalCv?: boolean; callSessionId?: string }) {
    const role = (await this.db.select().from(roles).where(and(eq(roles.id, a.roleId), eq(roles.userId, userId))))[0];
    if (!role) throw new DialError("not_found", "Role not found");
    const profile = await this.getProfile(userId);
    if (!profile?.verifiedAt) throw new DialError("invalid_state", "Your profile needs to be reviewed and confirmed before I can prepare an application.");
    if (a.useOriginalCv && !(await this.activeCv(userId))) throw new DialError("invalid_state", "No original CV has been uploaded.");

    const existing = (await this.db.select().from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.roleId, role.id), inArray(tasks.status, ACTIVE))).orderBy(desc(tasks.createdAt)).limit(1))[0];
    if (existing) return { task: existing, reused: true };

    const id = newId("task");
    await this.db.transaction(async (tx) => {
      await tx.insert(tasks).values({ id, userId, roleId: role.id, callSessionId: a.callSessionId, status: "preparing", attachmentChoice: a.useOriginalCv ? "original" : "tailored" });
      await this.ev(tx, id, "task_created", `Application for ${role.title} at ${role.company} started.`);
      await tx.insert(jobs).values({ id: newId("job"), type: "prepare", payload: { taskId: id } });
    });
    return { task: await this.ownedTask(userId, id), reused: false };
  }

  async reviseApplication(userId: string, taskId: string, a: { instruction?: string; useOriginalCv?: boolean }) {
    const t = await this.ownedTask(userId, taskId);
    if (a.useOriginalCv && !(await this.activeCv(userId))) throw new DialError("invalid_state", "No original CV has been uploaded.");
    const choice: AttachmentChoice = a.useOriginalCv ? "original" : (t.attachmentChoice as AttachmentChoice);
    const ok = await this.db.transaction(async (tx) => {
      // Leaving ready_for_review is what invalidates any earlier review/approval.
      const moved = await this.move(tx, taskId, ["ready_for_review", "failed"], "preparing", { attachmentChoice: choice, lastError: null });
      if (!moved) return false;
      await this.ev(tx, taskId, "revision_requested", a.useOriginalCv ? "Switched to your original CV." : "Revision requested.", { instruction: a.instruction?.slice(0, 200) });
      await tx.insert(jobs).values({ id: newId("job"), type: "revise", payload: { taskId, instruction: a.instruction ?? null } });
      return true;
    });
    if (!ok) throw new DialError("invalid_state", "This application can't be revised right now.");
    return this.ownedTask(userId, taskId);
  }

  async cancelTask(userId: string, taskId: string) {
    await this.ownedTask(userId, taskId);
    const ok = await this.db.transaction(async (tx) => {
      const m = await this.move(tx, taskId, ["preparing", "ready_for_review"], "cancelled");
      if (m) await this.ev(tx, taskId, "revision_requested", "Application cancelled.");
      return m;
    });
    if (!ok) throw new DialError("invalid_state", "This application can no longer be cancelled.");
  }

  private validateDraft(raw: unknown, profileIds: Set<string>): DraftOutput {
    const out = DraftOutput.parse(raw);
    for (const id of out.selectedEntryIds) if (!profileIds.has(id)) throw new Error(`draft cites unknown profile entry ${id}`);
    for (const w of out.cvWording) if (!profileIds.has(w.entryId)) throw new Error(`draft rewords unknown profile entry ${w.entryId}`);
    return out;
  }

  /** Worker handler for "prepare" and "revise". Throws on transient failure (job retries); persists deterministic failure. */
  async runPreparation(taskId: string, instruction: string | null): Promise<void> {
    const t = (await this.db.select().from(tasks).where(eq(tasks.id, taskId)))[0];
    if (!t || t.status !== "preparing") return; // cancelled, superseded, or already done
    const [role] = await this.db.select().from(roles).where(eq(roles.id, t.roleId));
    const profileRow = await this.getProfile(t.userId);
    if (!role || !profileRow) return this.failTask(taskId, "preparation_failed", "Role or profile is missing.");
    if (!profileRow.verifiedAt) return this.failTask(taskId, "preparation_failed", "Profile is not confirmed.");
    const profile = ProfileInput.parse(profileRow);
    const profileIds = new Set(profile.entries.map((e) => e.id));
    await this.ev(this.db, taskId, "preparation_started", "Reading the role and your profile.");

    const prevRow = t.currentVersion > 0
      ? (await this.db.select().from(draftVersions).where(and(eq(draftVersions.taskId, taskId), eq(draftVersions.version, t.currentVersion))))[0]
      : undefined;
    const attachmentChoice = t.attachmentChoice as AttachmentChoice;

    let draft: DraftOutput | null = null;
    const reuseText = !!prevRow && !instruction; // only the attachment (or a retry) changed
    if (reuseText && prevRow) {
      draft = { subject: prevRow.subject, body: prevRow.body, selectedEntryIds: prevRow.supportingEntryIds, cvWording: prevRow.cvWording, changeSummary: prevRow.changeSummary };
    } else {
      const previous = prevRow ? { subject: prevRow.subject, body: prevRow.body, selectedEntryIds: prevRow.supportingEntryIds, cvWording: prevRow.cvWording, changeSummary: prevRow.changeSummary } : undefined;
      let lastErr = "";
      for (let i = 0; i < (this.d.cfg.maxDraftAttempts ?? 3); i++) {
        try {
          draft = this.validateDraft(await this.d.drafter.draft({ profile, role: { title: role.title, company: role.company, description: role.description }, instruction: instruction ?? undefined, previous }), profileIds);
          break;
        } catch (e) { lastErr = e instanceof Error ? e.message : String(e); draft = null; }
      }
      if (!draft) return this.failTask(taskId, "preparation_failed", "I couldn't produce a valid draft. Your profile and role are unchanged.", lastErr);
    }

    // Attachment bytes
    let bytes: Uint8Array, filename: string;
    if (attachmentChoice === "original") {
      const cv = await this.activeCv(t.userId);
      if (!cv) return this.failTask(taskId, "preparation_failed", "Your original CV is no longer available.");
      bytes = await this.d.storage.get(cv.storagePath); filename = cv.filename;
      if (sha256(bytes) !== cv.sha256) return this.failTask(taskId, "preparation_failed", "Stored CV failed its integrity check.");
    } else {
      bytes = await renderCvPdf({ profile, selectedEntryIds: draft.selectedEntryIds, wording: draft.cvWording });
      filename = `${safeName(profile.fullName)}-CV.pdf`;
    }

    const version = t.currentVersion + 1;
    const attachmentPath = `u/${t.userId}/tasks/${taskId}/v${version}.pdf`;
    await this.d.storage.put(attachmentPath, bytes, "application/pdf");
    const attachmentSha256 = sha256(bytes);
    const contentHash = draftContentHash({ version, recipient: role.applyEmail, subject: draft.subject, body: draft.body, attachmentSha256, attachmentFilename: filename });
    const d = draft;
    await this.db.transaction(async (tx) => {
      const moved = await this.move(tx, taskId, ["preparing"], "ready_for_review", { currentVersion: version, lastError: null });
      if (!moved) return;
      await tx.insert(draftVersions).values({
        id: newId("draft"), taskId, version, subject: d.subject, body: d.body, recipient: role.applyEmail, attachmentChoice,
        attachmentPath, attachmentSha256, attachmentFilename: filename, changeSummary: d.changeSummary, supportingEntryIds: d.selectedEntryIds,
        cvWording: d.cvWording, contentHash, instruction,
      });
      await this.ev(tx, taskId, "draft_created", `Draft ${version} is ready for review.`, { version, attachment: attachmentChoice });
    });
  }

  async failTask(taskId: string, type: TaskEventType, userMessage: string, detail?: string) {
    await this.db.transaction(async (tx) => {
      const m = await this.move(tx, taskId, ["preparing", "sending", "send_uncertain"], "failed", { lastError: userMessage });
      if (m) await this.ev(tx, taskId, type, userMessage, detail ? { detail: detail.slice(0, 300) } : undefined);
    });
  }

  /** Called when a job exhausts its attempts. */
  async onJobDead(type: string, payload: Record<string, unknown>) {
    const taskId = payload.taskId as string | undefined;
    if (!taskId) return;
    if (type === "prepare" || type === "revise") await this.failTask(taskId, "preparation_failed", "Preparation kept failing. Your saved data is unchanged; you can retry.");
    // For "send" the task intentionally stays send_uncertain; a human reconciles it (never auto-resend blindly).
  }

  /* ------------------------------ review / approve / send ------------------------------ */

  /** Recomputes the hash from the row's actual fields so a tampered row can never match an approval. */
  private draftIsIntact(dr: typeof draftVersions.$inferSelect) {
    return draftContentHash({ version: dr.version, recipient: dr.recipient, subject: dr.subject, body: dr.body, attachmentSha256: dr.attachmentSha256, attachmentFilename: dr.attachmentFilename }) === dr.contentHash;
  }

  async currentDraft(taskId: string, version: number) {
    return (await this.db.select().from(draftVersions).where(and(eq(draftVersions.taskId, taskId), eq(draftVersions.version, version))))[0] ?? null;
  }

  async reviewApplication(userId: string, taskId: string) {
    const t = await this.ownedTask(userId, taskId);
    if (t.status !== "ready_for_review") throw new DialError("invalid_state", t.status === "preparing" ? "The draft isn't ready yet." : "There's nothing to review right now.");
    const dr = await this.currentDraft(taskId, t.currentVersion);
    if (!dr) throw new DialError("invalid_state", "No draft found.");
    const exp = Math.floor(Date.now() / 1000) + (this.d.cfg.reviewTtlSec ?? 600);
    const token = signToken({ uid: userId, tid: taskId, v: dr.version, h: dr.contentHash, exp }, this.d.cfg.reviewSecret);
    await this.ev(this.db, taskId, "review_issued", `Draft ${dr.version} was read back for approval.`, { version: dr.version });
    return {
      token, expiresInSec: this.d.cfg.reviewTtlSec ?? 600, version: dr.version, recipient: dr.recipient, subject: dr.subject, body: dr.body,
      attachment: dr.attachmentChoice === "original" ? `your original CV (${dr.attachmentFilename})` : `a tailored CV (${dr.attachmentFilename})`,
      attachmentChoice: dr.attachmentChoice as AttachmentChoice, changeSummary: dr.changeSummary,
    };
  }

  /**
   * Validates the review token against the CURRENT immutable draft, then atomically claims the send.
   * Returns once the send is durably queued; it never claims the email was sent.
   */
  async confirmAndSend(userId: string, taskId: string, reviewToken: string, evidence: Record<string, unknown>) {
    const tok = verifyToken<{ uid: string; tid: string; v: number; h: string; exp: number }>(reviewToken, this.d.cfg.reviewSecret);
    if (!tok || tok.uid !== userId || tok.tid !== taskId) throw new DialError("forbidden", "That review is no longer valid. Let me read it back again.");
    const t = await this.ownedTask(userId, taskId);
    if (t.status === "sending" || t.status === "sent" || t.status === "send_uncertain") {
      const a = await this.latestAttempt(taskId);
      if (a && a.draftVersion === tok.v) return { alreadyQueued: true as const, task: t };
    }
    const dr = await this.currentDraft(taskId, tok.v);
    if (!dr || t.currentVersion !== tok.v || dr.contentHash !== tok.h || !this.draftIsIntact(dr) || t.status !== "ready_for_review")
      throw new DialError("invalid_state", "The draft changed after it was reviewed. Let me read it back again.");
    // Re-check what will actually be attached.
    const bytes = await this.d.storage.get(dr.attachmentPath);
    if (sha256(bytes) !== dr.attachmentSha256) throw new DialError("invalid_state", "The attachment failed its integrity check. Please regenerate the draft.");

    const idem = `dial:${taskId}:v${dr.version}:${dr.contentHash.slice(0, 16)}`;
    const claimed = await this.db.transaction(async (tx) => {
      const ok = await tx.update(tasks).set({ status: "sending", updatedAt: new Date() })
        .where(and(eq(tasks.id, taskId), eq(tasks.status, "ready_for_review"), eq(tasks.currentVersion, tok.v))).returning({ id: tasks.id });
      if (!ok.length) return false; // a concurrent confirmation won
      await tx.insert(approvals).values({ id: newId("appr"), taskId, draftVersion: dr.version, contentHash: dr.contentHash, evidence });
      await tx.insert(emailAttempts).values({ id: newId("att"), taskId, draftVersion: dr.version, idempotencyKey: idem, provider: this.d.email.name });
      await tx.insert(jobs).values({ id: newId("job"), type: "send", payload: { taskId }, maxAttempts: 6 });
      await this.ev(tx, taskId, "approval_recorded", `Draft ${dr.version} approved.`, { version: dr.version, evidence });
      await this.ev(tx, taskId, "send_queued", "Sending queued.");
      return true;
    });
    if (!claimed) {
      const a = await this.latestAttempt(taskId);
      if (a && a.draftVersion === tok.v) return { alreadyQueued: true as const, task: await this.ownedTask(userId, taskId) };
      throw new DialError("invalid_state", "The draft changed after it was reviewed. Let me read it back again.");
    }
    return { alreadyQueued: false as const, task: await this.ownedTask(userId, taskId) };
  }

  async latestAttempt(taskId: string) {
    return (await this.db.select().from(emailAttempts).where(eq(emailAttempts.taskId, taskId)).orderBy(desc(emailAttempts.createdAt)).limit(1))[0] ?? null;
  }

  /** Worker handler for "send". Re-running with the same attempt re-uses the same idempotency key. */
  async runSend(taskId: string): Promise<void> {
    const a = await this.latestAttempt(taskId);
    const t = (await this.db.select().from(tasks).where(eq(tasks.id, taskId)))[0];
    if (!a || !t) return;
    if (a.status === "submitted" || a.status === "failed") return; // terminal: never send twice
    if (t.status === "send_uncertain") await this.move(this.db, taskId, ["send_uncertain"], "sending");
    const dr = await this.currentDraft(taskId, a.draftVersion);
    const [profile] = await this.db.select().from(profiles).where(eq(profiles.userId, t.userId));
    if (!dr || !profile) { await this.markAttemptFailed(a.id, taskId, "Draft or profile missing."); return; }
    if (!this.draftIsIntact(dr)) { await this.markAttemptFailed(a.id, taskId, "Draft failed its integrity check."); return; }
    const bytes = await this.d.storage.get(dr.attachmentPath);
    if (sha256(bytes) !== dr.attachmentSha256) { await this.markAttemptFailed(a.id, taskId, "Attachment failed its integrity check."); return; }

    const res = await this.d.email.send({
      from: this.d.cfg.emailFrom, to: dr.recipient, replyTo: profile.email, subject: dr.subject, text: dr.body,
      attachment: { filename: dr.attachmentFilename, content: bytes, contentType: "application/pdf" }, idempotencyKey: a.idempotencyKey,
    });
    if (res.kind === "submitted") {
      await this.db.transaction(async (tx) => {
        await tx.update(emailAttempts).set({ status: "submitted", deliveryStatus: sql`CASE WHEN ${emailAttempts.deliveryStatus} = 'none' THEN 'submitted' ELSE ${emailAttempts.deliveryStatus} END`, providerMessageId: res.providerMessageId, error: null, updatedAt: new Date() }).where(eq(emailAttempts.id, a.id));
        await this.move(tx, taskId, ["sending", "send_uncertain"], "sent");
        await this.ev(tx, taskId, "send_submitted", `The email service (${this.d.email.name}) accepted the message. Inbox delivery is tracked separately.`, { providerMessageId: res.providerMessageId, simulated: this.d.email.simulated });
      });
    } else if (res.kind === "rejected") {
      await this.markAttemptFailed(a.id, taskId, res.error);
    } else {
      await this.db.transaction(async (tx) => {
        await tx.update(emailAttempts).set({ status: "uncertain", error: res.error.slice(0, 300), updatedAt: new Date() }).where(eq(emailAttempts.id, a.id));
        if (await this.move(tx, taskId, ["sending"], "send_uncertain")) await this.ev(tx, taskId, "send_uncertain", "I couldn't confirm whether the email was accepted. Retrying safely with the same idempotency key.", { error: res.error.slice(0, 200) });
      });
      throw new Error(`send outcome uncertain: ${res.error}`); // job retry with backoff
    }
  }

  private async markAttemptFailed(attemptId: string, taskId: string, error: string) {
    await this.db.transaction(async (tx) => {
      await tx.update(emailAttempts).set({ status: "failed", error: error.slice(0, 300), updatedAt: new Date() }).where(eq(emailAttempts.id, attemptId));
      if (await this.move(tx, taskId, ["sending", "send_uncertain"], "failed", { lastError: "The email could not be sent. Your draft is saved." }))
        await this.ev(tx, taskId, "send_failed", "The email was not sent.", { error: error.slice(0, 200) });
    });
  }

  /** Human-triggered: re-queue a send that stayed uncertain. Same idempotency key, so no duplicate. */
  async reconcileSend(userId: string, taskId: string) {
    const t = await this.ownedTask(userId, taskId);
    if (t.status !== "send_uncertain") throw new DialError("invalid_state", "Nothing to reconcile.");
    await enqueue(this.db, "send", { taskId }, { maxAttempts: 4 });
  }

  /* ------------------------------ provider webhooks ------------------------------ */

  async handleDelivery(provider: string, ev: { eventId: string; providerMessageId: string; delivery: "delivered" | "delayed" | "bounced" | "ignored" }) {
    if (ev.delivery === "ignored") return { duplicate: false, applied: false };
    const a = (await this.db.select().from(emailAttempts).where(eq(emailAttempts.providerMessageId, ev.providerMessageId)))[0];
    if (!a) return { duplicate: false, applied: false }; // not recorded, so a provider retry can still apply it
    const ins = await this.db.insert(webhookEvents).values({ providerEventId: ev.eventId, provider, type: ev.delivery }).onConflictDoNothing().returning();
    if (!ins.length) return { duplicate: true, applied: false };
    if (a.deliveryStatus === "delivered" && ev.delivery === "delayed") return { duplicate: false, applied: false };
    await this.db.update(emailAttempts).set({ deliveryStatus: ev.delivery, updatedAt: new Date() }).where(eq(emailAttempts.id, a.id));
    await this.ev(this.db, a.taskId, "delivery_update", `Delivery status: ${ev.delivery}.`, { delivery: ev.delivery });
    return { duplicate: false, applied: true };
  }

  /* ------------------------------ reads ------------------------------ */

  spokenStatus(t: { status: string; lastError: string | null }, a: { deliveryStatus: string } | null): string {
    switch (t.status) {
      case "preparing": return "I'm still preparing your application. It won't be long.";
      case "ready_for_review": return "Your application is ready for review.";
      case "sending": return "The email is being sent now.";
      case "sent":
        if (a?.deliveryStatus === "delivered") return "The email was delivered to the recipient's mail server.";
        if (a?.deliveryStatus === "bounced") return "The email bounced and did not arrive.";
        return "The email service accepted the message. Delivery to the inbox isn't confirmed yet.";
      case "send_uncertain": return "I couldn't confirm whether it went out. I'm checking safely, and I won't send a duplicate.";
      case "failed": return `${t.lastError ?? "Something went wrong."} Your draft is saved.`;
      case "cancelled": return "That application was cancelled.";
      default: return "I'm not sure of the status.";
    }
  }

  async getStatus(userId: string, taskId: string) {
    const t = await this.ownedTask(userId, taskId);
    const a = await this.latestAttempt(taskId);
    return { task: t, attempt: a, spoken: this.spokenStatus(t, a) };
  }

  async listTasks(userId: string, limit = 20) {
    const rows = await this.db.select({ t: tasks, r: roles }).from(tasks).leftJoin(roles, eq(roles.id, tasks.roleId))
      .where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt)).limit(limit);
    return rows.map((x) => ({ ...x.t, roleTitle: x.r?.title ?? null, company: x.r?.company ?? null }));
  }

  async taskDetail(userId: string, taskId: string) {
    const t = await this.ownedTask(userId, taskId);
    const [role] = await this.db.select().from(roles).where(eq(roles.id, t.roleId));
    const versions = await this.db.select().from(draftVersions).where(eq(draftVersions.taskId, taskId)).orderBy(desc(draftVersions.version));
    const events = await this.db.select().from(taskEvents).where(eq(taskEvents.taskId, taskId)).orderBy(taskEvents.createdAt);
    const attempt = await this.latestAttempt(taskId);
    const approval = (await this.db.select().from(approvals).where(eq(approvals.taskId, taskId)).orderBy(desc(approvals.createdAt)).limit(1))[0] ?? null;
    return {
      task: t, role: role ?? null, draft: versions.find((v) => v.version === t.currentVersion) ?? null,
      versions: versions.map((v) => ({ version: v.version, attachmentChoice: v.attachmentChoice, createdAt: v.createdAt })),
      events, attempt, approval, simulated: this.d.email.simulated, spoken: this.spokenStatus(t, attempt),
    };
  }

  /* ------------------------------ downloads ------------------------------ */

  signDownload(userId: string, taskId: string, version: number, ttlSec = 300) {
    return signToken({ uid: userId, tid: taskId, v: version, exp: Math.floor(Date.now() / 1000) + ttlSec }, this.d.cfg.downloadSecret);
  }
  async redeemDownload(token: string) {
    const p = verifyToken<{ uid: string; tid: string; v: number; exp: number }>(token, this.d.cfg.downloadSecret);
    if (!p) throw new DialError("forbidden", "Link expired");
    await this.ownedTask(p.uid, p.tid);
    const dr = await this.currentDraft(p.tid, p.v);
    if (!dr) throw new DialError("not_found", "Draft not found");
    return { bytes: await this.d.storage.get(dr.attachmentPath), filename: dr.attachmentFilename };
  }

  async deleteAccountData(userId: string) {
    const ts = await this.db.select({ id: tasks.id }).from(tasks).where(eq(tasks.userId, userId));
    const ids = ts.map((x) => x.id);
    const drafts = ids.length ? await this.db.select().from(draftVersions).where(inArray(draftVersions.taskId, ids)) : [];
    const myCvs = await this.db.select().from(cvs).where(eq(cvs.userId, userId));
    for (const p of [...drafts.map((d) => d.attachmentPath), ...myCvs.map((c) => c.storagePath)]) await this.d.storage.remove(p).catch(() => {});
    await this.db.transaction(async (tx) => {
      if (ids.length) {
        await tx.delete(emailAttempts).where(inArray(emailAttempts.taskId, ids));
        await tx.delete(approvals).where(inArray(approvals.taskId, ids));
        await tx.delete(taskEvents).where(inArray(taskEvents.taskId, ids));
        await tx.delete(draftVersions).where(inArray(draftVersions.taskId, ids));
        for (const id of ids) await tx.delete(jobs).where(sql`${jobs.payload}->>'taskId' = ${id}`);
      }
      await tx.delete(tasks).where(eq(tasks.userId, userId));
      await tx.delete(callSessions).where(eq(callSessions.userId, userId));
      await tx.delete(roles).where(eq(roles.userId, userId));
      await tx.delete(cvs).where(eq(cvs.userId, userId));
      await tx.delete(profiles).where(eq(profiles.userId, userId));
    });
  }
}
