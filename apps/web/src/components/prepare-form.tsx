"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { selectClass } from "./ui/field";
import { createTask } from "@/lib/actions";
import type { Role } from "@/lib/types";

export function PrepareForm({ roles, hasCv, ready, blocked }: { roles: Role[]; hasCv: boolean; ready: boolean; blocked?: string }) {
  const router = useRouter();
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [orig, setOrig] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const disabledWhy = blocked ?? (!ready ? "Confirm your profile first, so Dial only uses what you've checked." : !roles.length ? "Save a role first, so Dial knows where to send it." : null);
  return (
    <div className="space-y-4">
      {roles.length > 1 && (
        <select aria-label="Role" value={roleId} onChange={(e) => setRoleId(e.target.value)} className={selectClass}>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.title} — {r.company}</option>)}
        </select>
      )}
      {roles.length === 1 && <p className="text-base"><span className="font-semibold">{roles[0]!.title}</span> <span className="text-muted">at {roles[0]!.company}</span></p>}
      <label className={`flex min-h-11 items-center gap-3 text-[15px] ${hasCv ? "" : "opacity-50"}`}>
        <input type="checkbox" className="size-5 shrink-0 accent-ink" checked={orig} disabled={!hasCv} onChange={(e) => setOrig(e.target.checked)} />
        <span>Send my own CV instead of a tailored one{!hasCv && <span className="text-muted"> (upload it first)</span>}</span>
      </label>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <Button disabled={!!disabledWhy || pending} onClick={() => start(async () => {
        setErr(null);
        const r = await createTask(roleId, orig);
        if (r.ok && r.data) router.push(`/app/tasks/${r.data.taskId}`); else if (!r.ok) setErr(r.error);
      })}>{pending ? "Starting…" : "Prepare application"} <ArrowRight /></Button>
      {disabledWhy && <p className="text-[13px] text-muted">{disabledWhy}</p>}
    </div>
  );
}
