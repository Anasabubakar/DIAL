// PLACEHOLDER. `pnpm run build:vercel` (tsup.vercel.config.ts) overwrites this file with the bundled API handler.
// It exists in git only because Vercel validates the `functions` path before the build runs.
// Locally, run `git checkout apps/api/api/index.js` after building to keep it clean.
export default function handler(_req, res) {
  res.statusCode = 503;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ error: "unavailable", message: "The API bundle was not built." }));
}
