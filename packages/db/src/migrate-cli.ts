import { createDb, migrate } from "./client";
import { MIGRATIONS_DIR } from "./paths";
const h = await createDb({ url: process.env.DATABASE_URL });
await migrate(h, MIGRATIONS_DIR);
console.log(`migrated (${h.kind})`);
await h.close();
