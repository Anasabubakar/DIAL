"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ExternalLink, FileText, Loader2, Mail, Phone, RefreshCw, Send, Undo2, X } from "lucide-react";
import { Badge } from "./ui/badge";
import { DialSymbol } from "./dial-mark";
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
  const [online, setOnline] = useState(true);
  const id = initial.task.id;

  useEffect(() => {
    setD(initial);
  }, [initial]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    const es = new EventSource(`/api/tasks/${id}/stream`);
    es.addEventListener("task", (e) => { setD(JSON.parse((e as MessageEvent).data) as TaskDetail); setLive("live"); });
    es.onopen = () => setLive("live");
    es.onerror = () => setLive("offline");
    return () => es.close();
  }, [id]);

  const st = STATUS[d.task.status] ?? { label: d.task.status, tone: "neutral" as const, progress: 0, line: d.task.status };
  const draft = d.draft;
  const canReview = d.task.status === "ready_for_review";
  const headline = ({ preparing: "I'm on it.", ready_for_review: "Ready when you are.", sending: "Sending it now.", send_uncertain: "Just checking.", sent: "Done.", failed: "That didn't work.", cancelled: "Cancelled." } as Record<string, string>)[d.task.status] ?? "Hang on.";
  const sub = ({ preparing: "Dial is reading the role and your profile. You can leave this open.", ready_for_review: "Read it over. Nothing goes out until you say yes.", sending: "Dial is handing it to the email service.", send_uncertain: "Dial couldn't confirm it yet, so it's checking safely. It can't send twice.", sent: "The email service has your message. Delivery to the inbox shows below as it's confirmed.", failed: "Your draft is safe. You can try again.", cancelled: "Nothing was sent." } as Record<string, string>)[d.task.status] ?? "";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Request</p>
          <h1 className="font-display mt-2 text-[clamp(2rem,4.5vw,3rem)]">{d.role?.title ?? "Role removed"}</h1>
          <p className="mt-1 text-muted">{d.role?.company}{d.task.callSessionId && <span className="ml-3 inline-flex items-center gap-1 text-sm"><Phone className="size-3.5" /> started by phone</span>}</p>
        </div>
        <div className="flex flex-col items-end gap-2" aria-live="polite">
          <Badge tone={st.tone} className="px-4 py-1.5 text-sm">{st.busy && <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />}{st.label}</Badge>
          {d.simulated && <Badge tone="warn">Test email setup</Badge>}
          <span className="text-sm text-muted">{!online ? "You're offline. We'll catch up when you're back." : live === "live" ? "Updating live" : live === "offline" ? "Reconnecting…" : "Connecting…"}</span>
        </div>
      </div>

      <section aria-label="Progress" className="grid items-center gap-8 rounded-[var(--radius-card)] border border-line bg-surface p-7 shadow-card sm:grid-cols-[auto_1fr] sm:p-9">
        <DialSymbol height={84} />
        <div className="min-w-0">
          <p className="font-display text-[clamp(2rem,5vw,2.75rem)]">{headline}</p>
          <p className="mt-2 text-muted">{sub}</p>
          <div className="mt-6 rounded-2xl bg-paper p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Your request</p>
            <p className="mt-1 text-lg font-medium">Apply for {d.role?.title ?? "this role"}{d.role ? ` at ${d.role.company}` : ""}</p>
            <div role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(st.progress * 100)} aria-valuetext={st.line} className="relative mt-4 h-2 overflow-hidden rounded bg-track">
              <div className={`relative h-full rounded bg-citron transition-[width] duration-700 ease-out motion-reduce:transition-none ${st.busy ? "progress-busy overflow-hidden" : ""}`} style={{ width: `${Math.max(st.progress, 0.04) * 100}%` }} />
            </div>
            <p className="mt-2 text-sm text-muted">{st.line}</p>
          </div>
        </div>
      </section>

      {d.task.status === "failed" && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-end/40 bg-danger-soft px-6 py-4">
          <p className="flex items-start gap-2 text-[15px] text-danger"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> {d.task.lastError ?? "Something went wrong."}</p>
          <RetryButton id={id} />
        </div>
      )}
      {d.task.status === "send_uncertain" && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-ink/20 bg-citron-soft px-6 py-4">
          <p className="text-[15px]">Dial couldn&apos;t confirm the email service took it. It retries with the same ticket, so nothing can go out twice.</p>
          <ReconcileButton id={id} />
        </div>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[20rem_1fr]">
        <section aria-labelledby="tl" className="lg:sticky lg:top-24">
          <h2 id="tl" className="eyebrow mb-4">What happened</h2>
          <ol className="relative space-y-5 border-l border-line pl-5">
            {d.events.map((e, i) => (
              <li key={e.id} className="relative">
                <span className={`absolute -left-[25px] top-1.5 size-2.5 rounded-full ring-4 ring-paper ${i === d.events.length - 1 ? "bg-ink" : "bg-stone"}`} />
                <p className="text-[15px]">{e.message}</p>
                <p className="text-sm text-muted">{when(e.createdAt)}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="space-y-6">
          <section className="rounded-[var(--radius-card)] border border-line bg-surface p-7 shadow-card">
            {!draft ? (
              <div className="flex items-center gap-3 py-10 text-muted"><Loader2 className="size-5 animate-spin motion-reduce:animate-none" /> Dial is writing your application…</div>
            ) : (
              <Tabs defaultValue="email">
                <TabsList>
                  <TabsTrigger value="email"><Mail className="mr-1.5 inline size-4" />Email</TabsTrigger>
                  <TabsTrigger value="pdf"><FileText className="mr-1.5 inline size-4" />PDF</TabsTrigger>
                  <TabsTrigger value="changes">What changed</TabsTrigger>
                </TabsList>
                <TabsContent value="email">
                  <dl className="space-y-2.5 text-[15px]">
                    <div className="flex gap-3"><dt className="w-20 shrink-0 text-muted">To</dt><dd className="break-all">{draft.recipient}</dd></div>
                    <div className="flex gap-3"><dt className="w-20 shrink-0 text-muted">Replies to</dt><dd>your email</dd></div>
                    <div className="flex gap-3"><dt className="w-20 shrink-0 text-muted">Subject</dt><dd>{draft.subject}</dd></div>
                    <div className="flex gap-3"><dt className="w-20 shrink-0 text-muted">Attached</dt><dd>{draft.attachmentFilename} <span className="text-muted">({draft.attachmentChoice === "original" ? "your original CV" : "tailored CV"})</span></dd></div>
                  </dl>
                  <pre className="mt-5 whitespace-pre-wrap rounded-2xl bg-paper p-5 font-sans text-base leading-relaxed">{draft.body}</pre>
                </TabsContent>
                <TabsContent value="pdf">
                  <iframe key={draft.version} title="CV preview" src={`/api/tasks/${id}/pdf#toolbar=0&view=FitH`} className="h-[34rem] w-full rounded-2xl border border-line bg-paper" />
                  <a href={`/api/tasks/${id}/pdf`} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold underline-offset-4 hover:underline"><ExternalLink className="size-4" /> Open or download the PDF</a>
                  <p className="text-sm text-muted">Fingerprint {draft.attachmentSha256.slice(0, 16)}… This is the exact file that goes out.</p>
                </TabsContent>
                <TabsContent value="changes">
                  <ul className="space-y-2.5 text-[15px]">{draft.changeSummary.map((c, i) => <li key={i} className="flex gap-2.5"><Check className="mt-0.5 size-5 shrink-0 rounded-full bg-citron p-1 text-ink" />{c}</li>)}</ul>
                  <p className="mt-4 text-sm text-muted">Built from {draft.supportingEntryIds.length} {draft.supportingEntryIds.length === 1 ? "entry" : "entries"} in your profile. Dial can point to where it got something, but only you can say the wording is right. Read it before you approve.</p>
                  {d.versions.length > 1 && <p className="mt-2 text-sm text-muted">Version {draft.version} of {d.versions.length}.</p>}
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

          <section className="rounded-[var(--radius-card)] border border-line bg-surface p-7" aria-labelledby="ev">
            <h2 id="ev" className="mb-5 text-lg font-bold">Proof</h2>
            <dl className="grid gap-6 text-[15px] sm:grid-cols-3">
              <div><dt className="text-sm font-bold text-muted">Your approval</dt><dd className="mt-1">{d.approval ? <>Version {d.approval.draftVersion} approved<span className="block text-sm text-muted">{d.approval.evidence?.kind === "voice-tool-invocation" ? "on the phone" : "on the web"} · {when(d.approval.createdAt)}</span></> : <span className="text-muted">Not approved yet</span>}</dd></div>
              <div><dt className="text-sm font-bold text-muted">Handed to email</dt><dd className="mt-1">{d.attempt ? <>{d.attempt.status === "submitted" ? "Accepted by email service" : d.attempt.status === "uncertain" ? "Not confirmed yet" : d.attempt.status === "failed" ? "Not sent" : "Queued"}<span className="block text-sm text-muted">{d.attempt.provider}{d.attempt.providerMessageId ? ` · ${d.attempt.providerMessageId}` : ""}</span></> : <span className="text-muted">Nothing sent yet</span>}</dd></div>
              <div><dt className="text-sm font-bold text-muted">Delivery</dt><dd className="mt-1">{d.attempt?.status === "submitted" ? DELIVERY[d.attempt.deliveryStatus] ?? d.attempt.deliveryStatus : <span className="text-muted">—</span>}
                {d.simulated && d.attempt && <span className="block text-sm text-muted">Test setup: no inbox received this.</span>}</dd></div>
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
  return <span className="inline-flex flex-col"><Button variant="ghost" disabled={pending} onClick={() => run(() => cancelTask(id))}><X /> Cancel request</Button>{err && <span role="alert" className="text-sm text-danger">{err}</span>}</span>;
}
function RetryButton({ id }: { id: string }) {
  const { err, pending, run } = useAct();
  return <span className="inline-flex flex-col items-end"><Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => reviseTask(id, "", false))}><RefreshCw /> Try again</Button>{err && <span role="alert" className="text-sm text-danger">{err}</span>}</span>;
}
function ReconcileButton({ id }: { id: string }) {
  const { err, pending, run } = useAct();
  return <span className="inline-flex flex-col items-end"><Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => reconcileTask(id))}><RefreshCw /> Check again</Button>{err && <span role="alert" className="text-sm text-danger">{err}</span>}</span>;
}

function ReviseDialog({ id }: { id: string; hasOriginal?: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [orig, setOrig] = useState(false);
  const { err, pending, run } = useAct();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="secondary"><Undo2 /> Change something</Button></DialogTrigger>
      <DialogContent title="Change something" description="Any change makes a new version, and earlier approval no longer counts.">
        <div className="space-y-4">
          <div><Label htmlFor="rev">What should be different?</Label><Textarea id="rev" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Keep it shorter and lead with my React work." /></div>
          <label className="flex min-h-11 items-center gap-3 text-[15px]"><input type="checkbox" className="size-5 shrink-0 accent-ink" checked={orig} onChange={(e) => setOrig(e.target.checked)} /> Send my original CV instead</label>
          {err && <p role="alert" className="text-sm text-danger">{err}</p>}
          <div className="flex justify-end gap-3"><DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button disabled={pending || (!text.trim() && !orig)} onClick={() => run(() => reviseTask(id, text.trim(), orig), () => { setOpen(false); setText(""); setOrig(false); })}>{pending ? "Working…" : "Make the change"}</Button></div>
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
      <DialogTrigger asChild><Button><Send /> Review and approve</Button></DialogTrigger>
      <DialogContent title="Ready to send?" description="This is exactly what goes out, and it goes out once.">
        {loadErr ? <p role="alert" className="text-sm text-danger">{loadErr}</p> : !rev ? (
          <p className="flex items-center gap-2 text-muted"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> Getting it ready…</p>
        ) : (
          <div className="space-y-4">
            <dl className="space-y-3 rounded-2xl bg-surface p-5 text-[15px]">
              <div><dt className="text-muted">To</dt><dd className="break-all font-medium">{rev.recipient}</dd></div>
              <div><dt className="text-muted">Subject</dt><dd>{rev.subject}</dd></div>
              <div><dt className="text-muted">Attachment</dt><dd>{rev.attachment}</dd></div>
            </dl>
            <ul className="space-y-2 text-[15px]">{rev.changeSummary.map((c, i) => <li key={i} className="flex gap-2.5"><Check className="mt-0.5 size-5 shrink-0 rounded-full bg-citron p-1 text-ink" />{c}</li>)}</ul>
            {err && <p role="alert" className="text-sm text-danger">{err}</p>}
            <div className="flex justify-end gap-3"><DialogClose asChild><Button variant="ghost">Not yet</Button></DialogClose>
              <Button disabled={pending} onClick={() => run(() => confirmTask(id, rev.token), () => setOpen(false))}>{pending ? "Sending…" : "Yes, send it"}</Button></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
