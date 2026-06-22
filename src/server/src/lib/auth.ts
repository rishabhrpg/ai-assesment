import { eq, and, gt } from "drizzle-orm";
import type { Db } from "../db/client";
import { users, sessions, type Role, type User } from "../db/schema";
import { randomBytes, createHash, timingSafeEqual } from "crypto";

// Session expiration: 7 days
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export type AuthContext = {
  user: User;
  sessionId: string;
};

// Generate cryptographically secure session ID
export function generateSessionId(): string {
  return randomBytes(32).toString("hex");
}

// Hash password using SHA-256 with salt (Bun-compatible)
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const usedSalt = salt || randomBytes(16).toString("hex");
  const hash = createHash("sha256")
    .update(password + usedSalt)
    .digest("hex");
  return { hash: `${usedSalt}:${hash}`, salt: usedSalt };
}

// Verify password against stored hash
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt] = storedHash.split(":");
  const { hash } = hashPassword(password, salt);
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
  } catch {
    return false;
  }
}

// Create new session for user
export async function createSession(
  db: Db,
  userId: number
): Promise<{ sessionId: string; expiresAt: number }> {
  const sessionId = generateSessionId();
  const now = Date.now();
  const expiresAt = now + SESSION_EXPIRY_MS;

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
    createdAt: now,
  });

  return { sessionId, expiresAt };
}

// Get valid session with user
export async function getSession(
  db: Db,
  sessionId: string
): Promise<AuthContext | null> {
  const now = Date.now();

  const result = await db
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
    .limit(1);

  if (result.length === 0) return null;
  return { user: result[0].user, sessionId: result[0].session.id };
}

// Delete session (logout)
export async function deleteSession(db: Db, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

// Clean up expired sessions
export async function cleanupExpiredSessions(db: Db): Promise<void> {
  const now = Date.now();
  await db.delete(sessions).where(gt(now, sessions.expiresAt));
}

// Authenticate user with email and password
export async function authenticateUser(
  db: Db,
  email: string,
  password: string
): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user || !user.passwordHash) return null;

  if (verifyPassword(password, user.passwordHash)) {
    return user;
  }

  return null;
}

// Check if user has required role
export function hasRole(user: User, requiredRoles: Role[]): boolean {
  return requiredRoles.includes(user.role as Role);
}

// Get permissions based on role
export function getRolePermissions(role: Role): string[] {
  const permissions: Record<Role, string[]> = {
    admin: ["*"], // All permissions
    manager: [
      "tickets:read",
      "tickets:create",
      "tickets:update",
      "tickets:delete",
      "tickets:assign",
      "comments:create",
      "users:read",
    ],
    agent: [
      "tickets:read",
      "tickets:create",
      "tickets:update:own",
      "tickets:update:assigned",
      "comments:create",
      "users:read",
    ],
    customer: [
      "tickets:read:own",
      "tickets:create",
      "tickets:update:own",
      "comments:create:own",
    ],
  };

  return permissions[role] || [];
}

// Check if user has specific permission
export function hasPermission(user: User, permission: string): boolean {
  const permissions = getRolePermissions(user.role as Role);

  // Wildcard permission
  if (permissions.includes("*")) return true;

  // Direct permission match
  if (permissions.includes(permission)) return true;

  // Check wildcard sub-permissions (e.g., "tickets:read" allows "tickets:read:own")
  const parts = permission.split(":");
  for (let i = parts.length - 1; i > 0; i--) {
    const wildcardPerm = parts.slice(0, i).join(":") + ":*";
    if (permissions.includes(wildcardPerm)) return true;
  }

  return false;
}

// Check if user can access specific ticket
export function canAccessTicket(
  user: User,
  ticket: { createdBy: number; assignedTo: number | null }
): boolean {
  const permissions = getRolePermissions(user.role as Role);

  // Admin (and any role with wildcard) can read any ticket
  if (permissions.includes("*")) return true;

  // Full access
  if (permissions.includes("tickets:read")) return true;

  // Own tickets only
  if (
    permissions.includes("tickets:read:own") &&
    ticket.createdBy === user.id
  ) {
    return true;
  }

  // Assigned tickets
  if (
    permissions.includes("tickets:read:assigned") &&
    ticket.assignedTo === user.id
  ) {
    return true;
  }

  return false;
}
