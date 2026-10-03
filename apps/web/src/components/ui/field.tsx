import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type LabelHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const base = "w-full rounded-2xl border border-line-strong bg-surface px-4 text-base text-ink placeholder:text-stone transition-shadow focus-visible:border-ink focus-visible:outline-none focus-visible:shadow-[0_0_0_4px_var(--color-citron)] disabled:opacity-50";
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => <input ref={ref} className={cn(base, "h-12", className)} {...p} />);
Input.displayName = "Input";
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => <textarea ref={ref} className={cn(base, "min-h-28 py-3 leading-relaxed", className)} {...p} />);
Textarea.displayName = "Textarea";
export function Label({ className, ...p }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-semibold text-ink", className)} {...p} />;
}
export function Hint({ children }: { children: React.ReactNode }) { return <p className="mt-1.5 text-sm text-muted">{children}</p>; }
/** Native select styled to match inputs. */
export const selectClass = cn(base, "h-12 appearance-none bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10 [background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1.5 6 6.5l5-5' stroke='%2329232E' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")]");
