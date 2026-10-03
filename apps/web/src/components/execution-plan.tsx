import Link from "next/link";
import { AlertTriangle, Check, CircleDashed, ShieldCheck } from "lucide-react";
import type { Plan } from "@/lib/types";
import { Button } from "./ui/button";

/** Shows, before anything runs: where it will run, what it needs, and what Dial will stop and ask about. */
export function ExecutionPlan({ plan, onUseCloud, loading }: { plan: Plan | null; onUseCloud?: () => void; loading?: boolean }) {
  if (!plan) return <div role="status" className="h-24 animate-pulse rounded-2xl bg-track motion-reduce:animate-none"><span className="sr-only">Checking what Dial needs…</span></div>;
  const blocked = plan.status === "blocked";
  return (
    <section aria-label="What Dial will do" aria-busy={loading} className={`rounded-2xl p-5 ${blocked ? "border border-end/35 bg-danger-soft" : "bg-paper"}`}>
      <p className="flex items-center gap-2 text-[15px] font-bold">
        {blocked ? <AlertTriangle className="size-4 text-danger" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
        {plan.headline}
      </p>

      {plan.uses.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Dial will use</p>
          <ul className="mt-1 space-y-1 text-[15px]">{plan.uses.map((u) => <li key={u}>{u}</li>)}</ul>
        </div>
      )}

      <div className="mt-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">It needs</p>
        <ul className="mt-1 space-y-1.5 text-[15px]">
          {plan.needs.map((n) => (
            <li key={n.label} className="flex items-start gap-2.5">
              {n.met ? <Check className="mt-0.5 size-5 shrink-0 rounded-full bg-citron p-1" aria-label="Ready" /> : <CircleDashed className="mt-0.5 size-5 shrink-0 text-stone" aria-label="Missing" />}
              <span>{n.label}{!n.met && n.fixHref && <> · <Link href={n.fixHref} className="font-semibold underline underline-offset-4">Fix this</Link></>}</span>
            </li>
          ))}
        </ul>
      </div>

      {plan.confirmations.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Dial will ask before</p>
          <ul className="mt-1 space-y-1 text-[15px]">{plan.confirmations.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      )}

      {plan.notes.length > 0 && <ul className="mt-3 space-y-1 border-t border-line pt-3 text-sm text-muted">{plan.notes.map((n) => <li key={n}>{n}</li>)}</ul>}

      {plan.alternative && (
        <div className="mt-4 rounded-2xl bg-surface p-4">
          <p className="text-[15px]">{plan.alternative.reason}</p>
          {onUseCloud && <Button className="mt-3" size="sm" variant="accent" onClick={onUseCloud}>Use the cloud instead</Button>}
        </div>
      )}
    </section>
  );
}
