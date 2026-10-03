import { AppNav } from "@/components/app-nav";
import { requireSession } from "@/lib/api";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  return (
    <>
      <AppNav who={s.email ?? s.userId} />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-8">{children}</main>
    </>
  );
}
