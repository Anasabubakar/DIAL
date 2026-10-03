"use client";
import { Button } from "@/components/ui/button";

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-5 text-center">
      <h1 className="font-display text-[clamp(1.9rem,5vw,2.5rem)]">Something slipped.</h1>
      <p className="mt-3 text-lg text-muted">Nothing you saved was lost. Try again in a moment.</p>
      <Button className="mt-8" onClick={reset}>Try again</Button>
    </main>
  );
}
