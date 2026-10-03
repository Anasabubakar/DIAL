import type { ExecutionMode } from "@dial/contracts";

/**
 * What Dial can truthfully do for a request, and what it needs first. Pure and side-effect free, so the web app,
 * the API and the voice tools all give the same answer.
 *
 * Today only cloud execution exists. A laptop companion (a local process that could touch the user's own files
 * and apps) is NOT built, so "laptop" is never executable and is reported as unavailable. A powered-off or
 * disconnected laptop is never reachable from the cloud.
 */
export interface PlanInput {
  requested?: ExecutionMode;
  profileConfirmed: boolean;
  hasRole: boolean;
  hasCv: boolean;
  useOriginalCv: boolean;
  email: { provider: string; simulated: boolean; restrictedTo?: string | null };
  /** A paired, online laptop companion. Always false until the companion exists. */
  laptopOnline?: boolean;
}

export interface PlanNeed { label: string; met: boolean; fixHref?: string }
export interface Plan {
  requested: ExecutionMode;
  /** The mode that will actually run, or null when the request can't run as asked. */
  mode: ExecutionMode | null;
  status: "ready" | "needs_setup" | "blocked";
  headline: string;
  uses: string[];
  needs: PlanNeed[];
  /** Consequential steps Dial will stop and ask about first. */
  confirmations: string[];
  notes: string[];
  /** Offered only when the cloud really can do it. */
  alternative: { mode: "cloud"; reason: string } | null;
}

export function planApplication(i: PlanInput): Plan {
  const requested: ExecutionMode = i.requested ?? "cloud";
  const needs: PlanNeed[] = [
    { label: "Your profile, reviewed and confirmed", met: i.profileConfirmed, fixHref: "/app/profile" },
    { label: "A saved role with its application email", met: i.hasRole, fixHref: "/app/roles" },
  ];
  if (i.useOriginalCv) needs.push({ label: "Your original CV, uploaded to Dial", met: i.hasCv, fixHref: "/app/profile" });
  const confirmations = ["Sending the email. Dial reads it back and waits for your yes."];
  const notes: string[] = [];
  if (i.email.simulated) notes.push("The email service is a test setup, so nothing will really be delivered.");
  if (i.email.restrictedTo) notes.push(`Test mode: mail can only go to ${i.email.restrictedTo}.`);
  const uses = [
    "Your confirmed profile and saved role",
    i.useOriginalCv ? "The CV you uploaded to Dial" : "A CV Dial writes from your profile",
    `Dial's email sender (${i.email.provider}), with replies coming to you`,
  ];
  const unmet = needs.filter((n) => !n.met);

  if (requested === "laptop" && !i.laptopOnline) {
    // The cloud can do this job from what Dial already holds. It still can't open anything on the laptop.
    const cloudCan = unmet.length === 0;
    return {
      requested, mode: null, status: "blocked",
      headline: "I can't reach your laptop.",
      uses: [], needs: [{ label: "A connected laptop companion", met: false }], confirmations: [], notes: [
        "The laptop companion isn't available yet, so Dial can't work on your own computer, files or desktop apps.",
        "A laptop that's off, asleep or offline can never be reached from the cloud.",
        ...notes,
      ],
      alternative: cloudCan
        ? { mode: "cloud", reason: "Dial can do this one in the cloud using the profile and CV you gave it. It won't open anything on your laptop." }
        : null,
    };
  }
  if (unmet.length) {
    return { requested, mode: "cloud", status: "needs_setup", headline: "A couple of things first.", uses, needs, confirmations, notes, alternative: null };
  }
  return { requested, mode: "cloud", status: "ready", headline: "Ready to run in the cloud.", uses, needs, confirmations, notes, alternative: null };
}
