# BimpeAI integration contract (verified 2026-10-03)

Sources: https://docs.bimpe.ai (Quickstart, Use cases → Deploying and testing channels,
Configuring integrations, API reference) and `@bimpeai/sdk@0.4.1` type definitions.

## Verified

| Question | Finding |
|---|---|
| Telephony | Inbound and outbound voice. Calls appear under the `telephony` channel. `calls.make(agentId, {destination, is_test_call})` places outbound calls. |
| Number assignment | Dashboard: *Team settings → Phone numbers*. SDK: `phoneNumbers.requests.create` / `phoneNumbers.update`. Telephony is a usage-based add-on. |
| Voice and greeting | Dashboard: *Settings → Voice*. |
| Channel connection | Dashboard only (*Deploy → Telephony → Set up*). |
| Custom HTTP tools | `agents.integrations.customApi.configure` then `.tools.add`. |
| Tool auth | One static config per integration: `none`, `bearer`, `basic`, `api_key`, `custom`. |
| Tool schema | `name`, `http_method`, `url_template`, `url_params[]`, `body_params[]` (`{name,type,description,required}`), `headers_template`, `body_template`, `response_mapping`, `require_human_approval`, `timeout`. |
| Console API | `Authorization: Bearer sk_...` or `X-Api-Key`; Idempotency-Key and X-Request-Id supported. |

## NOT documented (do not assume)

- Per-call metadata (call ID, caller number, session ID) sent to tool endpoints.
- Tool timeout default or maximum.
- Speaking or pushing progress while a tool call is in flight.
- Behaviour when the agent polls a status tool repeatedly.
- Whether `headers_template` / `body_template` interpolate call variables.

## Consequences for DIAL

1. No cryptographically trustworthy user/session binding exists. The bearer token is static per
   integration, so DIAL resolves the voice caller from the *token* to one configured isolated demo
   profile (`VOICE_DEMO_USER_ID`) and ignores any caller-supplied user field. Public multi-user
   telephony stays disabled (`VOICE_MODE=disabled|demo`; no `public` mode exists).
2. Preparation is asynchronous: `prepare_application` returns a task ID immediately; the agent
   polls `get_application_status`, which returns a short spoken summary.
3. Call metadata is unavailable, so DIAL cannot prove which call confirmed a send. Confirmation
   evidence is `voice-tool-invocation` (token fingerprint + timestamp). A review token proves
   *content*, not spoken consent.
4. Telephony is only proven by a real call to a provisioned number. Simulated harness runs never count.
