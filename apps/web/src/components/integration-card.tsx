import { Check, Cloud, Laptop, Mail, Phone, Plug, X } from "lucide-react";
import type { IntegrationCard as Card } from "@/lib/types";
import { Badge } from "./ui/badge";

const ICON: Record<string, typeof Plug> = { phone: Phone, email: Mail, laptop: Laptop };
const STATE: Record<Card["state"], { label: string; tone: "accent" | "warn" | "neutral" }> = {
  connected: { label: "Connected", tone: "accent" },
  test: { label: "Test setup", tone: "warn" },
  waiting: { label: "Waiting", tone: "warn" },
  off: { label: "Off", tone: "neutral" },
  planned: { label: "Not built yet", tone: "neutral" },
};

/** Renders one entry from the server's integrations registry. It can't claim more than the backend reports. */
export function IntegrationCard({ c }: { c: Card }) {
  const Icon = ICON[c.id] ?? Plug;
  const st = STATE[c.state];
  const planned = c.state === "planned";
  return (
    <article aria-labelledby={`int-${c.id}`} className={`flex flex-col rounded-[var(--radius-card)] border p-6 ${planned ? "border-dashed border-line-strong bg-transparent" : "border-line bg-surface shadow-card"}`}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`inline-flex size-10 items-center justify-center rounded-full ${planned ? "bg-ink/6" : "bg-citron"}`}><Icon className="size-5" aria-hidden /></span>
          <div>
            <h3 id={`int-${c.id}`} className="text-[17px] font-bold leading-tight">{c.name}</h3>
            <p className="text-sm text-muted">{c.kind === "dial" ? "Dial's own" : c.kind === "your_account" ? "Your account" : "Your computer"}</p>
          </div>
        </div>
        <Badge tone={st.tone}>{st.label}</Badge>
      </header>

      {c.detail && <p className="mt-4 text-[15px]">{c.detail}</p>}
      {c.error && <p role="status" className="mt-3 rounded-xl bg-citron-soft px-3.5 py-2.5 text-sm">{c.error}</p>}

      {c.can.length > 0 && (
        <div className="mt-4"><h4 className="text-xs font-bold uppercase tracking-wide text-muted">Dial can</h4>
          <ul className="mt-1.5 space-y-1.5 text-[15px]">{c.can.map((x) => <li key={x} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0" aria-hidden />{x}</li>)}</ul></div>
      )}
      {c.cannot.length > 0 && (
        <div className="mt-4"><h4 className="text-xs font-bold uppercase tracking-wide text-muted">Dial can&apos;t</h4>
          <ul className="mt-1.5 space-y-1.5 text-[15px] text-muted">{c.cannot.map((x) => <li key={x} className="flex gap-2.5"><X className="mt-0.5 size-4 shrink-0" aria-hidden />{x}</li>)}</ul></div>
      )}

      <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
        <div><dt className="font-bold">Permissions</dt>
          <dd className="mt-0.5 text-muted">{c.scopes.length ? <ul className="space-y-0.5">{c.scopes.map((s) => <li key={s}>{s}</li>)}</ul> : "None. Dial holds no access of yours here."}</dd></div>
        <div><dt className="font-bold">Disconnect</dt><dd className="mt-0.5 text-muted">{c.disconnect.note}</dd></div>
      </dl>
    </article>
  );
}

export function RunModes() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-card">
        <p className="flex items-center gap-2 text-[17px] font-bold"><Cloud className="size-5" aria-hidden /> In the cloud <Badge tone="accent">Works today</Badge></p>
        <p className="mt-2 text-muted">Dial works with what you've given it: your profile, CV, saved roles and its own email sender. Your laptop can be off. It can't see anything that isn't in Dial.</p>
      </div>
      <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-6">
        <p className="flex items-center gap-2 text-[17px] font-bold"><Laptop className="size-5" aria-hidden /> On your laptop <Badge>Not built yet</Badge></p>
        <p className="mt-2 text-muted">A companion on your own computer could one day handle local files and apps. It isn't built, so Dial can't do that. A laptop that's off or offline can never be reached from the cloud.</p>
      </div>
    </div>
  );
}
