"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Wordmark } from "./dial-mark";
import { cn } from "@/lib/cn";
import { signOut } from "@/lib/actions";

const links = [
  { href: "/app", label: "Home", exact: true },
  { href: "/app/profile", label: "About you" },
  { href: "/app/roles", label: "Roles" },
  { href: "/app/settings", label: "Connections" },
];

export function AppNav({ who }: { who: string }) {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 px-5 sm:gap-x-8 sm:px-8 sm:h-[68px] sm:flex-nowrap">
        <Link href="/app" aria-label="Dial home" className="flex h-16 shrink-0 items-center sm:h-auto"><Wordmark size={20} /></Link>
        <nav aria-label="Primary" className="order-3 -mx-2 flex w-[calc(100%+1rem)] items-center gap-1 overflow-x-auto pb-2 sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:pb-0">
          {links.map((l) => {
            const active = l.exact ? path === l.href : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}
                className={cn("inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-[15px] font-semibold transition-colors", active ? "bg-ink text-paper" : "text-muted hover:bg-ink/6 hover:text-ink")}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <form action={signOut} className="ml-auto flex items-center gap-3 sm:ml-0">
          <span className="hidden max-w-[11rem] truncate text-sm text-muted md:block" title={who}>{who}</span>
          <button className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold text-muted hover:bg-ink/6 hover:text-ink" aria-label="Sign out"><LogOut className="size-4" /><span className="hidden sm:inline">Sign out</span></button>
        </form>
      </div>
    </header>
  );
}
