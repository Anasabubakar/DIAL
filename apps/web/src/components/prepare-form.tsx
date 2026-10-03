"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { createTask } from "@/lib/actions";
import type { Role } from "@/lib/types";

export function PrepareForm({ roles, hasCv, ready, blocked }: { roles: Role[]; hasCv: boolean; ready: boolean; blocked?: string }) {
  const router = useRouter();
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [orig, setOrig] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const disabledWhy = blocked ?? (!ready ? "Confirm your profile first." : !roles.length ? "Save a role first." : null);
  return (
    <div className="space-y-4">
      {roles.length > 1 && (
        <select aria-label="Role" value={roleId} onChange={(e) => setRoleId(e.target.value)} className="h-10 w-full rounded-xl border border-line-strong bg-surface px-3 text-[15px]">
          {roles.map((r) => <option key={r.id} value={r.id}>{r.title} — {r.company}</option>)}
        </select>
      )}
      {roles.length === 1 && <p className="text-[15px]"><span className="font-medium">{roles[0]!.title}</span> <span className="text-muted">at {roles[0]!.company}</span></p>}
      <label className={`flex items-center gap-2 text-sm ${hasCv ? "" : "opacity-50"}`}>
        <input type="checkbox" className="size-4 accent-[#355e4b]" checked={orig} disabled={!hasCv} onChange={(e) => setOrig(e.target.checked)} />
        Attach my original CV instead of a tailored one {!hasCv && <span className="text-muted">(upload one first)</span>}
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
