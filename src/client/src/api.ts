export type TicketStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed"
  | "cancelled";

export type Priority = "low" | "medium" | "high";

export type Role = "admin" | "manager" | "agent" | "customer";

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

export type AuthResponse = {
  user: User;
};

export type MeResponse = {
  user: User | null;
};

export type Ticket = {
  id: number;
  title: string;
  description: string;
  priority: Priority;
  status: TicketStatus;
  assignedTo: number | null;
  createdBy: number;
  createdAt: number;
  updatedAt: number;
};

export type Comment = {
  id: number;
  ticketId: number;
  message: string;
  createdBy: number;
  createdAt: number;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

const apiBase = "";

// Auth state
type AuthState = {
  user: User | null;
  isLoading: boolean;
};

let authState: AuthState = {
  user: null,
  isLoading: true,
};

const authListeners: Set<(state: AuthState) => void> = new Set();

function notifyListeners() {
  authListeners.forEach((listener) => listener({ ...authState }));
}

export function subscribeToAuth(callback: (state: AuthState) => void) {
  authListeners.add(callback);
  callback({ ...authState });
  return () => authListeners.delete(callback);
}

export function getAuthState() {
  return { ...authState };
}

function setAuthState(updates: Partial<AuthState>) {
  authState = { ...authState, ...updates };
  notifyListeners();
}

// Initialize auth state from server
export async function initAuth(): Promise<void> {
  try {
    const res = await fetch(`${apiBase}/api/auth/me`, {
      credentials: "include",
    });
    const data = await parseJson<MeResponse>(res);
    setAuthState({ user: data.user, isLoading: false });
  } catch {
    setAuthState({ user: null, isLoading: false });
  }
}

// Login
export async function login(email: string, password: string): Promise<User> {
  const res = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson<AuthResponse | ApiError>(res);
  if (!res.ok) throw data;
  const user = (data as AuthResponse).user;
  setAuthState({ user });
  return user;
}

// Logout
export async function logout(): Promise<void> {
  const res = await fetch(`${apiBase}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (res.ok) {
    setAuthState({ user: null });
  }
}

// Check if user has required role
export function hasRole(user: User, roles: Role[]): boolean {
  return roles.includes(user.role);
}

// Check permissions based on role
export function hasPermission(user: User, permission: string): boolean {
  const permissions: Record<Role, string[]> = {
    admin: ["*"],
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

  const userPerms = permissions[user.role] || [];
  if (userPerms.includes("*")) return true;
  if (userPerms.includes(permission)) return true;

  // Check wildcard permissions
  const parts = permission.split(":");
  for (let i = parts.length - 1; i > 0; i--) {
    const wildcardPerm = parts.slice(0, i).join(":") + ":*";
    if (userPerms.includes(wildcardPerm)) return true;
  }

  return false;
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${apiBase}/api/users`, {
    credentials: "include",
  });
  const data = await parseJson<{ users: User[] }>(res);
  if (!res.ok) throw data;
  return data.users;
}

export async function fetchTickets(params: {
  query?: string;
  status?: string;
}): Promise<Ticket[]> {
  const sp = new URLSearchParams();
  if (params.query) sp.set("query", params.query);
  if (params.status) sp.set("status", params.status);
  const q = sp.toString();
  const res = await fetch(`${apiBase}/api/tickets${q ? `?${q}` : ""}`, {
    credentials: "include",
  });
  const data = await parseJson<{ tickets: Ticket[] } | ApiError>(res);
  if (!res.ok) throw data;
  return (data as { tickets: Ticket[] }).tickets;
}

export async function fetchTicket(
  id: number
): Promise<{ ticket: Ticket; comments: Comment[] }> {
  const res = await fetch(`${apiBase}/api/tickets/${id}`, {
    credentials: "include",
  });
  const data = await parseJson<
    { ticket: Ticket; comments: Comment[] } | ApiError
  >(res);
  if (!res.ok) throw data;
  return data as { ticket: Ticket; comments: Comment[] };
}

export async function createTicket(body: {
  title: string;
  description: string;
  priority: Priority;
  assignedTo?: number | null;
}): Promise<Ticket> {
  const res = await fetch(`${apiBase}/api/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await parseJson<{ ticket: Ticket } | ApiError>(res);
  if (!res.ok) throw data;
  return (data as { ticket: Ticket }).ticket;
}

export async function patchTicket(
  id: number,
  body: Partial<{
    title: string;
    description: string;
    priority: Priority;
    assignedTo: number | null;
    status: TicketStatus;
  }>
): Promise<Ticket> {
  const res = await fetch(`${apiBase}/api/tickets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await parseJson<{ ticket: Ticket } | ApiError>(res);
  if (!res.ok) throw data;
  return (data as { ticket: Ticket }).ticket;
}

export async function addComment(
  ticketId: number,
  body: { message: string }
): Promise<Comment> {
  const res = await fetch(`${apiBase}/api/tickets/${ticketId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await parseJson<{ comment: Comment } | ApiError>(res);
  if (!res.ok) throw data;
  return (data as { comment: Comment }).comment;
}

export function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "error" in err) {
    const e = err as ApiError;
    return e.error?.message ?? "Request failed";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}
