import type { DraftOutput, ProfileInput } from "@dial/contracts";

/* ---------- storage ---------- */
export interface StorageProvider {
  readonly name: string;
  put(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(path: string): Promise<Uint8Array>;
  remove(path: string): Promise<void>;
}

/* ---------- email ---------- */
export interface OutboundEmail {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  attachment: { filename: string; content: Uint8Array; contentType: string };
  /** Stable per immutable approved draft. The provider must de-duplicate on it. */
  idempotencyKey: string;
}

export type SendResult =
  | { kind: "submitted"; providerMessageId: string }
  | { kind: "rejected"; error: string }
  /** We cannot know whether the provider accepted it. Never blindly re-send without the same key. */
  | { kind: "uncertain"; error: string };

export interface DeliveryEvent {
  eventId: string;
  providerMessageId: string;
  delivery: "delivered" | "delayed" | "bounced" | "ignored";
}

export interface EmailProvider {
  /** "sandbox" providers are simulated and never prove real delivery. */
  readonly name: string;
  readonly simulated: boolean;
  send(email: OutboundEmail): Promise<SendResult>;
  /** Throws when the signature is invalid. */
  parseWebhook(rawBody: string, headers: Record<string, string | string[] | undefined>): DeliveryEvent;
}

/* ---------- drafting ---------- */
export interface DraftRequest {
  profile: ProfileInput;
  role: { title: string; company: string; description: string };
  /** Revision instruction from the caller (untrusted free text) and the previous draft. */
  instruction?: string;
  previous?: DraftOutput;
}
export interface Drafter {
  readonly name: string;
  readonly simulated: boolean;
  /** Returns unvalidated output. Core validates it. */
  draft(req: DraftRequest): Promise<unknown>;
}
