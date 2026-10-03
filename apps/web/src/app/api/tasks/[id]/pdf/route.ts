import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
const API = process.env.API_URL ?? "http://localhost:8080";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const u = await fetch(`${API}/v1/tasks/${encodeURIComponent(id)}/download-url`, { method: "POST", headers: s.headers, cache: "no-store" });
  if (!u.ok) return new Response("Not found", { status: u.status === 404 ? 404 : 502 });
  const { url } = (await u.json()) as { url: string };
  const f = await fetch(`${API}${url}`, { cache: "no-store" });
  if (!f.ok) return new Response("Unavailable", { status: 502 });
  return new Response(f.body, { headers: { "content-type": "application/pdf", "content-disposition": f.headers.get("content-disposition") ?? "inline", "cache-control": "private, no-store" } });
}
