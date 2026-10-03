"use client";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Hint, Input, Label, Textarea } from "./ui/field";
import { deleteRole, saveRole } from "@/lib/actions";

export function RoleForm() {
  const [v, setV] = useState({ title: "", company: "", applyEmail: "", description: "" });
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => { setErr(null); const r = await saveRole(v); if (r.ok) setV({ title: "", company: "", applyEmail: "", description: "" }); else setErr(r.error); }); }}
      className="space-y-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <h2 className="text-lg font-bold">Add a role</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="rt">Job title</Label><Input id="rt" value={v.title} onChange={set("title")} required maxLength={200} /></div>
        <div><Label htmlFor="rc">Company</Label><Input id="rc" value={v.company} onChange={set("company")} required maxLength={200} /></div>
      </div>
      <div><Label htmlFor="re">Application email</Label><Input id="re" type="email" value={v.applyEmail} onChange={set("applyEmail")} required /><Hint>Saved with the role, so you never have to spell it out over the phone.</Hint></div>
      <div><Label htmlFor="rd">Job description</Label><Textarea id="rd" value={v.description} onChange={set("description")} required minLength={20} maxLength={20000} className="min-h-40" /><Hint>Dial reads this as information only. Nothing in it can tell Dial what to do.</Hint></div>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <Button type="submit" disabled={pending}><Plus /> {pending ? "Saving…" : "Save role"}</Button>
    </form>
  );
}

export function DeleteRole({ id, label }: { id: string; label: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex flex-col items-end">
      <Button variant="ghost" size="sm" disabled={pending} aria-label={`Delete ${label}`} onClick={() => start(async () => { const r = await deleteRole(id); if (!r.ok) setErr(r.error); })}><Trash2 /> Delete</Button>
      {err && <span role="alert" className="text-xs text-danger">{err}</span>}
    </span>
  );
}
