import { join } from "node:path";
import { existsSync } from "node:fs";
import { eq, sql, desc, and } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { z } from "zod";
import type { Db } from "./db/client";
import { comments, tickets, users } from "./db/schema";
import { jsonError } from "./lib/http-error";
import {
  assertValidTransition,
  isTicketStatus,
  type TicketStatus,
} from "./lib/status-machine";
import {
  authenticateUser,
  createSession,
  deleteSession,
  canAccessTicket,
  hasPermission,
  type AuthContext,
} from "./lib/auth";
import {
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  requireRoles,
  requirePermission,
  setSessionCookie,
  clearSessionCookie,
} from "./middleware/auth";

const prioritySchema = z.enum(["low", "medium", "high"]);

const loginSchema = z.object({
  email: z.string().email("valid email is required"),
  password: z.string().min(1, "password is required"),
});

const createTicketSchema = z.object({
  title: z.string().min(1, "title is required"),
  description: z.string().min(1, "description is required"),
  priority: prioritySchema,
  assignedTo: z.number().int().positive().nullable().optional(),
});

const patchTicketSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    priority: prioritySchema.optional(),
    assignedTo: z.number().int().positive().nullable().optional(),
    status: z.string().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, {
    message: "At least one field must be provided",
  });

const commentSchema = z.object({
  message: z.string().min(1, "message is required"),
});

function safeLikePattern(raw: string): string {
  const cleaned = raw.replace(/[%_]/g, "").trim();
  if (!cleaned) return "%";
  return `%${cleaned}%`;
}

// Filter tickets based on user permissions
async function filterTicketsByPermission(
  db: Db,
  auth: AuthContext | null,
  baseTickets: Array<typeof tickets.$inferSelect>
): Promise<Array<typeof tickets.$inferSelect>> {
  if (!auth) return [];
  const user = auth.user;

  // Admin and manager can see all tickets
  if (
    user.role === "admin" ||
    user.role === "manager" ||
    hasPermission(user, "tickets:read")
  ) {
    return baseTickets;
  }

  // Agent can see all but customers can only see their own
  if (user.role === "agent") {
    return baseTickets;
  }

  // Customer - only own tickets
  return baseTickets.filter((t) => t.createdBy === user.id);
}

// Check if user can modify ticket
function canModifyTicket(
  auth: AuthContext,
  ticket: { createdBy: number; assignedTo: number | null }
): boolean {
  const user = auth.user;

  // Admin and manager can modify any ticket
  if (user.role === "admin" || user.role === "manager") return true;

  // Can modify if assigned
  if (ticket.assignedTo === user.id && hasPermission(user, "tickets:update:assigned")) {
    return true;
  }

  // Can modify own
  if (ticket.createdBy === user.id && hasPermission(user, "tickets:update:own")) {
    return true;
  }

  return false;
}

