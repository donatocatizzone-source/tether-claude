import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import {
  resolveWorkspaceMode,
  canAccessMode,
  WORKSPACE_STORAGE_KEY,
  type WorkspaceAccess,
  type WorkspaceMode,
} from "@/lib/workspace";
import { env } from "@/lib/env";

// Port of OLD/src/contexts/WorkspaceContext.tsx (see CLAUDE.md > Ground
// truth).
//
// Three real workspaces, matching OLD's route split:
//   consumer -> /consumer        (personal safety)
//   member   -> /business/member (Pro Guard, field employees)
//   admin    -> /business/admin  (Overwatch manager console)
//
// The access decision itself lives in src/lib/workspace.ts, pure and tested.
// It was inline here, and got it wrong: it read the pre-load `false` values as
// "not permitted", demoted a restored `admin` to `consumer`, and persisted
// that — so a real manager lost their workspace on every page refresh.
export type { WorkspaceMode };

interface WorkspaceContextType {
  currentMode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;
  hasOrganization: boolean;
  isManager: boolean;
  /** True while the profile/roles query is in flight — gated modes are unknown, not denied. */
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

export function WorkspaceProvider({
  children,
  // These come from the signed-in user's real profile + user_roles (see
  // App.tsx). Defaults are false: an unknown user gets the least access, not
  // the most. `loading` is what keeps that default from being mistaken for a
  // decision before the query resolves.
  //
  // These gate the UI only. RLS is what actually enforces access — see the
  // org-scoped policies in supabase/schema.sql.
  hasOrganization = false,
  isManager = false,
  loading = false,
}: {
  children: ReactNode;
  hasOrganization?: boolean;
  isManager?: boolean;
  loading?: boolean;
}) {
  const access: WorkspaceAccess = {
    hasOrganization,
    isManager,
    loading,
    enforceRoles: env.enforceWorkspaceRoles,
  };

  const [currentMode, setCurrentMode] = useState<WorkspaceMode>(() => {
    if (typeof window === "undefined") return "consumer";
    // Start from the stored value as-is; access isn't known yet, and the
    // effect below reconciles once it is.
    return resolveWorkspaceMode(localStorage.getItem(WORKSPACE_STORAGE_KEY), {
      hasOrganization,
      isManager,
      loading: true,
      enforceRoles: env.enforceWorkspaceRoles,
    }).mode;
  });

  useEffect(() => {
    const { mode, persist } = resolveWorkspaceMode(currentMode, access);
    if (mode !== currentMode) setCurrentMode(mode);
    // Only write down a decision made with real access data. Persisting a
    // provisional answer is what turned a one-frame glitch into a permanent
    // demotion.
    if (persist) localStorage.setItem(WORKSPACE_STORAGE_KEY, mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMode, hasOrganization, isManager, loading]);

  function setMode(mode: WorkspaceMode) {
    if (!canAccessMode(mode, access)) return;
    setCurrentMode(mode);
  }

  return (
    <WorkspaceContext.Provider value={{ currentMode, setMode, hasOrganization, isManager, loading }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
