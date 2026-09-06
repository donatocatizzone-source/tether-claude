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
  // TODO: derive from the signed-in user's profile (organization_id / role
  // via has_role()) once auth + profile queries are wired up end-to-end —
  // hardcoded true/true here matches OLD's own current state, not a
  // deliberate permissiveness decision made in this rebuild.
  hasOrganization = true,
  isManager = true,
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
