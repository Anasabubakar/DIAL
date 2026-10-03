import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api, ApiError, requireSession } from "@/lib/api";
import type { TaskDetail } from "@/lib/types";
import { TaskLive } from "@/components/task-live";

export const metadata = { title: "Application" };

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  let d: TaskDetail;
  try { d = await api<TaskDetail>(s, `/v1/tasks/${encodeURIComponent(id)}`); }
  catch (e) { if (e instanceof ApiError && e.status === 404) notFound(); throw e; }
  return (
    <div className="space-y-8">
      <Link href="/app" className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-muted hover:text-ink"><ArrowLeft className="size-4" /> Home</Link>
      <TaskLive initial={d} />
    </div>
  );
}
