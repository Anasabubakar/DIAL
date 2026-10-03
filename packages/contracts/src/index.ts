import { z } from "zod";

/* ---------- domain ---------- */

export const TaskStatus = z.enum([
  "preparing",
  "ready_for_review",
  "sending",
  "sent",
  "send_uncertain",
  "failed",
  "cancelled",
]);
export type TaskStatus = z.infer<typeof TaskStatus>;

/** Allowed explicit transitions. Anything else is rejected by core. */
export const TASK_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  preparing: ["ready_for_review", "failed", "cancelled"],
  ready_for_review: ["preparing", "sending", "cancelled"],
  sending: ["sent", "send_uncertain", "failed"],
  send_uncertain: ["sent", "sending", "failed"],
  failed: ["preparing"],
  sent: [],
  cancelled: [],
};

/** Where a request runs. Only "cloud" can execute today; "laptop" needs a local companion that doesn't exist yet. */
export const ExecutionMode = z.enum(["cloud", "laptop"]);
export type ExecutionMode = z.infer<typeof ExecutionMode>;

export const DeliveryStatus = z.enum(["none", "submitted", "delivered", "delayed", "bounced"]);
export type DeliveryStatus = z.infer<typeof DeliveryStatus>;

export const AttachmentChoice = z.enum(["tailored", "original"]);
export type AttachmentChoice = z.infer<typeof AttachmentChoice>;

export const ProfileEntry = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum(["experience", "project", "education", "skill", "certification"]),
  title: z.string().min(1).max(200),
  organization: z.string().max(200).optional(),
  start: z.string().max(20).optional(),
  end: z.string().max(20).optional(),
  bullets: z.array(z.string().max(500)).max(12).default([]),
});
export type ProfileEntry = z.infer<typeof ProfileEntry>;

export const ProfileInput = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email(),
  headline: z.string().max(200).default(""),
  summary: z.string().max(2000).default(""),
  entries: z.array(ProfileEntry).max(60),
});
export type ProfileInput = z.infer<typeof ProfileInput>;

export const RoleInput = z.object({
  title: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  description: z.string().min(20).max(20000),
  applyEmail: z.string().email(),
  sourceUrl: z.string().url().max(500).optional(),
});
export type RoleInput = z.infer<typeof RoleInput>;

/** What the drafting model must return. Validated; never trusted as truth. */
export const DraftOutput = z.object({
  subject: z.string().min(3).max(200),
  body: z.string().min(40).max(4000),
  selectedEntryIds: z.array(z.string()).min(1).max(20),
  cvWording: z
    .array(z.object({ entryId: z.string(), bullets: z.array(z.string().max(500)).max(8) }))
    .max(20),
  changeSummary: z.array(z.string().max(300)).min(1).max(8),
});
export type DraftOutput = z.infer<typeof DraftOutput>;

/* ---------- voice tools (BimpeAI custom HTTP tools) ---------- */
// No user/caller field is accepted anywhere: identity comes from the bearer token only.

export const ListSavedRolesArgs = z.object({});
export const PrepareApplicationArgs = z
  .object({ role_id: z.string().min(1).max(64).optional(), role_hint: z.string().max(200).optional(), use_original_cv: z.boolean().optional(), mode: ExecutionMode.optional() })
  ;
export const GetApplicationStatusArgs = z.object({ task_id: z.string().min(1).max(64) });
export const ReviseApplicationArgs = z
  .object({ task_id: z.string().min(1).max(64), instruction: z.string().min(1).max(500), use_original_cv: z.boolean().optional() })
  ;
export const ReviewApplicationArgs = z.object({ task_id: z.string().min(1).max(64) });
export const ConfirmAndSendArgs = z
  .object({ task_id: z.string().min(1).max(64), review_token: z.string().min(10).max(2000) })
  ;

export type ToolName =
  | "list_saved_roles"
  | "prepare_application"
  | "get_application_status"
  | "revise_application"
  | "review_application"
  | "confirm_and_send";

/** Every tool answers with a short spoken sentence plus structured data. */
export const ToolResult = z.object({
  ok: z.boolean(),
  spoken: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
});
export type ToolResult = z.infer<typeof ToolResult>;

/* ---------- events ---------- */
export const TaskEventType = z.enum([
  "task_created",
  "preparation_started",
  "draft_created",
  "revision_requested",
  "review_issued",
  "approval_recorded",
  "send_queued",
  "send_submitted",
  "send_uncertain",
  "send_failed",
  "delivery_update",
  "preparation_failed",
]);
export type TaskEventType = z.infer<typeof TaskEventType>;
