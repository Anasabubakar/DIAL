import Link from "next/link";
import { ArrowUpRight, Check, Circle, Mail, Phone } from "lucide-react";
import { api, requireSession } from "@/lib/api";
import type { Me, TaskRow } from "@/lib/types";
import { STATUS, when } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import { PrepareForm } from "@/components/prepare-form";

export const metadata = { title: "Home" };

export default async function Home() {
  const s = await requireSession();
  const [me, tasks] = await Promise.all([api<Me>(s, "/v1/me"), api<TaskRow[]>(s, "/v1/tasks")]);
  const confirmed = !!me.profile?.verifiedAt;
  const steps = [
    { done: confirmed, label: "Review and confirm your profile", href: "/app/profile" },
    { done: !!me.cv, label: "Upload your original CV", href: "/app/profile" },
    { done: me.roles.length > 0, label: "Save a role and where to send it", href: "/app/roles" },
  ];
  const left = steps.filter((x) => !x.done).length;
  return (
    <div className="space-y-12">
      <div className="rise">
        <p className="eyebrow">Home</p>
        <h1 className="font-display mt-2 text-[clamp(2rem,4.5vw,3rem)]">Tell Dial what you need.</h1>
        <p className="mt-3 max-w-xl text-lg text-muted">{left === 0 ? "You're all set. Start one here, or just pick up the phone." : `${left} quick ${left === 1 ? "step" : "steps"} and Dial is ready to take your calls.`}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-7 shadow-card">
          <h2 className="text-lg font-bold">Start an application</h2>
          <p className="mb-6 mt-1 text-muted">Dial writes the email and the PDF from your confirmed profile. Nothing goes out until you say yes.</p>
          <PrepareForm roles={me.roles} hasCv={!!me.cv} ready={confirmed} />
        </section>

        <section className="space-y-6">
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-7">
            <h2 className="mb-4 text-lg font-bold">Get set up</h2>
            <ul className="space-y-1">
              {steps.map((x) => (
                <li key={x.label}>
                  <Link href={x.href} className="group flex min-h-11 items-center gap-3 text-[15px]">
                    {x.done ? <Check className="size-5 shrink-0 rounded-full bg-citron p-1 text-ink" /> : <Circle className="size-5 shrink-0 text-stone" />}
                    <span className={x.done ? "text-muted" : "font-medium text-ink group-hover:underline"}>{x.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-7">
            <h2 className="mb-4 text-lg font-bold">Connections</h2>
            <ul className="space-y-4 text-[15px]">
              <li className="flex items-start gap-3"><Phone className="mt-1 size-4 shrink-0 text-muted" />
                <span>{me.voice.phoneNumber ? <>Call <strong>{me.voice.phoneNumber}</strong></> : "No phone line yet"}
                  <span className="block text-sm text-muted">{me.voice.mode === "demo" ? (me.voice.isDemoUser ? "The phone pilot is linked to this profile." : "The phone pilot is linked to a different profile.") : "Phone calls are switched off."}</span></span></li>
              <li className="flex items-start gap-3"><Mail className="mt-1 size-4 shrink-0 text-muted" />
                <span>Email through {me.email.provider}{me.email.simulated && <Badge tone="warn" className="ml-2">Test setup</Badge>}
                  <span className="block text-sm text-muted">{me.email.simulated ? "This is a test setup, so no real email leaves." : `Sent from Dial's address; replies come to ${me.profile?.email ?? "you"}.`}</span></span></li>
            </ul>
            <Link href="/app/settings" className="mt-5 inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold underline-offset-4 hover:underline">See the details <ArrowUpRight className="size-4" /></Link>
          </div>
        </section>
      </div>

      <section aria-labelledby="recent">
        <h2 id="recent" className="eyebrow mb-4">Recent requests</h2>
        {tasks.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong px-6 py-14 text-center">
            <p className="font-display text-[26px]">Nothing yet.</p>
            <p className="mx-auto mt-2 max-w-sm text-muted">Requests you start here, or by phone, show up with their documents and proof of delivery.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
            {tasks.map((t) => {
              const st = STATUS[t.status] ?? { label: t.status, tone: "neutral" as const };
              return (
                <li key={t.id}>
                  <Link href={`/app/tasks/${t.id}`} className="flex min-h-16 items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-paper">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{t.roleTitle ?? "Role removed"} <span className="font-normal text-muted">· {t.company}</span></p>
                      <p className="text-sm text-muted">{when(t.createdAt)}{t.callSessionId ? " · started by phone" : ""}</p>
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
