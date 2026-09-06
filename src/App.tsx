import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useTheme } from "next-themes";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { SafetyTimerProvider } from "@/contexts/SafetyTimerContext";
import { useProfile } from "@/hooks/useProfile";
import { env } from "@/lib/env";

import AuthPage from "@/pages/AuthPage";
import ConsumerPage from "@/pages/ConsumerPage";
import MemberPage from "@/pages/MemberPage";
import AdminPage from "@/pages/AdminPage";
import WalkSharePage from "@/pages/WalkSharePage";
import PropertyShowingRecordPage from "@/pages/PropertyShowingRecordPage";
import CreateOrganizationPage from "@/pages/CreateOrganizationPage";
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
 * DISABLED BY DEFAULT while the product is being demoed — see
 * env.enforceWorkspaceRoles. Set VITE_ENFORCE_WORKSPACE_ROLES=true to turn it
 * back on for production. The logic below is kept intact rather than deleted
 * so that switch is a one-line change, not a rebuild.
 *
 * When enforced: the fallback is tiered rather than a single destination.
 * Someone with no organization goes to /business/new, which is the thing that
 * would fix their problem; someone who has an org but not the role goes to the
 * field view they can actually use.
 */
function RequireWorkspace({ need, children }: { need: "member" | "admin"; children: ReactNode }) {
  const { hasOrganization, isManager, loading } = useProfile();

  // Demo mode (the default): both business workspaces are reachable by anyone
  // signed in. Safe because RLS, not this guard, is what protects the data —
  // an org-less visitor gets an empty console, not someone else's brokerage.
  if (!env.enforceWorkspaceRoles) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Send org-less users to the page that fixes their problem, not to the
  // consumer home with no explanation of why they were moved.
  if (!hasOrganization) return <Navigate to="/business/new" replace />;
  if (need === "admin" && !isManager) return <Navigate to="/business/member" replace />;
  return <>{children}</>;
}

/**
 * Feeds the signed-in user's real org/role into WorkspaceProvider.
 *
 * `loading` is not optional here. Without it the provider saw the pre-fetch
 * `false` values as a decision, demoted a restored `admin` workspace to
 * `consumer`, and wrote that to localStorage — so a genuine manager was
 * knocked back to the consumer app on every refresh. Deliberately does not
 * block rendering on `loading`: that would put a spinner in front of
 * /consumer and both public share routes, which render instantly today.
 */
function WorkspaceGate({ children }: { children: ReactNode }) {
  const { hasOrganization, isManager, loading } = useProfile();
  return (
    <WorkspaceProvider hasOrganization={hasOrganization} isManager={isManager} loading={loading}>
      {children}
    </WorkspaceProvider>
  );
}

/** Toasts followed the theme nowhere — they were pinned dark on a light app. */
function AppToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster theme={resolvedTheme === "light" ? "light" : "dark"} position="top-center" richColors />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppToaster />
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
                {/* Outside RequireWorkspace on purpose: that guard redirects
                    org-less users away from /business/*, and they are exactly
                    who needs this page. */}
                <Route
                  path="/business/new"
                  element={
                    <ProtectedRoute>
                      <CreateOrganizationPage />
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
                {/* Public, no auth: the seller opens this from a text message.
                    Access control lives entirely in the RPC it calls. */}
                <Route path="/property/share/:token" element={<PropertyShowingRecordPage />} />
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
