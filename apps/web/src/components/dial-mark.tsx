import Image from "next/image";
import { cn } from "@/lib/cn";

/*
  Approved Dial artwork, exported unchanged from Figma ("Dial — Brand Identity", 02 Logo system).
  Never skew, outline, recolour or add effects. Keep one mark-height clear around it.
  Symbol minimum: 24 px high on screens (use the symbol alone below that).
*/
const ASSET = {
  primary: { src: "/brand/symbol-primary.svg", w: 150, h: 125 }, // ink + citron, for paper/white
  reversed: { src: "/brand/symbol-reversed.svg", w: 138, h: 115 }, // paper + citron, for ink
} as const;

/** The folded two-part symbol. Pass the rendered height in px; width follows the artwork's 6:5 proportion. */
export function DialSymbol({ height = 32, tone = "primary", className }: { height?: number; tone?: keyof typeof ASSET; className?: string }) {
  const a = ASSET[tone];
  const width = Math.round((height * a.w) / a.h);
  return <Image src={a.src} width={width} height={height} alt="" aria-hidden="true" unoptimized priority className={cn("shrink-0", className)} style={{ width, height }} />;
}

/** Symbol + the Dial wordmark (Manrope ExtraBold, as set in the identity file). */
export function Wordmark({ tone = "primary", size = 22, className }: { tone?: keyof typeof ASSET; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center", className)} style={{ gap: size * 0.4 }}>
      <DialSymbol tone={tone} height={Math.round(size * 1.84)} />
      <span className={cn("font-extrabold leading-none tracking-[-0.01em]", tone === "reversed" ? "text-paper" : "text-ink")} style={{ fontSize: size }}>Dial</span>
      <span className="sr-only"> home</span>
    </span>
  );
}
