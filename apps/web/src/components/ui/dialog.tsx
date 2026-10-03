"use client";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

// shadcn/ui-style dialog (MIT) on Radix, restyled.
export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;
export function DialogContent({ className, children, title, description, ...p }: D.DialogContentProps & { title: string; description?: string }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-40 bg-ink/35 backdrop-blur-[2px]" />
      <D.Content
        className={cn("fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[0_24px_60px_-20px_rgba(23,25,24,0.45)]", className)}
        {...p}
      >
        <D.Title className="font-display text-2xl">{title}</D.Title>
        {description ? <D.Description className="mt-1 text-sm text-muted">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
        <div className="mt-5">{children}</div>
        <D.Close aria-label="Close" className="absolute right-4 top-4 rounded-full p-1.5 text-muted hover:bg-black/5 hover:text-ink"><X className="size-4" /></D.Close>
      </D.Content>
    </D.Portal>
  );
}
