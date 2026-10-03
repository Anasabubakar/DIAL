import Link from "next/link";
import { DialSymbol } from "@/components/dial-mark";
import { buttonClass } from "@/components/ui/button";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-5 text-center">
      <DialSymbol height={64} />
      <h1 className="font-display mt-8 text-[clamp(1.9rem,5vw,2.5rem)]">We couldn&apos;t find that.</h1>
      <p className="mt-3 text-lg text-muted">It may have been removed, or it isn&apos;t yours to see. Head back and pick up from Home.</p>
      <Link href="/app" className={`${buttonClass("primary", "lg")} mt-8`}>Back to Home</Link>
    </main>
  );
}
