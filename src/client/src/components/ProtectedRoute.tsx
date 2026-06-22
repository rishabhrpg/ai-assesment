import { Navigate, useLocation, Outlet } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/api";

type ProtectedRouteProps = {
  children?: React.ReactNode;
  requiredRoles?: Role[];
  requiredPermission?: string;
  fallback?: React.ReactNode;
};

export function ProtectedRoute({
  children,
  requiredRoles,
  requiredPermission,
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = hasRole(...requiredRoles);
    if (!hasRequiredRole) {
      if (fallback) {
        return <>{fallback}</>;
      }
      return (
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="max-w-md text-center">
            <h1 className="mb-4 text-2xl font-bold text-slate-800">Access Denied</h1>
            <p className="mb-6 text-slate-600">
              You don't have permission to access this page. Required roles:{" "}
              {requiredRoles.join(", ")}
            </p>
            <a
              href="/"
              className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Go back home
            </a>
          </div>
        </div>
      );
    }
  }

  // Check permission requirements
  if (requiredPermission) {
    const hasRequiredPermission = hasPermission(requiredPermission);
    if (!hasRequiredPermission) {
      if (fallback) {
        return <>{fallback}</>;
      }
      return (
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="max-w-md text-center">
            <h1 className="mb-4 text-2xl font-bold text-slate-800">Access Denied</h1>
            <p className="mb-6 text-slate-600">
              You don't have the required permission: {requiredPermission}
            </p>
            <a
              href="/"
              className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Go back home
            </a>
          </div>
        </div>
      );
    }
  }

  // All checks passed - render children or outlet
  return <>{children || <Outlet />}</>;
}

// Convenience components for common role restrictions
export function AdminRoute({ children }: { children?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      {children || <Outlet />}
    </ProtectedRoute>
  );
}

export function ManagerRoute({ children }: { children?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={["admin", "manager"]}>
      {children || <Outlet />}
    </ProtectedRoute>
  );
}

export function AgentRoute({ children }: { children?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={["admin", "manager", "agent"]}>
      {children || <Outlet />}
    </ProtectedRoute>
  );
}
