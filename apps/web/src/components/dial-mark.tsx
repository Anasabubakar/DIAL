import { cn } from "@/lib/cn";

/** Rotary-dial symbol: ten finger holes around a hub, with the finger stop. Decorative. */
export function DialMark({ className, animated = false }: { className?: string; animated?: boolean }) {
  const holes = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 180) * (40 + i * 28); // sweep leaving a gap for the finger stop
    return { x: 50 + 33 * Math.cos(a), y: 50 + 33 * Math.sin(a) };
  });
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={cn("size-8", className)}>
      <g className={animated ? "dial-wheel" : undefined}>
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="3" />
        {holes.map((h, i) => <circle key={i} cx={h.x} cy={h.y} r="6.2" fill="currentColor" />)}
        <circle cx="50" cy="50" r="12" fill="none" stroke="currentColor" strokeWidth="3" />
      </g>
      <path d="M86 78 L96 90" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-accent", className)}>
      <DialMark className="size-6" />
      <span className="font-display text-[26px] leading-none tracking-tight text-ink">DIAL</span>
    </span>
  );
}
