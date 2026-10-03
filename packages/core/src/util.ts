import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const newId = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
export const sha256 = (b: Uint8Array | string) => createHash("sha256").update(b).digest("hex");
export const fingerprint = (secret: string) => sha256(secret).slice(0, 12);

export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

/** Hash of everything the user approves. Any change to any field changes the hash. */
export function draftContentHash(d: { version: number; recipient: string; subject: string; body: string; attachmentSha256: string; attachmentFilename: string }) {
  return sha256(canonical(d));
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Compact HMAC-signed token: base64url(payload).base64url(sig) */
export function signToken(payload: Record<string, unknown>, secret: string): string {
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${p}.${createHmac("sha256", secret).update(p).digest("base64url")}`;
}
export function verifyToken<T extends { exp: number }>(token: string, secret: string): T | null {
  const [p, sig] = token.split(".");
  if (!p || !sig) return null;
  const want = createHmac("sha256", secret).update(p).digest("base64url");
  if (!safeEqual(sig, want)) return null;
  try {
    const v = JSON.parse(Buffer.from(p, "base64url").toString()) as T;
    return v.exp * 1000 > Date.now() ? v : null;
  } catch { return null; }
}

export const rowsOf = <T>(res: unknown): T[] =>
  (Array.isArray(res) ? res : (res as { rows: T[] }).rows) as T[];
