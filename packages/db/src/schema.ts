import { sql } from "drizzle-orm";
import {
  index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, boolean,
} from "drizzle-orm/pg-core";
import type { ProfileEntry } from "@dial/contracts";

const id = () => text("id").primaryKey();
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().default(sql`now()`);

export const profiles = pgTable("profiles", {
  userId: text("user_id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  headline: text("headline").notNull().default(""),
  summary: text("summary").notNull().default(""),
  entries: jsonb("entries").$type<ProfileEntry[]>().notNull().default([]),
  /** Set only when the user has explicitly reviewed the profile. Drafting requires it. */
  verifiedAt: ts("verified_at"),
  updatedAt: ts("updated_at").notNull().default(sql`now()`),
});

export const cvs = pgTable("cvs", {
  id: id(),
  userId: text("user_id").notNull(),
  filename: text("filename").notNull(),
  storagePath: text("storage_path").notNull(),
  sha256: text("sha256").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
}, (t) => [index("cvs_user_idx").on(t.userId)]);

export const roles = pgTable("roles", {
  id: id(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  description: text("description").notNull(),
  applyEmail: text("apply_email").notNull(),
  sourceUrl: text("source_url"),
  createdAt: createdAt(),
}, (t) => [index("roles_user_idx").on(t.userId)]);

export const callSessions = pgTable("call_sessions", {
  id: id(),
  userId: text("user_id").notNull(),
  channel: text("channel").notNull(), // "voice-demo" | "simulated"
  tokenFingerprint: text("token_fingerprint").notNull(),
  startedAt: createdAt(),
});

export const tasks = pgTable("tasks", {
  id: id(),
  userId: text("user_id").notNull(),
  roleId: text("role_id").notNull(),
  callSessionId: text("call_session_id"),
  status: text("status").notNull(),
  attachmentChoice: text("attachment_choice").notNull().default("tailored"),
  currentVersion: integer("current_version").notNull().default(0),
  lastError: text("last_error"),
  createdAt: createdAt(),
  updatedAt: ts("updated_at").notNull().default(sql`now()`),
}, (t) => [index("tasks_user_idx").on(t.userId)]);

/** Immutable once written. A revision is always a new row. */
export const draftVersions = pgTable("draft_versions", {
  id: id(),
  taskId: text("task_id").notNull(),
  version: integer("version").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  recipient: text("recipient").notNull(),
  attachmentChoice: text("attachment_choice").notNull(),
  attachmentPath: text("attachment_path").notNull(),
  attachmentSha256: text("attachment_sha256").notNull(),
  attachmentFilename: text("attachment_filename").notNull(),
  changeSummary: jsonb("change_summary").$type<string[]>().notNull(),
  supportingEntryIds: jsonb("supporting_entry_ids").$type<string[]>().notNull(),
  contentHash: text("content_hash").notNull(),
  instruction: text("instruction"),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("draft_task_version").on(t.taskId, t.version)]);

export const approvals = pgTable("approvals", {
  id: id(),
  taskId: text("task_id").notNull(),
  draftVersion: integer("draft_version").notNull(),
  contentHash: text("content_hash").notNull(),
  evidence: jsonb("evidence").$type<Record<string, unknown>>().notNull(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("approval_task_version").on(t.taskId, t.draftVersion)]);

export const taskEvents = pgTable("task_events", {
  id: id(),
  taskId: text("task_id").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>(),
  createdAt: createdAt(),
}, (t) => [index("events_task_idx").on(t.taskId, t.createdAt)]);

export const jobs = pgTable("jobs", {
  id: id(),
  type: text("type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  status: text("status").notNull().default("queued"), // queued | leased | done | dead
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(4),
  runAt: ts("run_at").notNull().default(sql`now()`),
  leaseExpiresAt: ts("lease_expires_at"),
  leasedBy: text("leased_by"),
  lastError: text("last_error"),
  createdAt: createdAt(),
}, (t) => [index("jobs_claim_idx").on(t.status, t.runAt)]);

export const emailAttempts = pgTable("email_attempts", {
  id: id(),
  taskId: text("task_id").notNull(),
  draftVersion: integer("draft_version").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  /** claimed -> submitted | uncertain | failed */
  status: text("status").notNull().default("claimed"),
  deliveryStatus: text("delivery_status").notNull().default("none"),
  provider: text("provider").notNull(),
  providerMessageId: text("provider_message_id"),
  error: text("error"),
  createdAt: createdAt(),
  updatedAt: ts("updated_at").notNull().default(sql`now()`),
}, (t) => [uniqueIndex("email_idem").on(t.idempotencyKey)]);

export const webhookEvents = pgTable("webhook_events", {
  providerEventId: text("provider_event_id").primaryKey(),
  provider: text("provider").notNull(),
  type: text("type").notNull(),
  receivedAt: createdAt(),
});
