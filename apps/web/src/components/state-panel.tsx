import Link from "next/link";
import { DialSymbol } from "./dial-mark";
import { buttonClass } from "./ui/button";

/** Shared panel for errors and dead ends, in Dial's voice: say what happened, then the next step. */
export function StatePanel({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center px-5 py-24 text-center">
      <DialSymbol height={64} />
      <h1 className="font-display mt-8 text-[clamp(1.9rem,5vw,2.5rem)]">{title}</h1>
      <p className="mt-3 text-lg text-muted">{body}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">{action}<Link href="/app" className={buttonClass("secondary")}>Back to Home</Link></div>
    </div>
  );
}
