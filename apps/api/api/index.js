// Thin, committed entrypoint for the Vercel function. The real app is bundled into api/_handler.js by
// `pnpm run build:vercel`. If it can't load (bad bundle, missing dependency) we answer with a clear 503
// instead of crashing the function. Set DIAL_DEBUG_BOOT=1 to include the load error's message in the response.
export default async function handler(req, res) {
  try {
    const mod = await import("./_handler.js");
    return await mod.default(req, res);
  } catch (e) {
    console.error(JSON.stringify({ msg: "handler load failed", error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) }));
    res.statusCode = 503;
    res.setHeader("content-type", "application/json");
    const detail = process.env.DIAL_DEBUG_BOOT === "1" && e instanceof Error ? `${e.name}: ${e.message}`.slice(0, 400) : undefined;
    res.end(JSON.stringify({ error: "unavailable", message: "Dial could not start.", detail }));
  }
}
