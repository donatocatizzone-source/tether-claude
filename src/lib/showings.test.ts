import { describe, it, expect } from "vitest";
import {
  effectiveShowingStatus,
  showingDurationMin,
  isOnTime,
  findConflicts,
  formatWindow,
  formatAddress,
  type Showing,
} from "@/lib/showings";

// These functions back the brokerage efficiency metrics (on-time rate,
// no-show rate, avg duration, double-bookings), so the edge cases matter
// more than the happy paths — a metric that quietly counts the wrong rows
// is worse than one that's obviously broken.

const T = (h: number, m = 0) => new Date(2026, 8, 6, h, m).toISOString();

function showing(over: Partial<Showing> = {}): Showing {
  return {
    id: "s1",
    organization_id: "org1",
    property_id: "p1",
    agent_id: "a1",
    agent_display_name: "Dana Reyes",
    scheduled_start: T(14),
    scheduled_end: T(14, 45),
    status: "scheduled",
    activity_type: "showing",
    buyer_name: "",
    buyer_agent_brokerage: "",
    notes: "",
    feedback: "",
    session_id: null,
    actual_start: null,
    actual_end: null,
    verified_at: null,
    cancelled_reason: "",
    created_by: "a1",
    created_at: T(9),
    updated_at: T(9),
    ...over,
  } as Showing;
}

describe("effectiveShowingStatus", () => {
  it("leaves an upcoming scheduled showing alone", () => {
    expect(effectiveShowingStatus(showing(), new Date(2026, 8, 6, 13).getTime())).toBe("scheduled");
  });

  it("derives no_show once the window is well past and nothing started", () => {
    // Nothing sweeps stale rows, so this has to be derived at read time.
    expect(effectiveShowingStatus(showing(), new Date(2026, 8, 6, 15, 30).getTime())).toBe("no_show");
  });

  it("does not call it a no_show inside the grace window", () => {
    expect(effectiveShowingStatus(showing(), new Date(2026, 8, 6, 14, 50).getTime())).toBe("scheduled");
  });

  it("never overrides a showing that actually started", () => {
    const s = showing({ actual_start: T(14, 2) });
    expect(effectiveShowingStatus(s, new Date(2026, 8, 6, 20).getTime())).toBe("scheduled");
  });

  it("never overrides an explicit terminal status", () => {
    const now = new Date(2026, 8, 6, 20).getTime();
    expect(effectiveShowingStatus(showing({ status: "cancelled" }), now)).toBe("cancelled");
    expect(effectiveShowingStatus(showing({ status: "completed" }), now)).toBe("completed");
  });

  it("treats confirmed like scheduled", () => {
    const s = showing({ status: "confirmed" });
    expect(effectiveShowingStatus(s, new Date(2026, 8, 6, 15, 30).getTime())).toBe("no_show");
  });
});

describe("showingDurationMin", () => {
  it("returns whole minutes on site", () => {
    expect(showingDurationMin(showing({ actual_start: T(14), actual_end: T(14, 34) }))).toBe(34);
  });

  it("returns null when the showing never completed", () => {
    expect(showingDurationMin(showing({ actual_start: T(14) }))).toBeNull();
    expect(showingDurationMin(showing())).toBeNull();
  });

  it("returns null rather than a negative duration on inverted timestamps", () => {
    // Would otherwise drag an average below zero.
    expect(showingDurationMin(showing({ actual_start: T(15), actual_end: T(14) }))).toBeNull();
  });
});

describe("isOnTime", () => {
  it("counts an early start as on time", () => {
    expect(isOnTime(showing({ actual_start: T(13, 55) }))).toBe(true);
  });

  it("allows the grace period", () => {
    expect(isOnTime(showing({ actual_start: T(14, 5) }))).toBe(true);
  });

  it("counts a start past the grace period as late", () => {
    expect(isOnTime(showing({ actual_start: T(14, 6) }))).toBe(false);
  });

  it("returns null — not false — when the showing never started", () => {
    // A no-show must not be averaged in as a "late" start; it's a different
    // metric, and conflating them would understate the on-time rate.
    expect(isOnTime(showing())).toBeNull();
  });
});

