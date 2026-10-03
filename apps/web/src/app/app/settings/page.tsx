import { api, requireSession } from "@/lib/api";
import type { Me } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { DeleteAccount } from "@/components/delete-account";

export const metadata = { title: "Connection" };

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return <div className="grid gap-1 border-b border-line py-4 last:border-0 sm:grid-cols-[12rem_1fr] sm:gap-6"><dt className="text-sm text-muted">{k}</dt><dd className="text-[15px]">{children}</dd></div>;
}

export default async function Settings() {
  const me = await api<Me>(await requireSession(), "/v1/me");
  return (
    <div className="space-y-10">
      <div><p className="eyebrow">Status</p><h1 className="font-display mt-2 text-5xl">Connection</h1>
        <p className="mt-3 max-w-2xl text-muted">What DIAL is connected to in this environment, and what that does and doesn&apos;t guarantee.</p></div>
      <dl className="rounded-[var(--radius-card)] border border-line bg-surface px-6">
        <Row k="Phone line">{me.voice.phoneNumber ?? <span className="text-muted">Not configured</span>}
          <p className="mt-1 text-[13px] text-muted">{me.voice.mode === "demo"
            ? `Voice pilot is on and mapped to one profile${me.voice.isDemoUser ? " (this one)" : " (a different one)"}. The phone platform doesn't give DIAL a verifiable per-call identity, so public multi-user calling stays off.`
            : "Voice access is off."}</p></Row>
        <Row k="Email provider">{me.email.provider} {me.email.simulated ? <Badge tone="warn" className="ml-1">Simulated: nothing is delivered</Badge> : <Badge tone="accent" className="ml-1">Live</Badge>}
          <p className="mt-1 text-[13px] text-muted">Applications are sent from <code className="rounded bg-canvas px-1.5 py-0.5">{me.email.from}</code> with <strong>{me.profile?.email ?? "your email"}</strong> as Reply-To. This is not connected Gmail.</p></Row>
        {me.email.controlledRecipient && <Row k="Recipient restriction"><Badge tone="warn">Test mode</Badge> <span className="ml-1">All mail is limited to {me.email.controlledRecipient}.</span></Row>}
        <Row k="What “sent” means">The email service accepted the message. Whether it reached an inbox is tracked separately from delivery events and shown on each application.</Row>
        <Row k="Retention">Applications and their documents are deleted 90 days after they finish. Call session records are kept 30 days. We don&apos;t store call audio or full transcripts.</Row>
      </dl>
      <section className="rounded-[var(--radius-card)] border border-danger/25 bg-surface p-6">
        <h2 className="font-medium">Delete your data</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Remove everything DIAL holds about you, immediately.</p>
        <DeleteAccount />
      </section>
    </div>
  );
}
