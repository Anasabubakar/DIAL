import { createHmac, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import type { DeliveryEvent, EmailProvider, OutboundEmail, SendResult } from "./types";

type Headers = Record<string, string | string[] | undefined>;
const h = (hs: Headers, k: string) => { const v = hs[k]; return Array.isArray(v) ? v[0] : v; };

/** Wraps any provider so mail can only reach one controlled address (live smoke tests). */
export function restrictRecipient(inner: EmailProvider, allowed: string): EmailProvider {
  return {
    name: inner.name, simulated: inner.simulated,
    parseWebhook: (b, hd) => inner.parseWebhook(b, hd),
    async send(e) {
      if (e.to.toLowerCase() !== allowed.toLowerCase())
        return { kind: "rejected", error: "recipient not permitted by CONTROLLED_RECIPIENT" };
      return inner.send(e);
    },
  };
}

export class ResendEmail implements EmailProvider {
  readonly name = "resend";
  readonly simulated = false;
  private client: Resend;
  constructor(apiKey: string, private webhookSecret: string) { this.client = new Resend(apiKey); }

  async send(e: OutboundEmail): Promise<SendResult> {
    try {
      const { data, error } = await this.client.emails.send(
        {
          from: e.from, to: e.to, replyTo: e.replyTo, subject: e.subject, text: e.text,
          attachments: [{ filename: e.attachment.filename, content: Buffer.from(e.attachment.content), contentType: e.attachment.contentType }],
        },
        { idempotencyKey: e.idempotencyKey },
      );
      if (data?.id) return { kind: "submitted", providerMessageId: data.id };
      const status = (error as { statusCode?: number | null } | null)?.statusCode ?? null;
      const msg = error?.message ?? "unknown provider error";
      // 4xx (other than rate limit / concurrent-idempotency) means Resend refused it.
      if (status !== null && status >= 400 && status < 500 && status !== 429 && status !== 409) return { kind: "rejected", error: msg };
      return { kind: "uncertain", error: msg };
    } catch (err) {
      return { kind: "uncertain", error: err instanceof Error ? err.message : "network error" };
    }
  }

  parseWebhook(rawBody: string, headers: Headers): DeliveryEvent {
    const id = h(headers, "svix-id"), timestamp = h(headers, "svix-timestamp"), signature = h(headers, "svix-signature");
    if (!id || !timestamp || !signature) throw new Error("missing webhook signature headers");
    const evt = this.client.webhooks.verify({ payload: rawBody, headers: { id, timestamp, signature }, webhookSecret: this.webhookSecret });
    const eventId = id;
    const emailId = (evt as { data?: { email_id?: string } }).data?.email_id ?? "";
    const delivery = evt.type === "email.delivered" ? "delivered"
      : evt.type === "email.delivery_delayed" ? "delayed"
      : evt.type === "email.bounced" || evt.type === "email.failed" || evt.type === "email.suppressed" ? "bounced"
      : "ignored";
    return { eventId, providerMessageId: emailId, delivery };
  }
}

/**
 * SIMULATED provider for tests and local development. It never sends mail and must never be
 * presented as proof of delivery. Mimics Resend's idempotency-key behaviour.
 */
export class SandboxEmail implements EmailProvider {
  readonly name = "sandbox";
  readonly simulated = true;
  sent: OutboundEmail[] = [];
  private byKey = new Map<string, string>();
  /** Failure injection for tests. */
  failNext: "reject" | "timeout-after-accept" | "timeout-before-accept" | null = null;
  calls = 0;
  constructor(private webhookSecret = "sandbox-secret") {}

  async send(e: OutboundEmail): Promise<SendResult> {
    this.calls++;
    const f = this.failNext; this.failNext = null;
    if (f === "reject") return { kind: "rejected", error: "sandbox rejected" };
    if (f === "timeout-before-accept") return { kind: "uncertain", error: "sandbox timeout" };
    const existing = this.byKey.get(e.idempotencyKey);
    const id = existing ?? `sbx_${this.byKey.size + 1}`;
    if (!existing) { this.byKey.set(e.idempotencyKey, id); this.sent.push(e); }
    if (f === "timeout-after-accept") return { kind: "uncertain", error: "sandbox timeout" };
    return { kind: "submitted", providerMessageId: id };
  }

  sign(body: string) { return createHmac("sha256", this.webhookSecret).update(body).digest("hex"); }
  parseWebhook(rawBody: string, headers: Headers): DeliveryEvent {
    const sig = h(headers, "x-sandbox-signature") ?? "";
    const want = this.sign(rawBody);
    if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) throw new Error("invalid webhook signature");
    const b = JSON.parse(rawBody) as { id: string; messageId: string; delivery: DeliveryEvent["delivery"] };
    return { eventId: b.id, providerMessageId: b.messageId, delivery: b.delivery };
  }
}