export function createApiRouter(db: Db) {
  const app = new Hono();

  // Auth routes (public)
  app.post("/auth/login", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(jsonError("VALIDATION_ERROR", "Invalid JSON body"), 400);
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        jsonError("VALIDATION_ERROR", "Invalid request", parsed.error.flatten()),
        400
      );
    }

    const { email, password } = parsed.data;
    const user = await authenticateUser(db, email, password);

    if (!user) {
      return c.json(jsonError("UNAUTHORIZED", "Invalid email or password"), 401);
    }

    const { sessionId, expiresAt } = await createSession(db, user.id);
    setSessionCookie(c, sessionId, expiresAt);

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return c.json({ user: userWithoutPassword });
  });

  app.post("/auth/logout", async (c) => {
    const cookieHeader = c.req.header("cookie");
    if (cookieHeader) {
      const cookies = cookieHeader.split(";").map((c) => c.trim());
      for (const cookie of cookies) {
        if (cookie.startsWith("session_id=")) {
          const sessionId = cookie.substring("session_id=".length);
          await deleteSession(db, sessionId);
          break;
        }
      }
    }
    clearSessionCookie(c);
    return c.json({ ok: true });
  });

  // Protected routes - require authentication
  const authMiddleware = createAuthMiddleware(db);
  const optionalAuthMiddleware = createOptionalAuthMiddleware(db);

  app.get("/auth/me", optionalAuthMiddleware, async (c) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ user: null });
    }
    const { passwordHash: _, ...userWithoutPassword } = auth.user;
    return c.json({ user: userWithoutPassword });
  });

  // Users - admin/manager only for full list
  app.get("/users", authMiddleware, requireRoles("admin", "manager", "agent"), async (c) => {
    const rows = await db.select().from(users).orderBy(users.name);
    // Don't expose password hashes
    const usersWithoutPasswords = rows.map(({ passwordHash: _, ...u }) => u);
    return c.json({ users: usersWithoutPasswords });
  });

  // Tickets list - requires authentication, filtered by permissions
  app.get("/tickets", authMiddleware, async (c) => {
    const auth = c.get("auth");
    const query = c.req.query("query")?.trim() ?? "";
    const statusFilter = c.req.query("status")?.trim();

    const conditions = [];
    if (statusFilter) {
      if (!isTicketStatus(statusFilter)) {
        return c.json(
          jsonError(
            "VALIDATION_ERROR",
            `Invalid status filter. Must be one of: open, in_progress, resolved, closed, cancelled`
          ),
          400
        );
      }
      conditions.push(eq(tickets.status, statusFilter));
    }
    if (query.length > 0) {
      const term = safeLikePattern(query).toLowerCase();
      conditions.push(
        sql`(lower(${tickets.title}) LIKE ${term} OR lower(${tickets.description}) LIKE ${term})`
      );
    }

    // Apply user-based filtering for customers
    if (auth!.user.role === "customer") {
      conditions.push(eq(tickets.createdBy, auth!.user.id));
    }

    const whereClause =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    const rows = await db
      .select()
      .from(tickets)
      .where(whereClause)
      .orderBy(desc(tickets.updatedAt));

    return c.json({ tickets: rows });
  });

  // Ticket detail - requires access permission
  app.get("/tickets/:id", authMiddleware, async (c) => {
    const auth = c.get("auth");
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id < 1) {
      return c.json(jsonError("NOT_FOUND", "Ticket not found"), 404);
    }

    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    if (!ticket) {
      return c.json(jsonError("NOT_FOUND", "Ticket not found"), 404);
    }

    // Check access permission
    if (!canAccessTicket(auth!.user, ticket)) {
      return c.json(
        jsonError("FORBIDDEN", "You don't have permission to view this ticket"),
        403
      );
    }

    const commentRows = await db
      .select()
      .from(comments)
      .where(eq(comments.ticketId, id))
      .orderBy(comments.createdAt);

    return c.json({ ticket, comments: commentRows });
  });

  // Create ticket - authenticated users can create
  app.post("/tickets", authMiddleware, async (c) => {
    const auth = c.get("auth");

    // Check permission
    if (!hasPermission(auth!.user, "tickets:create")) {
      return c.json(
        jsonError("FORBIDDEN", "You don't have permission to create tickets"),
        403
      );
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(jsonError("VALIDATION_ERROR", "Invalid JSON body"), 400);
    }

    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        jsonError("VALIDATION_ERROR", "Invalid request", parsed.error.flatten()),
        400
      );
    }

    const data = parsed.data;

    // Validate assignee if provided
    if (data.assignedTo != null) {
      const [assignee] = await db
        .select()
        .from(users)
        .where(eq(users.id, data.assignedTo));
      if (!assignee) {
        return c.json(
          jsonError("VALIDATION_ERROR", "assignedTo user does not exist"),
          400
        );
      }
    }

    const now = Date.now();
    const [inserted] = await db
      .insert(tickets)
      .values({
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: "open",
        assignedTo: data.assignedTo ?? null,
        createdBy: auth!.user.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return c.json({ ticket: inserted }, 201);
  });

  // Update ticket - requires modify permission
  app.patch("/tickets/:id", authMiddleware, async (c) => {
    const auth = c.get("auth");
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id < 1) {
      return c.json(jsonError("NOT_FOUND", "Ticket not found"), 404);
    }

    const [existing] = await db.select().from(tickets).where(eq(tickets.id, id));
    if (!existing) {
      return c.json(jsonError("NOT_FOUND", "Ticket not found"), 404);
    }

    // Check modify permission
    if (!canModifyTicket(auth!, existing)) {
      return c.json(
        jsonError("FORBIDDEN", "You don't have permission to update this ticket"),
        403
      );
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(jsonError("VALIDATION_ERROR", "Invalid JSON body"), 400);
    }

    const parsed = patchTicketSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        jsonError("VALIDATION_ERROR", "Invalid request", parsed.error.flatten()),
        400
      );
    }

    const updates = parsed.data;

    // Only admin/manager can assign tickets
    if (
      updates.assignedTo !== undefined &&
      auth!.user.role !== "admin" &&
      auth!.user.role !== "manager"
    ) {
      return c.json(
        jsonError("FORBIDDEN", "Only admin or manager can assign tickets"),
        403
      );
    }

    if (updates.assignedTo !== undefined && updates.assignedTo !== null) {
      const [assignee] = await db
        .select()
        .from(users)
        .where(eq(users.id, updates.assignedTo));
      if (!assignee) {
        return c.json(
          jsonError("VALIDATION_ERROR", "assignedTo user does not exist"),
          400
        );
      }
    }

    let nextStatus: TicketStatus | undefined;
    if (updates.status !== undefined) {
      if (!isTicketStatus(updates.status)) {
        return c.json(
          jsonError("VALIDATION_ERROR", "Invalid status value"),
          400
        );
      }
      const current = existing.status as TicketStatus;
      nextStatus = updates.status;
      try {
        assertValidTransition(current, nextStatus);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid transition";
        return c.json(jsonError("INVALID_STATUS_TRANSITION", msg), 409);
      }
    }

    const now = Date.now();
    const patch: Partial<typeof tickets.$inferInsert> = { updatedAt: now };
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.priority !== undefined) patch.priority = updates.priority;
    if (updates.assignedTo !== undefined) patch.assignedTo = updates.assignedTo;
    if (nextStatus !== undefined) patch.status = nextStatus;

    const [updated] = await db
      .update(tickets)
      .set(patch)
      .where(eq(tickets.id, id))
      .returning();

    return c.json({ ticket: updated });
  });

  // Add comment - requires read access to ticket
  app.post("/tickets/:id/comments", authMiddleware, async (c) => {
    const auth = c.get("auth");
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id) || id < 1) {
      return c.json(jsonError("NOT_FOUND", "Ticket not found"), 404);
    }

    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    if (!ticket) {
      return c.json(jsonError("NOT_FOUND", "Ticket not found"), 404);
    }

    // Check read access to add comment
    if (!canAccessTicket(auth!.user, ticket)) {
      return c.json(
        jsonError("FORBIDDEN", "You don't have permission to comment on this ticket"),
        403
      );
    }

    // Check create comment permission
    const permissionKey = ticket.createdBy === auth!.user.id ? "comments:create:own" : "comments:create";
    if (!hasPermission(auth!.user, permissionKey) && !hasPermission(auth!.user, "comments:create")) {
      return c.json(
        jsonError("FORBIDDEN", "You don't have permission to add comments"),
        403
      );
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(jsonError("VALIDATION_ERROR", "Invalid JSON body"), 400);
    }

    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        jsonError("VALIDATION_ERROR", "Invalid request", parsed.error.flatten()),
        400
      );
    }

    const now = Date.now();
    const [inserted] = await db
      .insert(comments)
      .values({
        ticketId: id,
        message: parsed.data.message,
        createdBy: auth!.user.id,
        createdAt: now,
      })
      .returning();

    return c.json({ comment: inserted }, 201);
  });

  return app;
}

