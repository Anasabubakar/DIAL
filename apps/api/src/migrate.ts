import { createDb, migrate, MIGRATIONS_DIR } from "@dial/db";

// One-shot migration entrypoint for deploys: `node dist/migrate.js`. Requires DATABASE_URL.
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to run migrations");
const h = await createDb({ url: process.env.DATABASE_URL });
await migrate(h, MIGRATIONS_DIR);
console.log(JSON.stringify({ msg: "migrations applied", dir: MIGRATIONS_DIR }));
await h.close();
