export type WorkspaceMode = "consumer" | "member" | "admin";

export const WORKSPACE_STORAGE_KEY = "tether-workspace-mode";

export interface WorkspaceAccess {
  hasOrganization: boolean;
  isManager: boolean;
  /** True while the profile/roles query is still in flight. */
  loading: boolean;
}

export interface ResolvedWorkspace {
  mode: WorkspaceMode;
  /**
   * Whether this resolution should be written back to localStorage.
   *
   * False while access is still loading, so a transient "you have nothing"
   * answer can't overwrite a real stored choice. That is precisely the bug
   * this module exists to prevent: the reconcile effect demoted a restored
   * `admin` to `consumer` on first paint and persisted it, so a real manager
   * lost their workspace on every refresh.
   */
  persist: boolean;
}

export function isWorkspaceMode(value: unknown): value is WorkspaceMode {
  return value === "consumer" || value === "member" || value === "admin";
}

/** Whether `mode` is permitted given the user's org membership and role. */
export function canAccessMode(mode: WorkspaceMode, access: WorkspaceAccess): boolean {
  if (mode === "consumer") return true;
  // While loading we know nothing; callers must not act on a `false` here.
  if (access.loading) return false;
  if (mode === "member") return access.hasOrganization;
  return access.isManager && access.hasOrganization;
}

/**
 * Decides which workspace to show, and whether that decision is durable.
 *
 * Pure so the refresh-demotion bug is testable without mounting a provider.
 */
export function resolveWorkspaceMode(stored: unknown, access: WorkspaceAccess): ResolvedWorkspace {
  const requested: WorkspaceMode = isWorkspaceMode(stored) ? stored : "consumer";

  // Hold the user's stored choice until we actually know their access.
  // Rendering `consumer` here is fine; writing it down is not.
  if (access.loading) return { mode: requested, persist: false };

  if (canAccessMode(requested, access)) return { mode: requested, persist: true };

  // Genuinely not allowed: fall back, and it's safe to remember that.
  return { mode: "consumer", persist: true };
}

/** Why a workspace is unavailable, for the switcher to explain itself. */
export function workspaceLockReason(mode: WorkspaceMode, access: WorkspaceAccess): string | null {
  if (canAccessMode(mode, access) || access.loading) return null;
  if (!access.hasOrganization) return "Join or create a brokerage to unlock";
  if (mode === "admin") return "Requires a manager or admin role";
  return null;
}
