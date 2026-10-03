import { expect, test } from "vitest";
import { sql } from "drizzle-orm";
import { createDb, migrate, MIGRATIONS_DIR } from "../src";

test("migrations apply on embedded postgres and RLS is on everywhere", async () => {
  const h = await createDb({ dataDir: "memory://" });
  await migrate(h, MIGRATIONS_DIR);
  const r = await h.db.execute(sql`select relname, relrowsecurity from pg_class where relkind='r' and relnamespace='public'::regnamespace and relname not like '\\_\\_%'`);
  const rows = (r as unknown as { rows: { relname: string; relrowsecurity: boolean }[] }).rows;
  expect(rows.length).toBeGreaterThanOrEqual(11);
  expect(rows.filter((x) => !x.relrowsecurity)).toEqual([]);
  await h.close();
}, 60000);
