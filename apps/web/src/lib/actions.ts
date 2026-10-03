"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api, ApiError, apiFetch } from "./api";
import { DEV_COOKIE, devAuthEnabled, getSession, supabaseConfigured, supabaseServer } from "./session";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
const fail = (e: unknown): { ok: false; error: string } => ({ ok: false, error: e instanceof ApiError ? e.message : "Something went wrong. Please try again." });
async function sess() { const s = await getSession(); if (!s) redirect("/sign-in"); return s; }

/* ---- auth ---- */
export async function devSignIn(_: unknown, fd: FormData): Promise<ActionResult> {
  if (!devAuthEnabled()) return { ok: false, error: "Development sign-in is disabled." };
  const u = String(fd.get("user") ?? "").trim();
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(u)) return { ok: false, error: "Use letters, numbers, - or _ (max 64)." };
  (await cookies()).set(DEV_COOKIE, u, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/app");
}
export async function passwordAuth(_: unknown, fd: FormData): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: "Authentication isn't configured." };
  const email = String(fd.get("email") ?? ""), password = String(fd.get("password") ?? ""), mode = String(fd.get("mode"));
  const sb = await supabaseServer();
  const { error } = mode === "signup" ? await sb.auth.signUp({ email, password }) : await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  if (mode === "signup") return { ok: true, data: undefined };
  redirect("/app");
}
export async function signOut() {
  (await cookies()).delete(DEV_COOKIE);
  if (supabaseConfigured()) await (await supabaseServer()).auth.signOut();
  redirect("/");
}

/* ---- profile / cv / roles ---- */
export async function saveProfile(profile: unknown, confirmReviewed: boolean): Promise<ActionResult> {
  try { await api(await sess(), "/v1/profile", { method: "PUT", json: { profile, confirmReviewed } }); revalidatePath("/app", "layout"); return { ok: true }; } catch (e) { return fail(e); }
}
export async function uploadCv(fd: FormData): Promise<ActionResult> {
  const f = fd.get("cv");
  if (!(f instanceof File) || f.size === 0) return { ok: false, error: "Choose a PDF first." };
  if (f.size > 5 * 1024 * 1024) return { ok: false, error: "The PDF must be under 5 MB." };
  try {
    const res = await apiFetch(await sess(), `/v1/cv?filename=${encodeURIComponent(f.name)}`, { method: "POST", headers: { "content-type": "application/pdf" }, body: Buffer.from(await f.arrayBuffer()) });
    if (!res.ok) throw new ApiError(res.status, (await res.json().catch(() => ({}))).message ?? "Upload failed");
    revalidatePath("/app", "layout"); return { ok: true };
  } catch (e) { return fail(e); }
}
export async function saveRole(role: unknown): Promise<ActionResult> {
  try { await api(await sess(), "/v1/roles", { method: "POST", json: role }); revalidatePath("/app", "layout"); return { ok: true }; } catch (e) { return fail(e); }
}
export async function deleteRole(id: string): Promise<ActionResult> {
  try { await api(await sess(), `/v1/roles/${id}`, { method: "DELETE" }); revalidatePath("/app", "layout"); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- tasks ---- */
export async function createTask(roleId: string, useOriginalCv: boolean): Promise<ActionResult<{ taskId: string }>> {
  try { const r = await api<{ taskId: string }>(await sess(), "/v1/tasks", { method: "POST", json: { roleId, useOriginalCv } }); revalidatePath("/app", "layout"); return { ok: true, data: r }; } catch (e) { return fail(e); }
}
export async function reviseTask(id: string, instruction: string, useOriginalCv: boolean): Promise<ActionResult> {
  try { await api(await sess(), `/v1/tasks/${id}/revise`, { method: "POST", json: { instruction: instruction || undefined, useOriginalCv } }); return { ok: true }; } catch (e) { return fail(e); }
}
export async function cancelTask(id: string): Promise<ActionResult> {
  try { await api(await sess(), `/v1/tasks/${id}/cancel`, { method: "POST" }); return { ok: true }; } catch (e) { return fail(e); }
}
export async function reconcileTask(id: string): Promise<ActionResult> {
  try { await api(await sess(), `/v1/tasks/${id}/reconcile`, { method: "POST" }); return { ok: true }; } catch (e) { return fail(e); }
}
export interface Review { token: string; version: number; recipient: string; subject: string; body: string; attachment: string; changeSummary: string[] }
export async function reviewTask(id: string): Promise<ActionResult<Review>> {
  try { return { ok: true, data: await api<Review>(await sess(), `/v1/tasks/${id}/review`, { method: "POST" }) }; } catch (e) { return fail(e); }
}
export async function confirmTask(id: string, reviewToken: string): Promise<ActionResult> {
  try { await api(await sess(), `/v1/tasks/${id}/confirm`, { method: "POST", json: { reviewToken } }); return { ok: true }; } catch (e) { return fail(e); }
}

/* ---- account ---- */
export async function deleteAccount(): Promise<ActionResult> {
  try { await api(await sess(), "/v1/account", { method: "DELETE" }); } catch (e) { return fail(e); }
  await signOut();
  return { ok: true };
}
