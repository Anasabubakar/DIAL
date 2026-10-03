import { createRemoteJWKSet, jwtVerify } from "jose";
import type { FastifyRequest } from "fastify";
import { DialError, fingerprint, safeEqual } from "@dial/core";
import type { Config } from "@dial/core";

export function makeAuth(cfg: Config) {
  const secret = cfg.SUPABASE_JWT_SECRET ? new TextEncoder().encode(cfg.SUPABASE_JWT_SECRET) : null;
  const jwks = cfg.SUPABASE_JWKS_URL ? createRemoteJWKSet(new URL(cfg.SUPABASE_JWKS_URL)) : null;

  /** Web session: Supabase access token. DEV_AUTH is impossible in production (config fails closed). */
  async function webUser(req: FastifyRequest): Promise<string> {
    const h = req.headers.authorization;
    if (h?.startsWith("Bearer ")) {
      const token = h.slice(7);
      try {
        const { payload } = secret
          ? await jwtVerify(token, secret, { algorithms: ["HS256"], audience: "authenticated" })
          : jwks ? await jwtVerify(token, jwks, { audience: "authenticated" }) : (() => { throw new Error("no verifier"); })();
        if (typeof payload.sub === "string" && payload.sub) return payload.sub;
      } catch { /* fall through */ }
    }
    if (cfg.DEV_AUTH && cfg.NODE_ENV !== "production") {
      const u = req.headers["x-dev-user"];
      if (typeof u === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(u)) return u;
    }
    throw new DialError("forbidden", "Not signed in");
  }

  /**
   * Voice tool caller. BimpeAI sends one static bearer token and no verifiable per-call identity,
   * so the caller maps to exactly ONE configured demo user. Any user/caller field in the body is rejected by the schemas.
   */
  function voiceUser(req: FastifyRequest): { userId: string; fp: string } {
    if (cfg.VOICE_MODE !== "demo" || !cfg.VOICE_TOOL_TOKEN || !cfg.VOICE_DEMO_USER_ID) throw new DialError("unavailable", "Voice access is disabled");
    const h = req.headers.authorization ?? req.headers["x-api-key"];
    const raw = typeof h === "string" ? h.replace(/^Bearer /, "") : "";
    if (!raw || !safeEqual(raw, cfg.VOICE_TOOL_TOKEN)) throw new DialError("forbidden", "Invalid voice token");
    return { userId: cfg.VOICE_DEMO_USER_ID, fp: fingerprint(cfg.VOICE_TOOL_TOKEN) };
  }
  return { webUser, voiceUser };
}
