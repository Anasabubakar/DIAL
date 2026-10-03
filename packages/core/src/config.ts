import { z } from "zod";

const bool = z.enum(["true", "false"]).default("false").transform((v) => v === "true");
const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(8080),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),
  SUPABASE_JWKS_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  DEV_AUTH: bool,
  VOICE_MODE: z.enum(["disabled", "demo"]).default("disabled"),
  VOICE_TOOL_TOKEN: z.string().optional(),
  VOICE_DEMO_USER_ID: z.string().optional(),
  REVIEW_TOKEN_SECRET: z.string().optional(),
  DOWNLOAD_TOKEN_SECRET: z.string().optional(),
  DRAFTER: z.enum(["simulated", "openai", "gemini"]).default("simulated"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["sandbox", "resend"]).default("sandbox"),
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  EMAIL_FROM: z.string().default("DIAL <apply@dial.invalid>"),
  CONTROLLED_RECIPIENT: z.string().email().optional(),
  STORAGE: z.enum(["local", "supabase"]).default("local"),
  STORAGE_BUCKET: z.string().default("dial-files"),
  DATA_DIR: z.string().default(".data"),
});
export type Config = z.infer<typeof Env> & { reviewSecret: string; downloadSecret: string };

/** Production fails closed: anything simulated, missing or dev-only is a startup error. */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const e = Env.parse(env);
  const problems: string[] = [];
  const need = (k: keyof typeof e, why: string) => { if (!e[k]) problems.push(`${k} is required (${why})`); };
  if (e.REVIEW_TOKEN_SECRET && e.REVIEW_TOKEN_SECRET.length < 32) problems.push("REVIEW_TOKEN_SECRET must be at least 32 characters");
  if (e.VOICE_MODE === "demo") {
    if (!e.VOICE_TOOL_TOKEN || e.VOICE_TOOL_TOKEN.length < 32) problems.push("VOICE_TOOL_TOKEN (>=32 chars) is required when VOICE_MODE=demo");
    need("VOICE_DEMO_USER_ID", "VOICE_MODE=demo");
  }
  if (e.EMAIL_PROVIDER === "resend") { need("RESEND_API_KEY", "EMAIL_PROVIDER=resend"); need("RESEND_WEBHOOK_SECRET", "webhook signature verification"); }
  if (e.DRAFTER === "openai") { need("OPENAI_API_KEY", "DRAFTER=openai"); need("OPENAI_MODEL", "DRAFTER=openai"); }
  if (e.DRAFTER === "gemini") { need("GEMINI_API_KEY", "DRAFTER=gemini"); need("GEMINI_MODEL", "DRAFTER=gemini"); }
  if (e.STORAGE === "supabase") { need("SUPABASE_URL", "STORAGE=supabase"); need("SUPABASE_SERVICE_ROLE_KEY", "STORAGE=supabase"); }
  if (e.NODE_ENV === "production") {
    if (e.DEV_AUTH) problems.push("DEV_AUTH must be false in production");
    if (!e.SUPABASE_JWT_SECRET && !e.SUPABASE_JWKS_URL) problems.push("SUPABASE_JWT_SECRET or SUPABASE_JWKS_URL is required in production");
    need("DATABASE_URL", "production");
    need("REVIEW_TOKEN_SECRET", "production");
    need("DOWNLOAD_TOKEN_SECRET", "production");
    if (e.EMAIL_PROVIDER !== "resend") problems.push("EMAIL_PROVIDER must be resend in production (sandbox is simulated)");
    if (e.DRAFTER === "simulated") problems.push("DRAFTER must be gemini or openai in production (the simulated drafter is not allowed)");
    if (e.STORAGE !== "supabase") problems.push("STORAGE must be supabase in production");
    if (!e.EMAIL_FROM || e.EMAIL_FROM.includes("dial.invalid")) problems.push("EMAIL_FROM must be a verified sender in production");
  }
  if (problems.length) throw new Error(`Invalid configuration:\n - ${problems.join("\n - ")}`);
  const dev = (s: string) => `dev-only-${s}-secret-not-for-production`.padEnd(40, "x");
  return { ...e, reviewSecret: e.REVIEW_TOKEN_SECRET ?? dev("review"), downloadSecret: e.DOWNLOAD_TOKEN_SECRET ?? dev("download") };
}