export function createApp(db: Db) {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      allowMethods: ["GET", "POST", "PATCH", "OPTIONS", "DELETE"],
      allowHeaders: ["Content-Type"],
      credentials: true,
    })
  );

  app.get("/health", (c) => c.json({ ok: true }));

  const api = createApiRouter(db);
  app.route("/api", api);

  const distPath = resolveDistPath();
  if (existsSync(distPath)) {
    app.use("/*", serveStatic({ root: distPath }));
    app.get("*", (c) => new Response(Bun.file(join(distPath, "index.html"))));
  }

  return app;
}

export function resolveDistPath(): string {
  const cwd = process.cwd();
  const root = cwd.endsWith("src/server") ? join(cwd, "../..") : cwd;
  const fromEnv = process.env.DIST_PATH;
  if (fromEnv) {
    return fromEnv.startsWith("/") ? fromEnv : join(root, fromEnv);
  }
  return join(root, "src/client/dist");
}

export function resolveDatabasePath(): string {
  const cwd = process.cwd();
  const root = cwd.endsWith("src/server") ? join(cwd, "../..") : cwd;
  const fromEnv = process.env.DATABASE_PATH;
  if (fromEnv) {
    return fromEnv.startsWith("/") ? fromEnv : join(root, fromEnv);
  }
  return join(root, "database", "data.db");
}
