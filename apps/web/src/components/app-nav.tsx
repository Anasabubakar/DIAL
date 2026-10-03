"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Wordmark } from "./dial-mark";
import { cn } from "@/lib/cn";
import { signOut } from "@/lib/actions";

const links = [
  { href: "/app", label: "Overview", exact: true },
  { href: "/app/profile", label: "Profile & CV" },
  { href: "/app/roles", label: "Roles" },
  { href: "/app/settings", label: "Connection" },
];

export function AppNav({ who }: { who: string }) {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5 sm:px-8">
        <Link href="/app" aria-label="DIAL home"><Wordmark /></Link>
        <nav aria-label="Primary" className="-mx-1 flex flex-1 items-center gap-1 overflow-x-auto">
          {links.map((l) => {
            const active = l.exact ? path === l.href : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}
                className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors", active ? "bg-ink text-canvas" : "text-muted hover:bg-black/5 hover:text-ink")}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <form action={signOut} className="flex items-center gap-3">
          <span className="hidden max-w-[10rem] truncate text-[13px] text-muted md:block" title={who}>{who}</span>
          <button className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-black/5 hover:text-ink" aria-label="Sign out"><LogOut className="size-4" /><span className="hidden sm:inline">Sign out</span></button>
        </form>
      </div>
    </header>
  );
}
