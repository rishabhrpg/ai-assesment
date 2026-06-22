import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Database } from "bun:sqlite";

function repoRoot(): string {
  const cwd = process.cwd();
  if (cwd.endsWith("src/server")) {
    return join(cwd, "../..");
  }
  return cwd;
}

function migrationsDir(): string {
  return join(repoRoot(), "database", "schema-or-migrations");
}

function dbPath(): string {
  const fromEnv = process.env.DATABASE_PATH;
  if (fromEnv) {
    return fromEnv.startsWith("/") ? fromEnv : join(repoRoot(), fromEnv);
  }
  return join(repoRoot(), "database", "data.db");
}

async function main() {
  const path = dbPath();
  mkdirSync(join(repoRoot(), "database"), { recursive: true });
  const dir = migrationsDir();
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const sqlite = new Database(path);
  sqlite.run("PRAGMA foreign_keys = ON;");

  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf-8");
    sqlite.exec(sql);
    console.log(`Applied migration: ${file}`);
  }

  sqlite.close();
  console.log(`Migrations complete. Database: ${path}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
