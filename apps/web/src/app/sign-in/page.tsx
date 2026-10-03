import { redirect } from "next/navigation";
import Link from "next/link";
import { DialSymbol, Wordmark } from "@/components/dial-mark";
import { SignInForms } from "./forms";
import { devAuthEnabled, getSession, supabaseConfigured } from "@/lib/session";

export const metadata = { title: "Sign in" };

export default async function SignIn() {
  if (await getSession()) redirect("/app");
  const supa = supabaseConfigured(), dev = devAuthEnabled();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1fr]">
      <main id="main" className="mx-auto flex w-full max-w-md flex-col justify-center px-5 py-10 sm:px-0">
        <Link href="/" aria-label="Dial home" className="mb-12 inline-flex"><Wordmark size={22} /></Link>
        <h1 className="font-display text-[clamp(2rem,5vw,2.75rem)]">Welcome back.</h1>
        <p className="mt-3 text-lg text-muted">Sign in to your profile, CV and saved roles. It's what Dial uses when you call.</p>
        <div className="mt-8">
          {supa || dev ? <SignInForms supabase={supa} dev={dev} /> : (
            <div role="alert" className="rounded-2xl border border-end/40 bg-danger-soft px-5 py-4 text-[15px] text-danger">
              <p className="font-semibold">Sign-in isn't switched on here.</p>
              <p className="mt-1">Dial keeps access closed until sign-in is set up, so your details stay private.</p>
            </div>
          )}
        </div>
      </main>
      <aside aria-hidden="true" className="on-ink hidden items-center justify-center bg-ink lg:flex">
        <div className="px-16">
          <DialSymbol tone="reversed" height={150} />
          <p className="font-display mt-10 max-w-sm text-5xl text-paper">Call, get shit done.</p>
          <p className="mt-4 max-w-xs text-lg text-citron">Say what Dial will do, then get out of the way.</p>
        </div>
      </aside>
    </div>
  );
}
