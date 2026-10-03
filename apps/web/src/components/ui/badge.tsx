import { cn } from "@/lib/cn";
// Citron is the accent for "good / active"; Ink for neutral; Dial red only for things that need attention.
const tones = {
  neutral: "bg-ink/8 text-ink",
  accent: "bg-citron text-ink",
  warn: "bg-citron-soft text-ink ring-1 ring-inset ring-ink/15",
  danger: "bg-danger-soft text-danger ring-1 ring-inset ring-end/30",
} as const;
export function Badge({ tone = "neutral", className, children }: { tone?: keyof typeof tones; className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold", tones[tone], className)}>{children}</span>;
}
