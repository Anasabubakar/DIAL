"use client";
import { useRef, useState, useTransition } from "react";
import { Plus, Trash2, ShieldCheck, Upload, FileText } from "lucide-react";
import type { ProfileEntry } from "@dial/contracts";
import { Button } from "./ui/button";
import { Hint, Input, Label, Textarea } from "./ui/field";
import { Badge } from "./ui/badge";
import { saveProfile, uploadCv } from "@/lib/actions";
import type { Me } from "@/lib/types";

type Draft = Omit<ProfileEntry, "bullets"> & { bulletsText: string };
const kinds: ProfileEntry["kind"][] = ["experience", "project", "education", "skill", "certification"];
const newId = () => `e${Math.random().toString(36).slice(2, 8)}`;

export function ProfileForm({ initial }: { initial: Me["profile"] }) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [headline, setHeadline] = useState(initial?.headline ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [entries, setEntries] = useState<Draft[]>((initial?.entries ?? []).map((e) => ({ ...e, bulletsText: e.bullets.join("\n") })));
  const [confirmed, setConfirmed] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const verified = !!initial?.verifiedAt;

  const upd = (i: number, patch: Partial<Draft>) => setEntries((es) => es.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const submit = (confirm: boolean) => start(async () => {
    setMsg(null);
    const profile = {
      fullName, email, headline, summary,
      entries: entries.map(({ bulletsText, ...e }) => ({ ...e, organization: e.organization || undefined, start: e.start || undefined, end: e.end || undefined, bullets: bulletsText.split("\n").map((b) => b.trim()).filter(Boolean) })),
    };
    const r = await saveProfile(profile, confirm);
    setMsg(r.ok ? { ok: true, text: confirm ? "Profile confirmed. DIAL can use it." : "Saved. Confirm it before DIAL can use it." } : { ok: false, text: r.error });
    if (r.ok) setConfirmed(false);
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(confirmed); }} className="space-y-10">
      <section className="grid gap-5 sm:grid-cols-2">
        <div><Label htmlFor="fullName">Full name</Label><Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={120} /></div>
        <div><Label htmlFor="pemail">Your email</Label><Input id="pemail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /><Hint>Used as Reply-To on applications.</Hint></div>
        <div className="sm:col-span-2"><Label htmlFor="headline">Headline</Label><Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={200} placeholder="Frontend engineer" /></div>
        <div className="sm:col-span-2"><Label htmlFor="summary">Summary</Label><Textarea id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={2000} /></div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div><h2 className="font-medium">Experience, projects and skills</h2><p className="text-sm text-muted">DIAL may only reword and select from what you write here. It never invents.</p></div>
          <Button type="button" variant="secondary" size="sm" onClick={() => setEntries((e) => [...e, { id: newId(), kind: "experience", title: "", bulletsText: "" }])}><Plus /> Add entry</Button>
        </div>
        {entries.length === 0 && <p className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">No entries yet. Add your most relevant roles and projects.</p>}
        <ul className="space-y-4">
          {entries.map((e, i) => (
            <li key={e.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
              <div className="grid gap-4 sm:grid-cols-[9rem_1fr_1fr]">
                <div><Label htmlFor={`k${i}`}>Type</Label>
                  <select id={`k${i}`} value={e.kind} onChange={(ev) => upd(i, { kind: ev.target.value as ProfileEntry["kind"] })} className="h-10 w-full rounded-xl border border-line-strong bg-surface px-3 text-[15px]">
                    {kinds.map((k) => <option key={k}>{k}</option>)}
                  </select></div>
                <div><Label htmlFor={`t${i}`}>Title</Label><Input id={`t${i}`} value={e.title} onChange={(ev) => upd(i, { title: ev.target.value })} required maxLength={200} /></div>
                <div><Label htmlFor={`o${i}`}>Organisation</Label><Input id={`o${i}`} value={e.organization ?? ""} onChange={(ev) => upd(i, { organization: ev.target.value })} maxLength={200} /></div>
                <div><Label htmlFor={`s${i}`}>Start</Label><Input id={`s${i}`} value={e.start ?? ""} onChange={(ev) => upd(i, { start: ev.target.value })} placeholder="2022" maxLength={20} /></div>
                <div><Label htmlFor={`n${i}`}>End</Label><Input id={`n${i}`} value={e.end ?? ""} onChange={(ev) => upd(i, { end: ev.target.value })} placeholder="2025" maxLength={20} /></div>
                <div className="flex items-end justify-end"><Button type="button" variant="ghost" size="sm" onClick={() => setEntries((es) => es.filter((_, j) => j !== i))} aria-label={`Remove ${e.title || "entry"}`}><Trash2 /> Remove</Button></div>
                <div className="sm:col-span-3"><Label htmlFor={`b${i}`}>Highlights (one per line)</Label><Textarea id={`b${i}`} value={e.bulletsText} onChange={(ev) => upd(i, { bulletsText: ev.target.value })} className="min-h-20" /></div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="size-5 text-accent" /><h2 className="font-medium">Confirm accuracy</h2>
          {verified ? <Badge tone="accent">Confirmed</Badge> : <Badge tone="warn">Not confirmed</Badge>}
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 size-4 accent-[#355e4b]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          <span>I&apos;ve read this profile and everything in it is accurate. DIAL may use it to write applications in my name. <span className="text-muted">Editing it later removes the confirmation.</span></span>
        </label>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : confirmed ? "Save and confirm" : "Save draft"}</Button>
          {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-accent" : "text-danger"}`}>{msg.text}</p>}
        </div>
      </section>
    </form>
  );
}

export function CvUpload({ cv }: { cv: Me["cv"] }) {
  const ref = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form action={(fd) => start(async () => { const r = await uploadCv(fd); setMsg(r.ok ? { ok: true, text: "Uploaded." } : { ok: false, text: r.error }); if (r.ok && ref.current) ref.current.value = ""; })}
      className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <h2 className="mb-1 font-medium">Original CV</h2>
      <p className="mb-4 text-sm text-muted">PDF, up to 5 MB. Used when you choose to send your own CV instead of a tailored one.</p>
      {cv ? <p className="mb-4 flex items-center gap-2 text-sm"><FileText className="size-4 text-accent" /> {cv.filename} <span className="text-muted">· {(cv.sizeBytes / 1024).toFixed(0)} KB</span></p> : <p className="mb-4 text-sm text-muted">No CV uploaded yet.</p>}
      <div className="flex flex-wrap items-center gap-3">
        <input ref={ref} name="cv" type="file" accept="application/pdf" required aria-label="CV PDF" className="max-w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-canvas file:px-4 file:py-2 file:text-sm file:font-medium" />
        <Button type="submit" variant="secondary" disabled={pending}><Upload /> {pending ? "Uploading…" : cv ? "Replace" : "Upload"}</Button>
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-3 text-sm ${msg.ok ? "text-accent" : "text-danger"}`}>{msg.text}</p>}
    </form>
  );
}
