export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-8">
      <span className="sr-only">Loading…</span>
      <div className="h-4 w-24 animate-pulse rounded-full bg-track motion-reduce:animate-none" />
      <div className="h-12 w-2/3 max-w-lg animate-pulse rounded-2xl bg-track motion-reduce:animate-none" />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"><div className="h-64 animate-pulse rounded-[var(--radius-card)] bg-track motion-reduce:animate-none" /><div className="h-64 animate-pulse rounded-[var(--radius-card)] bg-track motion-reduce:animate-none" /></div>
    </div>
  );
}
