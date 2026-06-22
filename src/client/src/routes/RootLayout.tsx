import { Outlet, NavLink, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUsers, type User } from "@/api";

export function RootLayout() {
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch users for reference (only admin/manager/agent can see all users)
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    (async () => {
      try {
        const u = await fetchUsers();
        if (cancelled) return;
        setUsers(u);
      } catch (e) {
        if (!cancelled) {
          // Non-fatal error - users list is for reference
          console.error("Could not load users list:", e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return (): void => {
      cancelled = true;
    };
  }, [user]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Role badge color
  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "manager":
        return "bg-purple-100 text-purple-800";
      case "agent":
        return "bg-blue-100 text-blue-800";
      case "customer":
        return "bg-green-100 text-green-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-lg font-semibold tracking-tight text-slate-800">
              Support Tickets
            </span>
            <nav className="flex gap-3 text-sm font-medium">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  isActive
                    ? "text-indigo-600"
                    : "text-slate-600 hover:text-slate-900"
                }
              >
                All tickets
              </NavLink>
              <NavLink
                to="/tickets/new"
                className={({ isActive }) =>
                  isActive
                    ? "text-indigo-600"
                    : "text-slate-600 hover:text-slate-900"
                }
              >
                New ticket
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* User info */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">
                    {user.name}
                  </p>
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${getRoleColor(
                      user.role
                    )}`}
                  >
                    {user.role}
                  </span>
                </div>

                <div className="h-8 w-px bg-slate-200" />

                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoggingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Admin/Manager notice */}
        {user && hasRole("admin", "manager") && (
          <div className="border-t border-blue-100 bg-blue-50 px-4 py-1.5">
            <p className="text-xs text-blue-800">
              <strong>Admin mode:</strong> You can view and manage all tickets
              {hasRole("admin") && " and users"}
            </p>
          </div>
        )}


      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet
          context={{
            currentUserId: user?.id,
            currentUser: user,
            users,
            usersLoading: loading,
          }}
        />
      </main>
    </div>
  );
}

export type OutletContext = {
  currentUserId?: number;
  currentUser?: User;
  users: User[];
  usersLoading: boolean;
};
