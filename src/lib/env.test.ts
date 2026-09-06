import { describe, it, expect } from "vitest";
import { appUrl } from "@/lib/env";

// BASE_URL is "/" under vitest, matching dev. The production case
// ("/tether-claude/") is what these guard: the previous code used
// window.location.origin directly, so every generated link — email
// confirmation, org invites, seller share links — pointed outside the
// deployed app's base path and 404'd.
describe("appUrl", () => {
  it("returns the app root for no path", () => {
    expect(appUrl()).toBe(`${window.location.origin}/`);
  });

  it("appends a route", () => {
    expect(appUrl("auth/update-password")).toBe(`${window.location.origin}/auth/update-password`);
  });

  it("tolerates a leading slash without doubling it", () => {
    // Callers naturally write "/invite/abc"; that must not become "//invite/abc".
    expect(appUrl("/invite/abc")).toBe(`${window.location.origin}/invite/abc`);
  });

  it("preserves query strings", () => {
    expect(appUrl("auth?invite=tok")).toBe(`${window.location.origin}/auth?invite=tok`);
  });
});
