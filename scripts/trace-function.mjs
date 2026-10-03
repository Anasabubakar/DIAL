// Shows which pdfkit files Vercel's tracer (@vercel/nft) would ship with the API function.
//   pnpm --filter @dial/api run build:vercel && node scripts/trace-function.mjs
import { nodeFileTrace } from "@vercel/nft";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const { fileList } = await nodeFileTrace([path.join(root, "apps/api/api/index.js")], { base: root, processCwd: path.join(root, "apps/api"), conditions: ["node", "import"] });
const files = [...fileList];
const fonts = files.filter((f) => /pdfkit.*standard-fonts\/(Helvetica|HelveticaBold)\.(cjs|mjs)$/.test(f));
console.log("traced files:", files.length);
console.log("pdf-lib shipped:", fonts.length ? fonts.map((f) => f.split("pdfkit/")[1]).join(", ") : "NONE");
console.log("pdfkit required chunks shipped:", files.filter((f) => /pdfkit.*standard-fonts\/chunks/.test(f)).length);
