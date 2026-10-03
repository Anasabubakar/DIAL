"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { devSignIn, passwordAuth, type ActionResult } from "@/lib/actions";

function Err({ r }: { r: ActionResult | null }) {
  if (!r) return null;
  if (!r.ok) return <p role="alert" className="text-sm text-danger">{r.error}</p>;
  return <p role="status" className="text-sm font-medium text-ink">Nearly there. Check your email to confirm your address, then sign in.</p>;
}

export function SignInForms({ supabase, dev }: { supabase: boolean; dev: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [pw, pwAction, pwPending] = useActionState(passwordAuth, null);
  const [dv, dvAction, dvPending] = useActionState(devSignIn, null);
  return (
    <div className="space-y-8">
      {supabase && (
        <form action={pwAction} className="space-y-4">
          <input type="hidden" name="mode" value={mode} />
          <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
          <div><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} required /></div>
          <Err r={pw} />
          <Button type="submit" className="w-full" disabled={pwPending}>{pwPending ? "One moment…" : mode === "signin" ? "Sign in" : "Create my account"}</Button>
          <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="w-full text-center min-h-11 text-[15px] font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
            {mode === "signin" ? "New to Dial? Create an account" : "Already have an account? Sign in"}
          </button>
        </form>
      )}
      {dev && (
        <form action={dvAction} className="space-y-4 rounded-2xl border border-dashed border-ink/40 bg-citron-soft p-5">
          <p className="text-sm font-bold text-ink">Development sign-in</p>
          <p className="text-sm text-ink/80">For local development only. This form doesn't exist in production builds.</p>
          <div><Label htmlFor="user">User name</Label><Input id="user" name="user" defaultValue="demo" required /></div>
          <Err r={dv} />
          <Button type="submit" variant="primary" className="w-full" disabled={dvPending}>Continue as this user</Button>
        </form>
      )}
    </div>
  );
}
