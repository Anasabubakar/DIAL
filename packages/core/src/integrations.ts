/**
 * The truth about what Dial is connected to. The dashboard renders this and nothing else, so a card can never claim
 * more than the backend does. Anything not built is "planned" and carries no scopes, no connect button, nothing to revoke.
 */
export type IntegrationState = "connected" | "test" | "waiting" | "off" | "planned";

export interface IntegrationCard {
  id: string;
  name: string;
  /** "dial" = Dial's own service. "your_account" = a service you'd authorise. "device" = your own computer. */
  kind: "dial" | "your_account" | "device";
  state: IntegrationState;
  /** What Dial does through it, in plain words. */
  can: string[];
  /** What it deliberately can't do. */
  cannot: string[];
  /** Permissions in plain language. Empty means Dial holds no access of yours. */
  scopes: string[];
  /** Whether the user can revoke or disconnect it, and how. */
  disconnect: { supported: boolean; note: string };
  /** A setup or authorisation problem to show, if any. */
  error: string | null;
  detail?: string;
}

export interface IntegrationContext {
  voice: { mode: "disabled" | "demo"; phoneNumber: string | null; isDemoUser: boolean };
  email: { provider: string; simulated: boolean; from: string; restrictedTo: string | null; replyTo: string | null };
}

const NOT_BUILT = (what: string) => ({
  can: [], cannot: [`Dial can't connect to ${what} yet, and asks for no access to it.`], scopes: [],
  disconnect: { supported: false, note: "Nothing is connected, so there's nothing to revoke." }, error: null,
});

export function describeIntegrations(c: IntegrationContext): IntegrationCard[] {
  const phone: IntegrationCard = c.voice.mode === "disabled"
    ? { id: "phone", name: "Phone line", kind: "dial", state: "off", can: ["Take your call and run an application with you."], cannot: ["Take calls while it's switched off."], scopes: [], disconnect: { supported: false, note: "Switched off. Nothing to disconnect." }, error: null }
    : {
        id: "phone", name: "Phone line", kind: "dial", state: c.voice.phoneNumber ? "connected" : "waiting",
        can: ["Take your call, then prepare, read back, revise and send an application when you say yes."],
        cannot: ["Tell who's calling on its own. The pilot is linked to one profile.", "Reach your laptop."],
        scopes: ["Runs Dial's six application tools for the linked profile only."],
        disconnect: { supported: false, note: "Dial's own line. Ask to have the pilot switched off." },
        error: null,
        detail: c.voice.phoneNumber ? `${c.voice.phoneNumber}${c.voice.isDemoUser ? " · linked to this profile" : " · linked to a different profile"}` : "Dial is still waiting for a phone number from its voice provider.",
      };

  const email: IntegrationCard = {
    id: "email", name: "Email sending", kind: "dial", state: c.email.simulated ? "test" : "connected",
    can: ["Send the application emails you approve, with your PDF attached.", "Tell you when the email service accepts it, and later whether it was delivered."],
    cannot: ["Read your inbox or any of your mail.", "Send anything you haven't approved.", "Send from your own address. It sends from Dial's, and replies come to you."],
    scopes: [`Sends from ${c.email.from}`, c.email.replyTo ? `Replies go to ${c.email.replyTo}` : "Replies go to your profile email"],
    disconnect: { supported: false, note: "This is Dial's own sender, not your account, so there's nothing of yours to revoke." },
    error: c.email.simulated ? "Test setup: no real email is delivered." : null,
    detail: c.email.restrictedTo ? `Test mode: mail can only go to ${c.email.restrictedTo}.` : undefined,
  };

  return [
    phone,
    email,
    { id: "gmail", name: "Your Gmail", kind: "your_account", state: "planned", ...NOT_BUILT("your Gmail") },
    { id: "drive", name: "Google Drive", kind: "your_account", state: "planned", ...NOT_BUILT("Google Drive") },
    { id: "calendar", name: "Google Calendar", kind: "your_account", state: "planned", ...NOT_BUILT("Google Calendar") },
    { id: "zapier", name: "Zapier", kind: "your_account", state: "planned", ...NOT_BUILT("Zapier") },
    { id: "laptop", name: "Laptop companion", kind: "device", state: "planned",
      can: [], cannot: ["Work on your own computer, files or desktop apps. That needs a companion app that isn't built yet.", "Reach a laptop that's off, asleep or offline."],
      scopes: [], disconnect: { supported: false, note: "Nothing is paired, so there's nothing to remove." }, error: null },
  ];
}
