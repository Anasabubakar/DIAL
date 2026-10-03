import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const DEV_COOKIE = "dial_dev_user";
export const supabaseConfigured = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
/** Development sign-in is impossible in production builds, regardless of env. */
export const devAuthEnabled = () => process.env.NODE_ENV !== "production" && process.env.DEV_AUTH === "true";

export interface Session { userId: string; email?: string; headers: Record<string, string> }

export async function supabaseServer() {
  const jar = await cookies();
  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* called from a Server Component */ } },
    },
  });
}

/** Returns null when signed out. The API independently verifies the credential we forward. */
export async function getSession(): Promise<Session | null> {
  await cookies(); // always opt this request into dynamic rendering, whatever the env
  if (supabaseConfigured()) {
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.access_token) return { userId: user.id, email: user.email, headers: { authorization: `Bearer ${session.access_token}` } };
    }
  }
  if (devAuthEnabled()) {
    const dev = (await cookies()).get(DEV_COOKIE)?.value;
    if (dev && /^[a-zA-Z0-9_-]{1,64}$/.test(dev)) return { userId: dev, email: `${dev}@dev.local`, headers: { "x-dev-user": dev } };
  }
  return null;
}
