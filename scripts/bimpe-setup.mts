/**
 * Registers Dial's six voice tools on a BimpeAI agent as a custom HTTP API integration.
 *
 * NOT YET RUN against a live BimpeAI account (no API key was available when this was written). It follows the
 * @bimpeai/sdk@0.4.1 types and docs.bimpe.ai ("Configuring integrations via the API"). Review the printed plan first.
 *
 *   BIMPEAI_API_KEY=sk_... BIMPE_AGENT_ID=... DIAL_API_URL=https://api.example.com VOICE_TOOL_TOKEN=... \
 *     pnpm exec tsx scripts/bimpe-setup.mts [--apply]
 *
 * Telephony itself is NOT configured here: connect the Telephony channel on the Deploy screen, link a number under
 * Team settings -> Phone numbers, and pick the voice/greeting under Settings -> Voice (dashboard-only per the docs).
 */
import { BimpeAI } from "@bimpeai/sdk";

const env = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`${k} is required`); return v; };
const apply = process.argv.includes("--apply");
const agentId = env("BIMPE_AGENT_ID");
const base = env("DIAL_API_URL").replace(/\/$/, "");
const token = env("VOICE_TOOL_TOKEN");
if (token.length < 32) throw new Error("VOICE_TOOL_TOKEN must be at least 32 characters");

const str = (name: string, description: string, required = false) => ({ name, type: "string" as const, description, required });
const tools = [
  { name: "list_saved_roles", path: "list_saved_roles", description: "List the roles the caller has saved. Use when they ask what they can apply for.", body: [] },
  { name: "prepare_application", path: "prepare_application", description: "Start preparing an application. Returns a task_id immediately; poll get_application_status.",
    body: [str("role_hint", "Company or job title the caller mentioned, if any."), { name: "use_original_cv", type: "boolean" as const, description: "True only if the caller asked to use their original CV.", required: false }] },
  { name: "get_application_status", path: "get_application_status", description: "Check progress of an application. Speak the 'spoken' field. Call every few seconds until it is ready for review.", body: [str("task_id", "The task_id returned by prepare_application.", true)] },
  { name: "revise_application", path: "revise_application", description: "Change the draft. Any earlier approval stops counting. Then poll status and review again.",
    body: [str("task_id", "The task_id.", true), str("instruction", "What the caller wants changed, in their words.", true), { name: "use_original_cv", type: "boolean" as const, description: "True if they want their original CV attached.", required: false }] },
  { name: "review_application", path: "review_application", description: "Get the recipient, subject, attachment and changes to read back. Returns a review_token for confirm_and_send.", body: [str("task_id", "The task_id.", true)] },
  { name: "confirm_and_send", path: "confirm_and_send", description: "Send the reviewed draft. Only call after the caller clearly says yes to the exact read-back. Never claim it is sent; say it is being sent.",
    body: [str("task_id", "The task_id.", true), str("review_token", "The review_token from the most recent review_application.", true)] },
];

console.log(JSON.stringify({ agentId, baseUrl: `${base}/v1/voice/tools`, tools: tools.map((t) => t.name), apply }, null, 2));
if (!apply) { console.log("Dry run. Re-run with --apply to create the integration."); process.exit(0); }

const bimpe = new BimpeAI({ apiKey: env("BIMPEAI_API_KEY") });
const api = await bimpe.agents.integrations.customApi.configure(agentId, {
  name: "Dial", description: "Dial application workflow", base_url: `${base}/v1/voice/tools`, auth_type: "bearer", auth_config: { token },
});
for (const t of tools) {
  await bimpe.agents.integrations.customApi.tools.add(agentId, api.id, {
    name: t.name, description: t.description, http_method: "POST", url_template: `/${t.path}`, body_params: t.body,
    response_mapping: { path: "spoken" }, timeout: 15,
    // confirm_and_send is also gated by the spoken read-back in the agent prompt; keep the platform's own approval off so the call flows.
  });
  console.log("added", t.name);
}
