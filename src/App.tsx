import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { SafetyTimerProvider } from "@/contexts/SafetyTimerContext";

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster theme="dark" position="top-center" richColors />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <WorkspaceProvider>
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
                      <MemberPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/business/admin"
                  element={
                    <ProtectedRoute>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/walk/share/:token" element={<WalkSharePage />} />
                <Route path="/invite/:token" element={<InviteAcceptPage />} />
                <Route path="/" element={<Navigate to="/consumer" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SafetyTimerProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