describe("findConflicts", () => {
  it("finds an agent double-booked across two properties", () => {
    const c = findConflicts([
      showing({ id: "a", property_id: "p1", scheduled_start: T(14), scheduled_end: T(15) }),
      showing({ id: "b", property_id: "p2", scheduled_start: T(14, 30), scheduled_end: T(15, 30) }),
    ]);
    expect(c).toHaveLength(1);
    expect(c[0].kind).toBe("agent");
  });

  it("reports two different agents at one property as a property conflict", () => {
    const c = findConflicts([
      showing({ id: "a", agent_id: "a1", scheduled_start: T(14), scheduled_end: T(15) }),
      showing({ id: "b", agent_id: "a2", scheduled_start: T(14, 30), scheduled_end: T(15, 30) }),
    ]);
    expect(c).toHaveLength(1);
    expect(c[0].kind).toBe("property");
  });

  it("does not treat back-to-back showings as overlapping", () => {
    // Half-open intervals: 2:00-3:00 then 3:00-4:00 is a normal day.
    expect(
      findConflicts([
        showing({ id: "a", scheduled_start: T(14), scheduled_end: T(15) }),
        showing({ id: "b", property_id: "p2", scheduled_start: T(15), scheduled_end: T(16) }),
      ]),
    ).toHaveLength(0);
  });

  it("ignores cancelled and no-show rows", () => {
    expect(
      findConflicts([
        showing({ id: "a", scheduled_start: T(14), scheduled_end: T(15) }),
        showing({ id: "b", property_id: "p2", scheduled_start: T(14, 30), scheduled_end: T(15, 30), status: "cancelled" }),
      ]),
    ).toHaveLength(0);
  });

  it("does not pair unassigned showings by a shared null agent", () => {
    // Two unassigned showings at different properties conflict with nothing.
    expect(
      findConflicts([
        showing({ id: "a", agent_id: null, property_id: "p1", scheduled_start: T(14), scheduled_end: T(15) }),
        showing({ id: "b", agent_id: null, property_id: "p2", scheduled_start: T(14, 30), scheduled_end: T(15, 30) }),
      ]),
    ).toHaveLength(0);
  });

  it("prefers the agent conflict when both agent and property match", () => {
    const c = findConflicts([
      showing({ id: "a", scheduled_start: T(14), scheduled_end: T(15) }),
      showing({ id: "b", scheduled_start: T(14, 30), scheduled_end: T(15, 30) }),
    ]);
    expect(c).toHaveLength(1);
    expect(c[0].kind).toBe("agent");
  });

  it("finds every pair when three overlap", () => {
    expect(
      findConflicts([
        showing({ id: "a", scheduled_start: T(14), scheduled_end: T(17) }),
        showing({ id: "b", property_id: "p2", scheduled_start: T(14, 30), scheduled_end: T(17) }),
        showing({ id: "c", property_id: "p3", scheduled_start: T(15), scheduled_end: T(17) }),
      ]),
    ).toHaveLength(3);
  });

  it("handles an empty list", () => {
    expect(findConflicts([])).toEqual([]);
  });
});

describe("formatWindow", () => {
  it("drops the redundant meridiem when both ends share it", () => {
    expect(formatWindow(T(14), T(14, 45), "en-US")).toBe("2:00 – 2:45 PM");
  });

  it("keeps both when the window crosses noon", () => {
    expect(formatWindow(T(11, 30), T(12, 30), "en-US")).toBe("11:30 AM – 12:30 PM");
  });

  it("degrades to a dash on invalid input rather than 'Invalid Date'", () => {
    expect(formatWindow("nope", T(14), "en-US")).toBe("—");
  });
});

describe("formatAddress", () => {
  it("joins the parts present", () => {
    expect(formatAddress({ address_line1: "123 Maple St", city: "Austin", state: "TX" })).toBe(
      "123 Maple St, Austin, TX",
    );
  });

  it("skips blank parts", () => {
    expect(formatAddress({ address_line1: "123 Maple St", city: "", state: "" })).toBe("123 Maple St");
  });

  it("falls back when there is no property", () => {
    expect(formatAddress(null)).toBe("Unknown address");
  });
});
