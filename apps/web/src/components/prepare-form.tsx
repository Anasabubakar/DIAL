"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Cloud, Laptop } from "lucide-react";
import { Button } from "./ui/button";
import { selectClass } from "./ui/field";
import { ExecutionPlan } from "./execution-plan";
import { createTask, getPlan } from "@/lib/actions";
import { cn } from "@/lib/cn";
import type { ExecutionMode, Plan, Role } from "@/lib/types";

const MODES: { id: ExecutionMode; label: string; line: string; icon: typeof Cloud; tag?: string }[] = [
  { id: "cloud", label: "Use the cloud", line: "Works with what Dial holds. Your laptop can be off.", icon: Cloud },
  { id: "laptop", label: "Use my laptop", line: "For your own files and apps.", icon: Laptop, tag: "Not available yet" },
];

export function PrepareForm({ roles, hasCv, ready }: { roles: Role[]; hasCv: boolean; ready: boolean }) {
  const router = useRouter();
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [orig, setOrig] = useState(false);
  const [mode, setMode] = useState<ExecutionMode>("cloud");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planErr, setPlanErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Ask the server what this request would do. Nothing runs until the user starts it.
  useEffect(() => {
    let live = true;
    setPlan(null); setPlanErr(null);
    getPlan({ roleId: roleId || undefined, useOriginalCv: orig, mode }).then((r) => { if (!live) return; if (r.ok && r.data) setPlan(r.data); else if (!r.ok) setPlanErr(r.error); });
    return () => { live = false; };
  }, [roleId, orig, mode, roles.length, hasCv, ready]);

  const canStart = plan?.status === "ready" && !!roleId;
  return (
    <div className="space-y-5">
      {roles.length > 1 && (
        <div><label htmlFor="role-select" className="mb-1.5 block text-sm font-semibold">Which role?</label>
          <select id="role-select" value={roleId} onChange={(e) => setRoleId(e.target.value)} className={selectClass}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.title} — {r.company}</option>)}
          </select></div>
      )}
      {roles.length === 1 && <p className="text-base"><span className="font-semibold">{roles[0]!.title}</span> <span className="text-muted">at {roles[0]!.company}</span></p>}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Where should Dial do this?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODES.map((m) => (
            <label key={m.id} className={cn("relative flex min-h-[84px] cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
              mode === m.id ? "border-ink bg-citron-soft" : "border-line-strong bg-surface hover:bg-paper")}>
              <input type="radio" name="mode" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} className="sr-only" />
              <m.icon className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span><span className="block text-[15px] font-bold">{m.label}</span>
                {m.tag && <span className="mt-1 inline-block whitespace-nowrap rounded-full bg-ink/8 px-2.5 py-0.5 text-xs font-semibold">{m.tag}</span>}
                <span className="mt-1 block text-sm text-muted">{m.line}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className={`flex min-h-11 items-center gap-3 text-[15px] ${hasCv ? "" : "opacity-50"}`}>
        <input type="checkbox" className="size-5 shrink-0 accent-ink" checked={orig} disabled={!hasCv} onChange={(e) => setOrig(e.target.checked)} />
        <span>Send my own CV instead of a tailored one{!hasCv && <span className="text-muted"> (upload it first)</span>}</span>
      </label>

      {planErr ? <p role="alert" className="text-sm text-danger">{planErr}</p> : <ExecutionPlan plan={plan} onUseCloud={() => setMode("cloud")} />}

      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <Button disabled={!canStart || pending} onClick={() => start(async () => {
        setErr(null);
        const r = await createTask(roleId, orig, mode);
        if (r.ok && r.data) router.push(`/app/tasks/${r.data.taskId}`); else if (!r.ok) setErr(r.error);
      })}>{pending ? "Starting…" : "Start in the cloud"} <ArrowRight /></Button>
      {!canStart && plan && <p className="text-sm text-muted">{plan.status === "blocked" ? "Pick a route Dial can actually run." : "Sort the missing bits above first."}</p>}
    </div>
  );
}
