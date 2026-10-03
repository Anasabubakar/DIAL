import Link from "next/link";
import { ArrowUpRight, Check, Circle, Phone, Mail } from "lucide-react";
import { api, requireSession } from "@/lib/api";
import type { Me, TaskRow } from "@/lib/types";
import { STATUS, when } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import { PrepareForm } from "@/components/prepare-form";

export const metadata = { title: "Overview" };

export default async function Overview() {
  const s = await requireSession();
  const [me, tasks] = await Promise.all([api<Me>(s, "/v1/me"), api<TaskRow[]>(s, "/v1/tasks")]);
  const confirmed = !!me.profile?.verifiedAt;
  const steps = [
    { done: confirmed, label: "Profile reviewed and confirmed", href: "/app/profile" },
    { done: !!me.cv, label: "Original CV uploaded", href: "/app/profile" },
    { done: me.roles.length > 0, label: "A role saved with its application email", href: "/app/roles" },
  ];
  return (
    <div className="space-y-12">
      <div className="rise">
        <p className="eyebrow">Workspace</p>
        <h1 className="font-display mt-2 text-5xl">Prepare an application</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-card">
          <h2 className="font-medium">Start from the web, or by phone</h2>
          <p className="mb-5 mt-1 text-sm text-muted">DIAL drafts the email and PDF from your confirmed profile. Nothing is sent until you approve it.</p>
          <PrepareForm roles={me.roles} hasCv={!!me.cv} ready={confirmed} />
        </section>

        <section className="space-y-6">
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <h2 className="mb-3 font-medium">Setup</h2>
            <ul className="space-y-2.5">
              {steps.map((x) => (
                <li key={x.label}>
                  <Link href={x.href} className="group flex items-center gap-3 text-sm">
                    {x.done ? <Check className="size-4 rounded-full bg-accent p-0.5 text-white" /> : <Circle className="size-4 text-line-strong" />}
                    <span className={x.done ? "text-muted line-through decoration-line-strong" : "text-ink group-hover:underline"}>{x.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <h2 className="mb-3 font-medium">Connections</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3"><Phone className="mt-0.5 size-4 text-muted" />
                <span>{me.voice.phoneNumber ? <>Call <strong>{me.voice.phoneNumber}</strong></> : "No phone number configured"}
                  <span className="block text-[13px] text-muted">{me.voice.mode === "demo" ? (me.voice.isDemoUser ? "Voice pilot is linked to this profile." : "Voice pilot is linked to a different demo profile.") : "Voice access is off."}</span></span></li>
              <li className="flex items-start gap-3"><Mail className="mt-0.5 size-4 text-muted" />
                <span>Email via {me.email.provider}{me.email.simulated && <Badge tone="warn" className="ml-2">Simulated</Badge>}
                  <span className="block text-[13px] text-muted">{me.email.simulated ? "No real email is sent in this environment." : `Sent from DIAL's sender; replies go to ${me.profile?.email ?? "your email"}.`}</span></span></li>
            </ul>
            <Link href="/app/settings" className="mt-4 inline-flex items-center gap-1 text-sm text-accent hover:underline">Connection details <ArrowUpRight className="size-3.5" /></Link>
          </div>
        </section>
      </div>

      <section>
        <h2 className="eyebrow mb-4">Recent applications</h2>
        {tasks.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong px-6 py-12 text-center">
            <p className="font-display text-2xl">Nothing here yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">Applications you prepare on the web or by phone appear here with their documents and delivery evidence.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
            {tasks.map((t) => {
              const st = STATUS[t.status] ?? { label: t.status, tone: "neutral" as const };
              return (
                <li key={t.id}>
                  <Link href={`/app/tasks/${t.id}`} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-canvas">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.roleTitle ?? "Role removed"} <span className="font-normal text-muted">· {t.company}</span></p>
                      <p className="text-[13px] text-muted">{when(t.createdAt)}{t.callSessionId ? " · started by phone" : ""}</p>
                    </div>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
