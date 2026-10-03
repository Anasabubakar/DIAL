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
      <div><p className="eyebrow">Connections</p><h1 className="font-display mt-2 text-[clamp(2rem,4.5vw,3rem)]">What Dial is connected to</h1>
        <p className="mt-3 max-w-2xl text-muted">Here's what's switched on, and what that does and doesn't promise.</p></div>
      <dl className="rounded-[var(--radius-card)] border border-line bg-surface px-7">
        <Row k="Phone line">{me.voice.phoneNumber ?? <span className="text-muted">Not set up yet</span>}
          <p className="mt-1 text-[13px] text-muted">{me.voice.mode === "demo"
            ? `The phone pilot is linked to one profile${me.voice.isDemoUser ? " (this one)" : " (a different one)"}. The phone service can't prove who is calling, so Dial keeps open calling off.`
            : "Phone calls are switched off."}</p></Row>
        <Row k="Email provider">{me.email.provider} {me.email.simulated ? <Badge tone="warn" className="ml-1">Test setup: nothing is delivered</Badge> : <Badge tone="accent" className="ml-1">Live</Badge>}
          <p className="mt-1 text-[13px] text-muted">Applications go out from <code className="rounded-md bg-paper px-1.5 py-0.5">{me.email.from}</code> and replies come to <strong>{me.profile?.email ?? "your email"}</strong>. It isn't your Gmail.</p></Row>
        {me.email.controlledRecipient && <Row k="Recipient restriction"><Badge tone="warn">Test mode</Badge> <span className="ml-1">Mail can only go to {me.email.controlledRecipient}.</span></Row>}
        <Row k="What “sent” means">The email service has accepted your message. Whether it reached the inbox is tracked separately, and shown on each request.</Row>
        <Row k="Retention">Finished requests and their documents are deleted after 90 days. Call records are kept for 30 days. Dial doesn't keep call audio or full transcripts.</Row>
      </dl>
      <section className="rounded-[var(--radius-card)] border border-end/35 bg-surface p-7">
        <h2 className="text-lg font-bold">Delete your data</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Remove everything Dial holds about you, right away.</p>
        <DeleteAccount />
      </section>
    </div>
  );
}
