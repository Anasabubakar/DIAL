import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
const API = process.env.API_URL ?? "http://localhost:8080";

/** Authenticated SSE proxy: the browser never sees API credentials or the API origin. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const up = await fetch(`${API}/v1/tasks/${encodeURIComponent(id)}/stream`, { headers: s.headers, signal: req.signal, cache: "no-store" });
  if (!up.ok || !up.body) return new Response("Not found", { status: up.status === 404 ? 404 : 502 });
  return new Response(up.body, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" } });
}
