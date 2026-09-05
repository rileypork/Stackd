// Applies drizzle/*.sql migrations to the local Miniflare D1 database used by `npm run dev`.
// Production migrations are applied by the hosting platform; this is for local development only.
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const d1Dir = join(root, ".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
const migrationsDir = join(root, "drizzle");

let dbFiles;
try {
  dbFiles = readdirSync(d1Dir).filter((file) => file.endsWith(".sqlite") && file !== "metadata.sqlite");
} catch {
  dbFiles = [];
}
if (!dbFiles.length) {
  console.error("No local D1 database found. Run `npm run dev` once (and hit /api/apps) so Miniflare creates it, then rerun.");
  process.exit(1);
}

const journal = JSON.parse(readFileSync(join(migrationsDir, "meta/_journal.json"), "utf8"));
const migrations = journal.entries.map((entry) => ({ tag: entry.tag, sql: readFileSync(join(migrationsDir, `${entry.tag}.sql`), "utf8") }));

for (const file of dbFiles) {
  const path = join(d1Dir, file);
  if (!statSync(path).isFile()) continue;
  const db = new DatabaseSync(path);
  db.exec("CREATE TABLE IF NOT EXISTS __drizzle_migrations (tag TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  const applied = new Set(db.prepare("SELECT tag FROM __drizzle_migrations").all().map((row) => row.tag));
  for (const migration of migrations) {
    if (applied.has(migration.tag)) continue;
    db.exec("BEGIN");
    try {
      for (const statement of migration.sql.split("--> statement-breakpoint")) {
        if (statement.trim()) db.exec(statement);
      }
      db.prepare("INSERT INTO __drizzle_migrations (tag) VALUES (?)").run(migration.tag);
      db.exec("COMMIT");
      console.log(`applied ${migration.tag} -> ${file}`);
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  db.close();
}
console.log("Local D1 is up to date.");
