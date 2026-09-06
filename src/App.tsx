import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { SafetyTimerProvider } from "@/contexts/SafetyTimerContext";
import { useProfile } from "@/hooks/useProfile";

import AuthPage from "@/pages/AuthPage";
import ConsumerPage from "@/pages/ConsumerPage";
import MemberPage from "@/pages/MemberPage";
import AdminPage from "@/pages/AdminPage";
import WalkSharePage from "@/pages/WalkSharePage";
import InviteAcceptPage from "@/pages/InviteAcceptPage";
import NotFound from "@/pages/NotFound";

// Route map is a direct port of OLD/src/App.tsx (see CLAUDE.md > Ground
// truth / Architecture) — auth-gated, three real workspaces, plus two
// public no-auth share links. Replaces this rebuild's earlier flat,
// no-auth route list (one route per old-demo screen, all directly under
// App.tsx) built before OLD was discovered.
const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/consumer" replace />;
  return <>{children}</>;
}

/**
 * Gates the two business workspaces on the signed-in user's real org/role.
 *
 * RLS already blocks the data, but without this an ordinary member reaching
 * /business/admin got the whole console rendering empty — confusing, and more
 * so now that managers can mint public seller links from it.
 *
 * The fallback is deliberately tiered rather than always sending people to
 * /business/member: a user with no organization has no more business on the
 * field view than on the console, so they go to /consumer.
 */
function RequireWorkspace({ need, children }: { need: "member" | "admin"; children: ReactNode }) {
  const { hasOrganization, isManager, loading } = useProfile();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!hasOrganization) return <Navigate to="/consumer" replace />;
  if (need === "admin" && !isManager) return <Navigate to="/business/member" replace />;
  return <>{children}</>;
}

/** Feeds the signed-in user's real org/role into WorkspaceProvider. */
function WorkspaceGate({ children }: { children: ReactNode }) {
  const { hasOrganization, isManager } = useProfile();
  return (
    <WorkspaceProvider hasOrganization={hasOrganization} isManager={isManager}>
      {children}
    </WorkspaceProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster theme="dark" position="top-center" richColors />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <WorkspaceGate>
            <SafetyTimerProvider>
              <Routes>
                <Route
                  path="/auth"
                  element={
                    <AuthRoute>
                      <AuthPage />
                    </AuthRoute>
                  }
                />
                <Route
                  path="/consumer/*"
                  element={
                    <ProtectedRoute>
                      <ConsumerPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/business/member/*"
                  element={
                    <ProtectedRoute>
                      <RequireWorkspace need="member">
                        <MemberPage />
                      </RequireWorkspace>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/business/admin"
                  element={
                    <ProtectedRoute>
                      <RequireWorkspace need="admin">
                        <AdminPage />
                      </RequireWorkspace>
                    </ProtectedRoute>
                  }
                />
                <Route path="/walk/share/:token" element={<WalkSharePage />} />
                <Route path="/invite/:token" element={<InviteAcceptPage />} />
                <Route path="/" element={<Navigate to="/consumer" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SafetyTimerProvider>
          </WorkspaceGate>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
