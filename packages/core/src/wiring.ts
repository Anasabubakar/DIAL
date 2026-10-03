import { LocalStorage, OpenAIDrafter, ResendEmail, SandboxEmail, SimulatedDrafter, SupabaseStorage, restrictRecipient, type Drafter, type EmailProvider, type StorageProvider } from "@dial/providers";
import type { Config } from "./config";

/** Shared by the API and the worker so both run identical provider wiring. */
export function buildProviders(cfg: Config): { storage: StorageProvider; drafter: Drafter; email: EmailProvider } {
  const storage = cfg.STORAGE === "supabase"
    ? new SupabaseStorage(cfg.SUPABASE_URL!, cfg.SUPABASE_SERVICE_ROLE_KEY!, cfg.STORAGE_BUCKET)
    : new LocalStorage(`${cfg.DATA_DIR}/files`);
  const drafter = cfg.DRAFTER === "openai" ? new OpenAIDrafter(cfg.OPENAI_API_KEY!, cfg.OPENAI_MODEL!) : new SimulatedDrafter();
  let email: EmailProvider = cfg.EMAIL_PROVIDER === "resend" ? new ResendEmail(cfg.RESEND_API_KEY!, cfg.RESEND_WEBHOOK_SECRET!) : new SandboxEmail(cfg.RESEND_WEBHOOK_SECRET ?? "sandbox-secret");
  if (cfg.CONTROLLED_RECIPIENT) email = restrictRecipient(email, cfg.CONTROLLED_RECIPIENT);
  return { storage, drafter, email };
}
