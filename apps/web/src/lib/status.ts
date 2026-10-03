export const STATUS: Record<string, { label: string; tone: "neutral" | "accent" | "warn" | "danger"; busy?: boolean }> = {
  preparing: { label: "Preparing application", tone: "warn", busy: true },
  ready_for_review: { label: "Ready for review", tone: "accent" },
  sending: { label: "Sending", tone: "warn", busy: true },
  sent: { label: "Email submitted", tone: "accent" },
  send_uncertain: { label: "Checking send", tone: "warn", busy: true },
  failed: { label: "Needs attention", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};
export const DELIVERY: Record<string, string> = {
  none: "Not submitted", submitted: "Awaiting delivery confirmation", delivered: "Delivered to recipient's mail server", delayed: "Delivery delayed", bounced: "Bounced",
};
export const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
