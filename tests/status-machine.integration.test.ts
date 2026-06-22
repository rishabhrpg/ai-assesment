import { describe, expect, it, beforeAll, afterAll, beforeEach } from "bun:test";
import { readFileSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { eq } from "drizzle-orm";
import { createDb } from "../src/server/src/db/client";
import { createApp } from "../src/server/src/app";
import { comments, tickets, users } from "../src/server/src/db/schema";

const migrationSql = readFileSync(
  join(import.meta.dir, "../database/schema-or-migrations/0001_init.sql"),
  "utf-8"
);

describe("ticket status transitions (API integration)", () => {
  const dbPath = join(import.meta.dir, `ticket-sm-${crypto.randomUUID()}.db`);
  let db: ReturnType<typeof createDb>;
  let app: ReturnType<typeof createApp>;
  let ticketId: number;

  beforeAll(() => {
    try {
      unlinkSync(dbPath);
    } catch {
      /* ignore */
    }
    mkdirSync(join(dbPath, ".."), { recursive: true });
    const sqlite = new Database(dbPath);
    sqlite.run("PRAGMA foreign_keys = ON;");
    sqlite.exec(migrationSql);
    sqlite.close();
    db = createDb(dbPath);
    app = createApp(db);
  });

  beforeEach(async () => {
    await db.delete(comments);
    await db.delete(tickets);
    await db.delete(users);
    const now = Date.now();
    await db.insert(users).values({
      name: "Test Agent",
      email: "agent@test.local",
      role: "agent",
    });
    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.email, "agent@test.local"));
    const [t] = await db
      .insert(tickets)
      .values({
        title: "SM test",
        description: "d",
        priority: "low",
        status: "open",
        assignedTo: null,
        createdBy: u.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    ticketId = t.id;
  });

  afterAll(() => {
    try {
      unlinkSync(dbPath);
    } catch {
      /* ignore */
    }
  });

  it("accepts open → in_progress", async () => {
    const res = await app.request(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ticket: { status: string } };
    expect(body.ticket.status).toBe("in_progress");
  });

  it("rejects open → closed", async () => {
    const res = await app.request(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("accepts full valid chain open → in_progress → resolved → closed", async () => {
    for (const next of ["in_progress", "resolved", "closed"] as const) {
      const res = await app.request(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      expect(res.status).toBe(200);
    }
    const res = await app.request(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "open" }),
    });
    expect(res.status).toBe(409);
  });

  it("accepts open → cancelled", async () => {
    const res = await app.request(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    expect(res.status).toBe(200);
  });

  it("rejects resolved → cancelled", async () => {
    for (const next of ["in_progress", "resolved"] as const) {
      await app.request(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
    }
    const res = await app.request(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    expect(res.status).toBe(409);
  });
});
