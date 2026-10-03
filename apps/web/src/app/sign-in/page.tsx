import { redirect } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/dial-mark";
import { SignInForms } from "./forms";
import { devAuthEnabled, getSession, supabaseConfigured } from "@/lib/session";

export const metadata = { title: "Sign in" };

export default async function SignIn() {
  if (await getSession()) redirect("/app");
  const supa = supabaseConfigured(), dev = devAuthEnabled();
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-10"><Wordmark /></Link>
      <h1 className="font-display text-4xl">Sign in to your workspace</h1>
      <p className="mt-2 text-muted">Your profile, CV and saved roles live here. DIAL uses them when you call.</p>
      <div className="mt-8">
        {supa || dev ? <SignInForms supabase={supa} dev={dev} /> : (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            Sign-in isn&apos;t configured on this deployment, so access is closed.
          </div>
        )}
      </div>
    </div>
  );
}
