"use client";
import * as T from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";

// Underline tabs on Radix primitives. The active state carries a citron bar under Ink text.
export const Tabs = T.Root;
export function TabsList({ className, ...p }: T.TabsListProps) {
  return <T.List className={cn("flex gap-6 border-b border-line", className)} {...p} />;
}
export function TabsTrigger({ className, ...p }: T.TabsTriggerProps) {
  return (
    <T.Trigger
      className={cn("relative -mb-px inline-flex min-h-11 items-center border-b-[3px] border-transparent text-[15px] font-semibold text-muted transition-colors hover:text-ink data-[state=active]:border-citron data-[state=active]:text-ink data-[state=active]:[box-shadow:0_2px_0_0_var(--color-ink)]", className)}
      {...p}
    />
  );
}
export const TabsContent = ({ className, ...p }: T.TabsContentProps) => <T.Content className={cn("pt-5 focus-visible:outline-none", className)} {...p} />;
