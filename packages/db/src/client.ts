import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
export interface DbHandle { db: Db; close(): Promise<void>; kind: "pglite" | "postgres" }

/** DATABASE_URL -> Postgres (Supabase). Otherwise an embedded PGlite (dev/tests only). */
export async function createDb(opts: { url?: string; dataDir?: string } = {}): Promise<DbHandle> {
  if (opts.url) {
    const postgres = (await import("postgres")).default;
    const client = postgres(opts.url, { max: 10, prepare: false });
    return { db: drizzlePg(client, { schema }) as unknown as Db, close: () => client.end(), kind: "postgres" };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = opts.dataDir ?? ".data/pglite";
  if (!dir.startsWith("memory://")) (await import("node:fs")).mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  await client.waitReady;
  return { db: drizzlePglite(client, { schema }) as unknown as Db, close: () => client.close(), kind: "pglite" };
}

export async function migrate(h: DbHandle, migrationsFolder: string): Promise<void> {
  if (h.kind === "postgres") {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(h.db as never, { migrationsFolder });
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(h.db as never, { migrationsFolder });
  }
}
