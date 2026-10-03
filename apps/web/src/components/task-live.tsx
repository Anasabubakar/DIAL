"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ExternalLink, FileText, Loader2, Mail, Phone, RefreshCw, Send, Undo2, X } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Label, Textarea } from "./ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "./ui/dialog";
import { cancelTask, confirmTask, reconcileTask, reviewTask, reviseTask, type Review } from "@/lib/actions";
import { DELIVERY, STATUS, when } from "@/lib/status";
import type { TaskDetail } from "@/lib/types";

export function TaskLive({ initial }: { initial: TaskDetail }) {
  const [d, setD] = useState(initial);
  const [live, setLive] = useState<"connecting" | "live" | "offline">("connecting");
  const id = initial.task.id;

  useEffect(() => {
    setD(initial);
  }, [initial]);

  useEffect(() => {
    const es = new EventSource(`/api/tasks/${id}/stream`);
    es.addEventListener("task", (e) => { setD(JSON.parse((e as MessageEvent).data) as TaskDetail); setLive("live"); });
    es.onopen = () => setLive("live");
    es.onerror = () => setLive("offline");
    return () => es.close();
  }, [id]);

  const st = STATUS[d.task.status] ?? { label: d.task.status, tone: "neutral" as const };
  const draft = d.draft;
  const canReview = d.task.status === "ready_for_review";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Application</p>
          <h1 className="font-display mt-2 text-4xl sm:text-5xl">{d.role?.title ?? "Role removed"}</h1>
          <p className="mt-1 text-muted">{d.role?.company}{d.task.callSessionId && <span className="ml-2 inline-flex items-center gap-1 text-[13px]"><Phone className="size-3.5" /> started by phone</span>}</p>
        </div>
        <div className="flex flex-col items-end gap-2" aria-live="polite">
          <Badge tone={st.tone} className="px-3 py-1 text-sm">{st.busy && <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />}{st.label}</Badge>
          {d.simulated && <Badge tone="warn">Simulated email provider</Badge>}
          <span className="text-xs text-muted">{live === "live" ? "Live updates on" : live === "offline" ? "Reconnecting…" : "Connecting…"}</span>
        </div>
      </div>

      {d.task.status === "failed" && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-danger/30 bg-danger-soft px-5 py-4">
          <p className="flex items-start gap-2 text-sm text-danger"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> {d.task.lastError ?? "Something went wrong."} {draft && "Your draft is saved."}</p>
          <RetryButton id={id} />
        </div>
      )}
      {d.task.status === "send_uncertain" && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-warn/30 bg-warn-soft px-5 py-4">
          <p className="text-sm text-warn">We couldn&apos;t confirm the email service accepted this. DIAL retries safely with the same idempotency key, so it can&apos;t send twice.</p>
          <ReconcileButton id={id} />
        </div>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[20rem_1fr]">
        <section aria-labelledby="tl" className="lg:sticky lg:top-24">
          <h2 id="tl" className="eyebrow mb-4">Timeline</h2>
          <ol className="relative space-y-5 border-l border-line pl-5">
            {d.events.map((e, i) => (
              <li key={e.id} className="relative">
                <span className={`absolute -left-[25px] top-1.5 size-2.5 rounded-full ring-4 ring-canvas ${i === d.events.length - 1 ? "bg-accent" : "bg-line-strong"}`} />
                <p className="text-sm">{e.message}</p>
                <p className="text-xs text-muted">{when(e.createdAt)}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="space-y-6">
          <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-card">
            {!draft ? (
              <div className="flex items-center gap-3 py-10 text-muted"><Loader2 className="size-5 animate-spin motion-reduce:animate-none" /> DIAL is reading the role and your profile…</div>
            ) : (
              <Tabs defaultValue="email">
                <TabsList>
                  <TabsTrigger value="email"><Mail className="mr-1.5 inline size-4" />Email</TabsTrigger>
                  <TabsTrigger value="pdf"><FileText className="mr-1.5 inline size-4" />PDF</TabsTrigger>
                  <TabsTrigger value="changes">Changes</TabsTrigger>
                </TabsList>
                <TabsContent value="email">
                  <dl className="space-y-2 text-sm">
                    <div className="flex gap-3"><dt className="w-20 shrink-0 text-muted">To</dt><dd className="break-all">{draft.recipient}</dd></div>
                    <div className="flex gap-3"><dt className="w-20 shrink-0 text-muted">Reply-To</dt><dd>your profile email</dd></div>
                    <div className="flex gap-3"><dt className="w-20 shrink-0 text-muted">Subject</dt><dd>{draft.subject}</dd></div>
                    <div className="flex gap-3"><dt className="w-20 shrink-0 text-muted">Attached</dt><dd>{draft.attachmentFilename} <span className="text-muted">({draft.attachmentChoice === "original" ? "your original CV" : "tailored CV"})</span></dd></div>
                  </dl>
                  <pre className="mt-5 whitespace-pre-wrap rounded-xl bg-canvas p-4 font-sans text-[15px] leading-relaxed">{draft.body}</pre>
                </TabsContent>
                <TabsContent value="pdf">
                  <iframe key={draft.version} title="CV preview" src={`/api/tasks/${id}/pdf#toolbar=0&view=FitH`} className="h-[34rem] w-full rounded-xl border border-line bg-canvas" />
                  <a href={`/api/tasks/${id}/pdf`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"><ExternalLink className="size-4" /> Open or download PDF</a>
                  <p className="mt-1 text-xs text-muted">SHA-256 {draft.attachmentSha256.slice(0, 16)}… — the exact file that gets sent.</p>
                </TabsContent>
                <TabsContent value="changes">
                  <ul className="space-y-2 text-sm">{draft.changeSummary.map((c, i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-accent" />{c}</li>)}</ul>
                  <p className="mt-4 text-xs text-muted">Drawn from {draft.supportingEntryIds.length} entr{draft.supportingEntryIds.length === 1 ? "y" : "ies"} in your profile. Citing an entry isn&apos;t proof the wording is right, so read it before approving.</p>
                  {d.versions.length > 1 && <p className="mt-2 text-xs text-muted">Version {draft.version} of {d.versions.length}.</p>}
                </TabsContent>
              </Tabs>
            )}
          </section>

          {draft && (
            <div className="flex flex-wrap gap-3">
              {canReview && <ReviewDialog id={id} />}
              {(canReview) && <ReviseDialog id={id} hasOriginal />}
              {(d.task.status === "preparing" || canReview) && <CancelButton id={id} />}
            </div>
          )}

          <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6" aria-labelledby="ev">
            <h2 id="ev" className="mb-4 font-medium">Evidence</h2>
            <dl className="grid gap-5 text-sm sm:grid-cols-3">
              <div><dt className="text-muted">Approval</dt><dd className="mt-1">{d.approval ? <>Version {d.approval.draftVersion} approved<span className="block text-xs text-muted">{d.approval.evidence?.kind === "voice-tool-invocation" ? "by phone (agent invoked confirm with a valid review token)" : "by web click"} · {when(d.approval.createdAt)}</span></> : <span className="text-muted">Not approved</span>}</dd></div>
              <div><dt className="text-muted">Submission</dt><dd className="mt-1">{d.attempt ? <>{d.attempt.status === "submitted" ? "Accepted by email service" : d.attempt.status === "uncertain" ? "Unconfirmed" : d.attempt.status === "failed" ? "Not sent" : "Queued"}<span className="block text-xs text-muted">{d.attempt.provider}{d.attempt.providerMessageId ? ` · ${d.attempt.providerMessageId}` : ""}</span></> : <span className="text-muted">Nothing submitted</span>}</dd></div>
              <div><dt className="text-muted">Delivery</dt><dd className="mt-1">{d.attempt?.status === "submitted" ? DELIVERY[d.attempt.deliveryStatus] ?? d.attempt.deliveryStatus : <span className="text-muted">—</span>}
                {d.simulated && d.attempt && <span className="block text-xs text-warn">Simulated provider: no inbox received this.</span>}</dd></div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

function useAct() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = useCallback((fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => start(async () => {
    setErr(null);
    const r = await fn();
    if (!r.ok) setErr((r as { error: string }).error); else { after?.(); router.refresh(); }
  }), [router]);
  return { err, pending, run, setErr };
}

function CancelButton({ id }: { id: string }) {
  const { err, pending, run } = useAct();
  return <span className="inline-flex flex-col"><Button variant="ghost" disabled={pending} onClick={() => run(() => cancelTask(id))}><X /> Cancel</Button>{err && <span role="alert" className="text-xs text-danger">{err}</span>}</span>;
}
function RetryButton({ id }: { id: string }) {
  const { err, pending, run } = useAct();
  return <span className="inline-flex flex-col items-end"><Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => reviseTask(id, "", false))}><RefreshCw /> Try again</Button>{err && <span role="alert" className="text-xs text-danger">{err}</span>}</span>;
}
function ReconcileButton({ id }: { id: string }) {
  const { err, pending, run } = useAct();
  return <span className="inline-flex flex-col items-end"><Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => reconcileTask(id))}><RefreshCw /> Re-check now</Button>{err && <span role="alert" className="text-xs text-danger">{err}</span>}</span>;
}

function ReviseDialog({ id }: { id: string; hasOriginal?: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [orig, setOrig] = useState(false);
  const { err, pending, run } = useAct();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="secondary"><Undo2 /> Revise</Button></DialogTrigger>
      <DialogContent title="Revise this application" description="Any change creates a new version and cancels earlier approval.">
        <div className="space-y-4">
          <div><Label htmlFor="rev">What should change?</Label><Textarea id="rev" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Make the email shorter and lead with my React work." /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[#355e4b]" checked={orig} onChange={(e) => setOrig(e.target.checked)} /> Attach my original CV instead</label>
          {err && <p role="alert" className="text-sm text-danger">{err}</p>}
          <div className="flex justify-end gap-3"><DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button disabled={pending || (!text.trim() && !orig)} onClick={() => run(() => reviseTask(id, text.trim(), orig), () => { setOpen(false); setText(""); setOrig(false); })}>{pending ? "Working…" : "Create new version"}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDialog({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [rev, setRev] = useState<Review | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const { err, pending, run } = useAct();
  const loaded = useRef(false);
  const load = async () => { const r = await reviewTask(id); if (r.ok && r.data) setRev(r.data); else if (!r.ok) setLoadErr(r.error); };
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o && !loaded.current) { loaded.current = true; void load(); } if (!o) { loaded.current = false; setRev(null); setLoadErr(null); } }}>
      <DialogTrigger asChild><Button><Send /> Review &amp; approve</Button></DialogTrigger>
      <DialogContent title="Approve and send" description="This is exactly what will be sent, once.">
        {loadErr ? <p role="alert" className="text-sm text-danger">{loadErr}</p> : !rev ? (
          <p className="flex items-center gap-2 text-muted"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> Preparing review…</p>
        ) : (
          <div className="space-y-4">
            <dl className="space-y-2 rounded-xl bg-canvas p-4 text-sm">
              <div><dt className="text-muted">To</dt><dd className="break-all font-medium">{rev.recipient}</dd></div>
              <div><dt className="text-muted">Subject</dt><dd>{rev.subject}</dd></div>
              <div><dt className="text-muted">Attachment</dt><dd>{rev.attachment}</dd></div>
            </dl>
            <ul className="space-y-1.5 text-sm">{rev.changeSummary.map((c, i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-accent" />{c}</li>)}</ul>
            {err && <p role="alert" className="text-sm text-danger">{err}</p>}
            <div className="flex justify-end gap-3"><DialogClose asChild><Button variant="ghost">Not yet</Button></DialogClose>
              <Button disabled={pending} onClick={() => run(() => confirmTask(id, rev.token), () => setOpen(false))}>{pending ? "Approving…" : "Approve and send"}</Button></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
