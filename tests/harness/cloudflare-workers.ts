import { FakeD1 } from "./d1.ts";

/** Replaces the `cloudflare:workers` module during node tests; see tests/harness/register.mjs. */
export const db = new FakeD1();
db.applyMigrations(process.cwd());

export const env = { DB: db as unknown as D1Database };
