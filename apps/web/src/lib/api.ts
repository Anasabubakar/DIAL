import "server-only";
import { redirect } from "next/navigation";
import { getSession, type Session } from "./session";

const API = process.env.API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function apiFetch(session: Session, path: string, init: RequestInit = {}) {
  return fetch(`${API}${path}`, { ...init, cache: "no-store", headers: { ...session.headers, ...(init.headers as Record<string, string> | undefined) } });
}

export async function api<T>(session: Session, path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await apiFetch(session, path, { ...rest, headers: json !== undefined ? { "content-type": "application/json" } : undefined, body: json !== undefined ? JSON.stringify(json) : rest.body });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new ApiError(res.status, b.message ?? `Request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export async function requireSession() {
  const s = await getSession();
  if (!s) redirect("/sign-in");
  return s;
}
