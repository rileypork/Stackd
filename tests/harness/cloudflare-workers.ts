import { FakeD1 } from "./d1.ts";

/** Replaces the `cloudflare:workers` module during node tests; see tests/harness/register.mjs. */
export const db = new FakeD1();
db.applyMigrations(process.cwd());

/** Empty string disables the Workers identity fallback so route tests stay header-only. */
export const env: { DB: D1Database; STACKD_DEV_USER_EMAIL?: string } = {
  DB: db as unknown as D1Database,
  STACKD_DEV_USER_EMAIL: "",
};
