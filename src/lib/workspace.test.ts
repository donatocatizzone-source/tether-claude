import { describe, it, expect } from "vitest";
import {
  resolveWorkspaceMode,
  canAccessMode,
  workspaceLockReason,
  isWorkspaceMode,
  type WorkspaceAccess,
} from "@/lib/workspace";

const LOADING: WorkspaceAccess = { hasOrganization: false, isManager: false, loading: true, enforceRoles: true };
const NO_ORG: WorkspaceAccess = { hasOrganization: false, isManager: false, loading: false, enforceRoles: true };
const MEMBER: WorkspaceAccess = { hasOrganization: true, isManager: false, loading: false, enforceRoles: true };
const MANAGER: WorkspaceAccess = { hasOrganization: true, isManager: true, loading: false, enforceRoles: true };

describe("resolveWorkspaceMode", () => {
  // The regression that shipped: on first paint the profile query is still in
  // flight, so hasOrganization/isManager are both false. The old effect read
  // that as "not allowed", demoted a restored `admin` to `consumer`, AND
  // persisted it — so a real manager lost their workspace on every refresh.
  it("keeps a stored manager workspace while access is still loading", () => {
    expect(resolveWorkspaceMode("admin", LOADING)).toEqual({ mode: "admin", persist: false });
  });

  it("never persists anything while loading", () => {
    // Persisting a provisional answer is what made the bug permanent.
    expect(resolveWorkspaceMode("member", LOADING).persist).toBe(false);
    expect(resolveWorkspaceMode("consumer", LOADING).persist).toBe(false);
  });

  it("demotes once we actually know the user has no organization", () => {
    expect(resolveWorkspaceMode("admin", NO_ORG)).toEqual({ mode: "consumer", persist: true });
    expect(resolveWorkspaceMode("member", NO_ORG)).toEqual({ mode: "consumer", persist: true });
  });

  it("keeps a manager in admin once access resolves", () => {
    expect(resolveWorkspaceMode("admin", MANAGER)).toEqual({ mode: "admin", persist: true });
  });

  it("demotes a non-manager out of admin but leaves member alone", () => {
    expect(resolveWorkspaceMode("admin", MEMBER)).toEqual({ mode: "consumer", persist: true });
    expect(resolveWorkspaceMode("member", MEMBER)).toEqual({ mode: "member", persist: true });
  });

  it("falls back to consumer for junk stored values", () => {
    expect(resolveWorkspaceMode(null, MANAGER).mode).toBe("consumer");
    expect(resolveWorkspaceMode("overwatch", MANAGER).mode).toBe("consumer");
    expect(resolveWorkspaceMode(undefined, MANAGER).mode).toBe("consumer");
  });

  it("always allows consumer", () => {
    expect(resolveWorkspaceMode("consumer", NO_ORG)).toEqual({ mode: "consumer", persist: true });
  });
});

describe("canAccessMode", () => {
  it("treats consumer as always available, even while loading", () => {
    expect(canAccessMode("consumer", LOADING)).toBe(true);
    expect(canAccessMode("consumer", NO_ORG)).toBe(true);
  });

  it("reports false while loading for gated modes", () => {
    // Callers must not persist on this; resolveWorkspaceMode enforces that.
    expect(canAccessMode("member", LOADING)).toBe(false);
    expect(canAccessMode("admin", LOADING)).toBe(false);
  });

  it("requires an organization for member", () => {
    expect(canAccessMode("member", NO_ORG)).toBe(false);
    expect(canAccessMode("member", MEMBER)).toBe(true);
  });

  it("requires both an organization and a manager role for admin", () => {
    expect(canAccessMode("admin", MEMBER)).toBe(false);
    expect(canAccessMode("admin", MANAGER)).toBe(true);
    // A manager flag without an org is incoherent; deny rather than trust it.
    expect(canAccessMode("admin", { hasOrganization: false, isManager: true, loading: false, enforceRoles: true })).toBe(false);
  });
});

describe("workspaceLockReason", () => {
  it("explains the missing organization", () => {
    expect(workspaceLockReason("member", NO_ORG)).toBe("Join or create a brokerage to unlock");
    expect(workspaceLockReason("admin", NO_ORG)).toBe("Join or create a brokerage to unlock");
  });

  it("explains the missing role when the org is present", () => {
    expect(workspaceLockReason("admin", MEMBER)).toBe("Requires a manager or admin role");
  });

  it("says nothing for an available mode", () => {
    expect(workspaceLockReason("admin", MANAGER)).toBeNull();
    expect(workspaceLockReason("consumer", NO_ORG)).toBeNull();
  });

  it("says nothing while loading, rather than flashing a wrong reason", () => {
    expect(workspaceLockReason("admin", LOADING)).toBeNull();
  });
});

// This is the configuration currently shipping (VITE_ENFORCE_WORKSPACE_ROLES
// unset), so it deserves the same coverage as the enforced path. Every
// workspace is offered; RLS still governs what's inside them.
describe("demo mode — enforceRoles: false", () => {
  const DEMO: WorkspaceAccess = {
    hasOrganization: false,
    isManager: false,
    loading: false,
    enforceRoles: false,
  };
  const DEMO_LOADING: WorkspaceAccess = { ...DEMO, loading: true };

  it("offers every workspace to a user with no org and no roles", () => {
    expect(canAccessMode("consumer", DEMO)).toBe(true);
    expect(canAccessMode("member", DEMO)).toBe(true);
    expect(canAccessMode("admin", DEMO)).toBe(true);
  });

  it("offers them during the loading frame too, so nothing flickers shut", () => {
    expect(canAccessMode("admin", DEMO_LOADING)).toBe(true);
  });

  it("keeps a stored workspace instead of demoting it", () => {
    expect(resolveWorkspaceMode("admin", DEMO)).toEqual({ mode: "admin", persist: true });
    expect(resolveWorkspaceMode("member", DEMO)).toEqual({ mode: "member", persist: true });
  });

  it("holds the stored workspace through loading without demoting", () => {
    // The refresh-demotion bug must stay fixed in this configuration as well.
    expect(resolveWorkspaceMode("admin", DEMO_LOADING).mode).toBe("admin");
  });

  it("still rejects junk stored values", () => {
    expect(resolveWorkspaceMode("overwatch", DEMO).mode).toBe("consumer");
  });

  it("shows no lock reason, since nothing is locked", () => {
    expect(workspaceLockReason("admin", DEMO)).toBeNull();
    expect(workspaceLockReason("member", DEMO)).toBeNull();
  });
});

describe("isWorkspaceMode", () => {
  it("accepts the three real modes and rejects anything else", () => {
    expect(isWorkspaceMode("consumer")).toBe(true);
    expect(isWorkspaceMode("member")).toBe(true);
    expect(isWorkspaceMode("admin")).toBe(true);
    expect(isWorkspaceMode("")).toBe(false);
    expect(isWorkspaceMode(null)).toBe(false);
    expect(isWorkspaceMode(3)).toBe(false);
  });
});
