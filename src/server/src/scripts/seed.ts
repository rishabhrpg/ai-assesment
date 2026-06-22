import { Database } from "bun:sqlite";
import { join } from "node:path";
import { hashPassword } from "../lib/auth";

function repoRoot(): string {
  const cwd = process.cwd();
  if (cwd.endsWith("src/server")) {
    return join(cwd, "../..");
  }
  return cwd;
}

function dbPath(): string {
  const fromEnv = process.env.DATABASE_PATH;
  if (fromEnv) {
    return fromEnv.startsWith("/") ? fromEnv : join(repoRoot(), fromEnv);
  }
  return join(repoRoot(), "database", "data.db");
}

function tableExists(sqlite: Database, name: string): boolean {
  const row = sqlite
    .query("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name);
  return row != null;
}

async function main() {
  const path = dbPath();
  const sqlite = new Database(path);
  sqlite.run("PRAGMA foreign_keys = ON;");

  if (tableExists(sqlite, "sessions")) {
    sqlite.run("DELETE FROM sessions;");
  }
  sqlite.run("DELETE FROM comments;");
  sqlite.run("DELETE FROM tickets;");
  sqlite.run("DELETE FROM users;");

  // Hash passwords for demo users (all using "password123")
  const { hash: adminPasswordHash } = hashPassword("password123");
  const { hash: agentPasswordHash } = hashPassword("password123");
  const { hash: customerPasswordHash } = hashPassword("password123");

  // Admin user
  sqlite.run(
    `INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?);`,
    ["Admin User", "admin@example.com", "admin", adminPasswordHash]
  );

  // Manager user
  sqlite.run(
    `INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?);`,
    ["Manager Mike", "mike@example.com", "manager", agentPasswordHash]
  );

  // Agent users
  sqlite.run(
    `INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?);`,
    ["Alice Agent", "alice@example.com", "agent", agentPasswordHash]
  );
  sqlite.run(
    `INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?);`,
    ["Bob Builder", "bob@example.com", "agent", agentPasswordHash]
  );

  // Customer user
  sqlite.run(
    `INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?);`,
    ["Carol Customer", "carol@example.com", "customer", customerPasswordHash]
  );

  const alice = sqlite
    .query("SELECT id FROM users WHERE email = ?")
    .get("alice@example.com") as { id: number };
  const bob = sqlite
    .query("SELECT id FROM users WHERE email = ?")
    .get("bob@example.com") as { id: number };
  const carol = sqlite
    .query("SELECT id FROM users WHERE email = ?")
    .get("carol@example.com") as { id: number };

  const now = Date.now();

  // Tickets created by Alice (agent)
  sqlite.run(
    `INSERT INTO tickets (title, description, priority, status, assigned_to, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      "Login page flashes on refresh",
      "Users report a brief white flash when reloading the login screen in Safari.",
      "high",
      "open",
      bob.id,
      alice.id,
      now,
      now,
    ]
  );

  // Ticket created by Bob (agent)
  sqlite.run(
    `INSERT INTO tickets (title, description, priority, status, assigned_to, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      "Question about API rate limits",
      "Need clarification on burst limits for the public API.",
      "low",
      "in_progress",
      alice.id,
      bob.id,
      now - 3_600_000,
      now - 1_800_000,
    ]
  );

  // Ticket created by Carol (customer) - customer can only see their own tickets
  sqlite.run(
    `INSERT INTO tickets (title, description, priority, status, assigned_to, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      "Cannot reset my password",
      "The password reset link in the email is giving a 404 error.",
      "high",
      "open",
      alice.id,
      carol.id,
      now - 5_600_000,
      now - 2_800_000,
    ]
  );

  const t1 = sqlite.query("SELECT id FROM tickets ORDER BY id LIMIT 1").get() as {
    id: number;
  };

  sqlite.run(
    `INSERT INTO comments (ticket_id, message, created_by, created_at) VALUES (?, ?, ?, ?);`,
    [t1.id, "Reproduced on Safari 17.", alice.id, now - 3_500_000]
  );

  sqlite.close();
  console.log(`Seed complete. Database: ${path}`);
  console.log("\nDemo users:");
  console.log("  admin@example.com / password123 (admin)");
  console.log("  mike@example.com / password123 (manager)");
  console.log("  alice@example.com / password123 (agent)");
  console.log("  bob@example.com / password123 (agent)");
  console.log("  carol@example.com / password123 (customer)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
