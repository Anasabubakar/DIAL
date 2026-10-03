import { fileURLToPath } from "node:url";
import path from "node:path";
export const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../drizzle");
