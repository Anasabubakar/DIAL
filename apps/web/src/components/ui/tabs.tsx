"use client";
import * as T from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";

// Original underline-style tabs on Radix primitives (shadcn/ui pattern, MIT).
export const Tabs = T.Root;
export function TabsList({ className, ...p }: T.TabsListProps) {
  return <T.List className={cn("flex gap-6 border-b border-line", className)} {...p} />;
}
export function TabsTrigger({ className, ...p }: T.TabsTriggerProps) {
  return (
    <T.Trigger
      className={cn("relative -mb-px border-b-2 border-transparent pb-2.5 pt-1 text-sm font-medium text-muted transition-colors hover:text-ink data-[state=active]:border-accent data-[state=active]:text-ink", className)}
      {...p}
    />
  );
}
export const TabsContent = ({ className, ...p }: T.TabsContentProps) => <T.Content className={cn("pt-5 focus-visible:outline-none", className)} {...p} />;
