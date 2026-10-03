export const STATUS: Record<string, { label: string; tone: "neutral" | "accent" | "warn" | "danger"; busy?: boolean; progress: number; line: string }> = {
  preparing: { label: "Working on it", tone: "warn", busy: true, progress: 0.35, line: "Reading the role and your profile" },
  ready_for_review: { label: "Ready for review", tone: "accent", progress: 0.65, line: "Ready for you to review" },
  sending: { label: "Sending", tone: "warn", busy: true, progress: 0.85, line: "Sending your application" },
  sent: { label: "Email submitted", tone: "accent", progress: 1, line: "Done. The email service has it" },
  send_uncertain: { label: "Checking", tone: "warn", busy: true, progress: 0.85, line: "Making sure it went through" },
  failed: { label: "Needs you", tone: "danger", progress: 0, line: "Something needs your attention" },
  cancelled: { label: "Cancelled", tone: "neutral", progress: 0, line: "Cancelled" },
};
export const DELIVERY: Record<string, string> = {
  none: "Not submitted", submitted: "Waiting for delivery confirmation", delivered: "Reached the recipient's mail server", delayed: "Running late", bounced: "Bounced. It didn't arrive",
};
export const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
