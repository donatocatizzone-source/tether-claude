import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

// Port of OLD/src/contexts/WorkspaceContext.tsx (see CLAUDE.md > Ground
// truth). Replaces this rebuild's earlier two-mode (consumer/professional)
// version, built before OLD was discovered — see git history for that one.
//
// Three real workspaces now, matching OLD's route split:
//   consumer -> /consumer      (personal safety)
//   member   -> /business/member (Pro Guard, field employees)
//   admin    -> /business/admin  (Overwatch manager console)
export type WorkspaceMode = "consumer" | "member" | "admin";

interface WorkspaceContextType {
  currentMode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;
  hasOrganization: boolean;
  isManager: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

const STORAGE_KEY = "tether-workspace-mode";

export function WorkspaceProvider({
  children,
  // These now come from the signed-in user's real profile + user_roles (see
  // App.tsx, which passes useProfile()'s values). They previously defaulted
  // to true/true with nothing passing them, so every workspace was offered to
  // everyone. Defaults are false now: an unknown user gets the least access,
  // not the most.
  //
  // These gate the UI only. RLS is what actually enforces access — see the
  // org-scoped policies in supabase/schema.sql.
  hasOrganization = false,
  isManager = false,
}: {
  children: ReactNode;
  hasOrganization?: boolean;
  isManager?: boolean;
}) {
  const [currentMode, setCurrentMode] = useState<WorkspaceMode>(() => {
    if (typeof window === "undefined") return "consumer";
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "consumer" || stored === "member" || stored === "admin") return stored;
    return "consumer";
  });

  // The mode is restored from localStorage before the profile has loaded, so
  // a user who no longer has the role (or never did, on a shared machine)
  // would otherwise stay parked in a workspace they can't use. Falling back
  // here means the switcher and the route guard can't disagree.
  useEffect(() => {
    if (currentMode === "admin" && !isManager) setCurrentMode("consumer");
    else if (currentMode === "member" && !hasOrganization) setCurrentMode("consumer");
  }, [currentMode, hasOrganization, isManager]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currentMode);

    const root = document.documentElement;
    root.classList.remove("workspace-consumer", "workspace-member", "workspace-admin");
    root.classList.add(`workspace-${currentMode}`);
  }, [currentMode]);

  function setMode(mode: WorkspaceMode) {
    if (mode === "member" && !hasOrganization) return;
    if (mode === "admin" && !isManager) return;
    setCurrentMode(mode);
  }

  return (
    <WorkspaceContext.Provider value={{ currentMode, setMode, hasOrganization, isManager }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
