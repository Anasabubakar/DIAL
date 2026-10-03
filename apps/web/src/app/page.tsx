import Link from "next/link";
import { ArrowRight, Check, FileText, Phone, ShieldCheck, Signal } from "lucide-react";
import { DialMark, Wordmark } from "@/components/dial-mark";
import { buttonClass } from "@/components/ui/button";
import { FlapStatus } from "@/components/flap-status";
import { getSession } from "@/lib/session";

const steps = [
  { n: "01", title: "Call.", body: "Dial from any phone and ask for your saved application. No laptop, no mobile data." },
  { n: "02", title: "Review.", body: "DIAL reads back the recipient, the attachment and what it changed. Revise it, or switch to your original CV." },
  { n: "03", title: "Done.", body: "Say yes and it sends the exact version you approved, once. You see proof of what was sent." },
];

export default async function Landing() {
  const session = await getSession();
  const phone = process.env.PUBLIC_PHONE_NUMBER;
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 sm:px-8">
      <header className="flex items-center justify-between py-6">
        <Wordmark />
        <nav className="flex items-center gap-2 text-sm">
          <Link href="#how" className="hidden rounded-full px-3 py-2 text-muted hover:text-ink sm:block">How it works</Link>
          <Link href="#honest" className="hidden rounded-full px-3 py-2 text-muted hover:text-ink sm:block">Before you start</Link>
          <Link href={session ? "/app" : "/sign-in"} className={buttonClass("secondary", "sm")}>{session ? "Open workspace" : "Sign in"}</Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="grid items-center gap-12 pb-20 pt-10 lg:grid-cols-[1.15fr_1fr] lg:pt-16">
          <div className="rise">
            <p className="eyebrow mb-5">Phone-operated workspace · private pilot</p>
            <h1 className="font-display text-[clamp(2.75rem,7vw,5.25rem)] leading-[0.98] text-balance">
              Your computer is one <em className="text-accent">phone call</em> away.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              A deadline closes tonight, your laptop is at home, and your data has run out. Call DIAL, ask for your application, hear what it plans to send, and approve it.
              DIAL prepares the email and PDF from your saved profile and sends it only on your say-so.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href={session ? "/app" : "/sign-in"} className={buttonClass("primary", "lg")}>
                Open your workspace <ArrowRight />
              </Link>
              {phone ? (
                <a href={`tel:${phone.replace(/\s/g, "")}`} className={buttonClass("secondary", "lg")}><Phone /> {phone}</a>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-line-strong px-5 py-3 text-sm text-muted">
                  <Phone className="size-4" /> Phone line opens when the pilot is enabled
                </span>
              )}
            </div>
          </div>

          <div className="rise relative mx-auto w-full max-w-md" style={{ animationDelay: "0.15s" }}>
            <div className="dial-wheel-wrap absolute -right-6 -top-10 hidden text-accent/80 sm:block"><DialMark animated className="size-28" /></div>
            <div className="relative rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <span className="eyebrow">Example · sample data</span>
                <FlapStatus />
              </div>
              <p className="font-display text-2xl leading-tight">Frontend Engineer, Paystack</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-line pb-3"><dt className="text-muted">To</dt><dd>jobs@paystack.example</dd></div>
                <div className="flex justify-between gap-4 border-b border-line pb-3"><dt className="text-muted">Attachment</dt><dd className="flex items-center gap-1.5"><FileText className="size-4 text-accent" /> Tailored CV (PDF)</dd></div>
                <div className="flex justify-between gap-4 border-b border-line pb-3"><dt className="text-muted">Changed</dt><dd className="text-right">Led with design-system work</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-muted">Approval</dt><dd className="flex items-center gap-1.5 text-accent"><Check className="size-4" /> Read back, approved</dd></div>
              </dl>
              <p className="mt-5 rounded-xl bg-canvas px-3.5 py-2.5 text-[13px] text-muted">Illustration only. Your workspace shows your real tasks, documents and delivery evidence.</p>
            </div>
          </div>
        </section>

        <section id="how" className="border-t border-line py-16">
          <p className="eyebrow mb-8">How it works</p>
          <ol className="grid gap-10 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n}>
                <span className="font-display text-sm text-muted">{s.n}</span>
                <h2 className="font-display mt-1 text-4xl">{s.title}</h2>
                <p className="mt-3 max-w-xs text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="honest" className="border-t border-line py-16">
          <p className="eyebrow mb-8">Before you start</p>
          <div className="grid gap-x-12 gap-y-8 md:grid-cols-3">
            <div>
              <Signal className="mb-3 size-5 text-accent" />
              <h3 className="font-medium">Cellular service, no mobile data</h3>
              <p className="mt-1.5 text-sm text-muted">You need a signal to place the call. You don&apos;t need data. DIAL&apos;s servers do the internet work. Your carrier&apos;s normal call charges still apply.</p>
            </div>
            <div>
              <FileText className="mb-3 size-5 text-accent" />
              <h3 className="font-medium">Set up first, on the web</h3>
              <p className="mt-1.5 text-sm text-muted">Save your profile, upload your CV and add the roles you care about in the workspace. DIAL only uses what you&apos;ve reviewed and confirmed.</p>
            </div>
            <div>
              <ShieldCheck className="mb-3 size-5 text-accent" />
              <h3 className="font-medium">It tells you what it can&apos;t prove</h3>
              <p className="mt-1.5 text-sm text-muted">&ldquo;Sent&rdquo; means the email service accepted your message. Inbox delivery is tracked separately. Phone access is a private pilot tied to one verified profile.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-8 text-sm text-muted">
        <span>© DIAL</span>
        <span>Emails are sent from DIAL&apos;s sender with your address as Reply-To.</span>
      </footer>
    </div>
  );
}
