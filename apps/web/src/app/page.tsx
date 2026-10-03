import Link from "next/link";
import { ArrowRight, Check, FileText, Phone } from "lucide-react";
import { DialSymbol, Wordmark } from "@/components/dial-mark";
import { buttonClass } from "@/components/ui/button";
import { getSession } from "@/lib/session";

const steps = [
  { n: "1", title: "Call.", body: "Ring Dial and say which application you want. No laptop. No mobile data." },
  { n: "2", title: "Review.", body: "Dial reads back who it's going to, what's attached and what it changed. Ask for edits, or switch to your own CV." },
  { n: "3", title: "Done.", body: "Say yes and Dial sends exactly what you approved, once. You get proof of what happened." },
];

export default async function Landing() {
  const session = await getSession();
  const phone = process.env.PUBLIC_PHONE_NUMBER;
  const href = session ? "/app" : "/sign-in";
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 sm:px-8">
      <header className="flex h-[88px] items-center justify-between">
        <Link href="/" aria-label="Dial home"><Wordmark size={22} /></Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-[15px] font-medium">
          <Link href="#how" className="hidden min-h-11 items-center rounded-full px-4 text-muted hover:text-ink sm:inline-flex">How it works</Link>
          <Link href="#know" className="hidden min-h-11 items-center rounded-full px-4 text-muted hover:text-ink sm:inline-flex">Good to know</Link>
          <Link href={href} className={buttonClass("primary", "md")}>{session ? "Open Dial" : "Sign in"}</Link>
        </nav>
      </header>

      <main id="main" className="flex-1">
        <section className="grid items-center gap-10 pb-20 pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16">
          <div className="rise">
            <h1 className="font-display text-[clamp(2.6rem,6.2vw,4.5rem)]">Your computer is one phone call away.</h1>
            <p className="mt-6 max-w-lg text-lg leading-[1.55] text-muted">Tell Dial what you need. Review it. Get it done.</p>
            <p className="mt-3 max-w-lg text-base text-muted">Right now Dial does one job well: it prepares a job application from your saved profile and CV, reads it back on the phone, and sends it only when you say yes.</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href={href} className={buttonClass("primary", "lg")}>Meet Dial <ArrowRight /></Link>
              {phone ? (
                <a href={`tel:${phone.replace(/\s/g, "")}`} className={buttonClass("secondary", "lg")}><Phone /> {phone}</a>
              ) : (
                <span className="inline-flex min-h-[58px] items-center gap-2 rounded-full border border-dashed border-line-strong px-6 text-[15px] text-muted"><Phone className="size-4" /> The phone line opens once your pilot is switched on</span>
              )}
            </div>
          </div>
          <div className="rise flex justify-center lg:justify-end" style={{ animationDelay: "0.12s" }} aria-hidden="true">
            <DialSymbol height={280} className="h-auto max-w-full" />
          </div>
        </section>

        <section aria-label="Campaign" className="on-ink overflow-hidden rounded-[28px] bg-ink px-8 py-12 sm:px-14 sm:py-16">
          <div className="flex flex-wrap items-center justify-between gap-10">
            <p className="font-display text-[clamp(2.4rem,6vw,4.75rem)] text-paper">Call,<br />get shit done.</p>
            <DialSymbol tone="reversed" height={120} className="hidden sm:block" />
          </div>
          <p className="mt-6 max-w-md text-lg text-citron">Say what Dial will do, then get out of the way.</p>
        </section>

        <section id="how" className="py-20">
          <p className="eyebrow mb-3">How it works</p>
          <h2 className="font-display max-w-2xl text-[clamp(1.9rem,4vw,2.6rem)]">Three calm steps. You stay in control of the outcome.</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="rounded-[var(--radius-card)] border border-line bg-surface p-7">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-citron text-sm font-bold text-ink">{s.n}</span>
                <h3 className="font-display mt-5 text-4xl">{s.title}</h3>
                <p className="mt-3 text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="Example" className="grid items-center gap-10 pb-20 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-3">What you'll hear</p>
            <h2 className="font-display text-[clamp(1.9rem,4vw,2.6rem)]">I'm on it.</h2>
            <p className="mt-4 max-w-md text-muted">Dial always tells you what it heard, what it is doing and how to stop. Nothing goes out until you've said yes.</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-7 shadow-card">
            <p className="eyebrow">Example · sample data</p>
            <p className="mt-3 text-xl font-medium">Frontend Engineer at Paystack</p>
            <dl className="mt-5 space-y-3 text-[15px]">
              <div className="flex justify-between gap-4 border-b border-line pb-3"><dt className="text-muted">To</dt><dd>jobs@paystack.example</dd></div>
              <div className="flex justify-between gap-4 border-b border-line pb-3"><dt className="text-muted">Attached</dt><dd className="inline-flex items-center gap-1.5"><FileText className="size-4" /> Tailored CV (PDF)</dd></div>
              <div className="flex justify-between gap-4 border-b border-line pb-3"><dt className="text-muted">What changed</dt><dd className="text-right">Led with your design-system work</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Your approval</dt><dd className="inline-flex items-center gap-1.5"><Check className="size-4 rounded-full bg-citron p-0.5" /> Read back, then approved</dd></div>
            </dl>
            <p className="mt-6 rounded-2xl bg-paper px-4 py-3 text-sm text-muted">An illustration. Your own requests, documents and delivery proof show up in Dial once you start.</p>
          </div>
        </section>

        <section id="know" className="border-t border-line py-20">
          <p className="eyebrow mb-3">Good to know</p>
          <h2 className="font-display max-w-2xl text-[clamp(1.9rem,4vw,2.6rem)]">Clear words. Here's the small print, said plainly.</h2>
          <div className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-3">
            <div><h3 className="font-semibold">You need signal, not data</h3><p className="mt-2 text-muted">A call needs cellular service, nothing more. Dial's servers do the internet part. Your carrier's usual call charges still apply.</p></div>
            <div><h3 className="font-semibold">Set up first, on the web</h3><p className="mt-2 text-muted">Save your profile, upload your CV and add the roles you care about. Dial only ever uses what you've reviewed and confirmed.</p></div>
            <div><h3 className="font-semibold">Honest about what it can prove</h3><p className="mt-2 text-muted">&ldquo;Sent&rdquo; means the email service accepted your message. Whether it reached the inbox is tracked separately. Phone access is a private pilot tied to one verified profile.</p></div>
          </div>
        </section>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-8 text-sm text-muted">
        <Wordmark size={16} />
        <span>Emails go out from Dial&apos;s sender, with your address as Reply-To.</span>
      </footer>
    </div>
  );
}
