import { createContext, useContext, useState, type ReactNode } from "react";

// New structural addition (not a port) — see CLAUDE.md: the original only
// had a one-way "Switch to Professional" link, no toggle back. Persists
// to localStorage so refreshing the page keeps the user in the workspace
// they last chose.
export type Workspace = "consumer" | "professional";

const STORAGE_KEY = "tether:workspace";

function readStoredWorkspace(): Workspace {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "professional" ? "professional" : "consumer";
  } catch {
    return "consumer";
  }
}

interface WorkspaceContextValue {
  workspace: Workspace;
  setWorkspace: (workspace: Workspace) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspaceState] = useState<Workspace>(readStoredWorkspace);

  function setWorkspace(next: Workspace) {
    setWorkspaceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore write failures (e.g. private browsing) — state still
      // updates for the current session.
    }
  }

  return (
    <WorkspaceContext.Provider value={{ workspace, setWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
