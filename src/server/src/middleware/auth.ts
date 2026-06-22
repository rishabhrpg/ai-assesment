import type { MiddlewareHandler } from "hono";
import type { Db } from "../db/client";
import { getSession, hasRole, hasPermission, type Role, type AuthContext } from "../lib/auth";
import { jsonError } from "../lib/http-error";

// Extend Hono context type
declare module "hono" {
  interface ContextVariableMap {
    auth: AuthContext;
    db: Db;
  }
}

// Session cookie name
const SESSION_COOKIE_NAME = "session_id";

// Extract session ID from cookie header
function extractSessionId(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      return cookie.substring(SESSION_COOKIE_NAME.length + 1);
    }
  }
  return null;
}

// Authentication middleware - validates session and sets auth context
export function createAuthMiddleware(db: Db): MiddlewareHandler {
  return async (c, next) => {
    const cookieHeader = c.req.header("cookie");
    const sessionId = extractSessionId(cookieHeader);

    if (!sessionId) {
      return c.json(jsonError("UNAUTHORIZED", "Authentication required"), 401);
    }

    const auth = await getSession(db, sessionId);

    if (!auth) {
      // Clear invalid session cookie
      c.header(
        "set-cookie",
        `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
      );
      return c.json(jsonError("UNAUTHORIZED", "Invalid or expired session"), 401);
    }

    // Set auth context for downstream handlers
    c.set("auth", auth);
    c.set("db", db);

    await next();
  };
}

// Optional auth middleware - sets auth if available but doesn't require it
export function createOptionalAuthMiddleware(db: Db): MiddlewareHandler {
  return async (c, next) => {
    const cookieHeader = c.req.header("cookie");
    const sessionId = extractSessionId(cookieHeader);

    if (sessionId) {
      const auth = await getSession(db, sessionId);
      if (auth) {
        c.set("auth", auth);
      }
    }

    c.set("db", db);
    await next();
  };
}

// Role-based access control middleware
export function requireRoles(...roles: Role[]): MiddlewareHandler {
  return async (c, next) => {
    const auth = c.get("auth");

    if (!auth) {
      return c.json(jsonError("UNAUTHORIZED", "Authentication required"), 401);
    }

    if (!hasRole(auth.user, roles)) {
      return c.json(
        jsonError("FORBIDDEN", `Access denied. Required roles: ${roles.join(", ")}`),
        403
      );
    }

    await next();
  };
}

// Permission-based access control middleware
export function requirePermission(permission: string): MiddlewareHandler {
  return async (c, next) => {
    const auth = c.get("auth");

    if (!auth) {
      return c.json(jsonError("UNAUTHORIZED", "Authentication required"), 401);
    }

    if (!hasPermission(auth.user, permission)) {
      return c.json(
        jsonError("FORBIDDEN", `Access denied. Missing permission: ${permission}`),
        403
      );
    }

    await next();
  };
}

// Helper to set session cookie
export function setSessionCookie(c: import("hono").Context, sessionId: string, expiresAt: number): void {
  const maxAge = Math.floor((expiresAt - Date.now()) / 1000);
  c.header(
    "set-cookie",
    `${SESSION_COOKIE_NAME}=${sessionId}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`
  );
}

// Helper to clear session cookie
export function clearSessionCookie(c: import("hono").Context): void {
  c.header(
    "set-cookie",
    `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  );
}

// Get current auth context (throws if not authenticated)
export function getAuth(c: import("hono").Context): AuthContext {
  const auth = c.get("auth");
  if (!auth) {
    throw new Error("Not authenticated");
  }
  return auth;
}

// Get optional auth context (returns null if not authenticated)
export function getOptionalAuth(c: import("hono").Context): AuthContext | null {
  return c.get("auth") || null;
}
