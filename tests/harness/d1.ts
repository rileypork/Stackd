import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Minimal in-memory D1 stand-in for route-level tests. Backed by node:sqlite so the real
 * migrations (including unique indexes and foreign keys) apply and the real route handlers run unmodified.
 */
type Row = Record<string, unknown>;

const toBindable = (value: unknown): SQLInputValue =>
  value === undefined ? null : (value as SQLInputValue);

class Statement {
  private readonly db: DatabaseSync;
  private readonly sql: string;
  private readonly values: unknown[];

  constructor(db: DatabaseSync, sql: string, values: unknown[] = []) {
    this.db = db;
    this.sql = sql;
    this.values = values;
  }

  bind(...values: unknown[]) {
    return new Statement(this.db, this.sql, values);
  }

  private params() {
    return this.values.map(toBindable);
  }

  async first<T = Row>(column?: string): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.params()) as Row | undefined;
    if (!row) return null;
    return (column ? row[column] : row) as T;
  }

  async all<T = Row>() {
    const results = this.db.prepare(this.sql).all(...this.params()) as T[];
    return { results, success: true as const, meta: { changes: 0, duration: 0 } };
  }

  async run() {
    const result = this.db.prepare(this.sql).run(...this.params());
    return { results: [], success: true as const, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid), duration: 0 } };
  }
}

export class FakeD1 {
  readonly sqlite = new DatabaseSync(":memory:");

  constructor() {
    this.sqlite.exec("PRAGMA foreign_keys = ON");
  }

  prepare(sql: string) {
    return new Statement(this.sqlite, sql);
  }

  async batch(statements: Statement[]) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }

  async exec(sql: string) {
    this.sqlite.exec(sql);
    return { count: 1, duration: 0 };
  }

  applyMigrations(root: string) {
    const journal = JSON.parse(readFileSync(join(root, "drizzle/meta/_journal.json"), "utf8")) as { entries: { tag: string }[] };
    for (const entry of journal.entries) {
      const sql = readFileSync(join(root, "drizzle", `${entry.tag}.sql`), "utf8");
      for (const statement of sql.split("--> statement-breakpoint")) {
        if (statement.trim()) this.sqlite.exec(statement);
      }
    }
  }

  reset() {
    this.sqlite.exec("DELETE FROM subscription_signals; DELETE FROM subscriptions; DELETE FROM user_apps; DELETE FROM user_projects;");
  }
}
