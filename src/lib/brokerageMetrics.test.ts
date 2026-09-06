import { describe, it, expect } from "vitest";
import {
  perAgentStats, showingsPerDay, coverageGaps, summarise, formatRate,
} from "@/lib/brokerageMetrics";
import type { Showing, Property } from "@/lib/showings";

// A broker makes staffing decisions on these numbers, so the cases that
// matter are the ones where a naive implementation quietly flatters the
// brokerage — counting cancellations as no-shows, treating "no data" as 100%,
// or averaging a never-started showing in as a late one.

const T = (day: number, h: number, m = 0) => new Date(2026, 8, day, h, m).toISOString();
const NOW = new Date(2026, 8, 20, 12).getTime();

function showing(over: Partial<Showing> = {}): Showing {
  return {
    id: Math.random().toString(36).slice(2),
    organization_id: "org1",
    property_id: "p1",
    agent_id: "a1",
    agent_display_name: "Dana Reyes",
    scheduled_start: T(10, 14),
    scheduled_end: T(10, 15),
    status: "completed",
    activity_type: "showing",
    buyer_name: "",
    buyer_agent_brokerage: "",
    notes: "",
    feedback: "",
    session_id: null,
    actual_start: T(10, 14),
    actual_end: T(10, 14, 40),
    verified_at: T(10, 14, 2),
    cancelled_reason: "",
    created_by: "a1",
    created_at: T(9, 9),
    updated_at: T(9, 9),
    ...over,
  } as Showing;
}

function property(over: Partial<Property> = {}): Property {
  return {
    id: "p1",
    organization_id: "org1",
    address_line1: "123 Maple St",
    address_line2: "",
    city: "Austin",
    state: "TX",
    postal_code: "78701",
    lat: 30.27,
    lng: -97.74,
    geofence_radius_m: 150,
    beds: 3,
    baths: 2,
    sqft: 1850,
    list_price: 625000,
    mls_number: "",
    image_url: "",
    status: "active",
    seller_name: "",
    seller_email: "",
    access_notes: "",
    share_token: "tok",
    share_enabled: false,
    share_expires_at: null,
    share_include_upcoming: false,
    created_by: "a1",
    created_at: T(1, 9),
    updated_at: T(1, 9),
    ...over,
  } as Property;
}

describe("perAgentStats", () => {
  it("groups by agent and reports volume", () => {
    const stats = perAgentStats(
      [showing({ agent_id: "a1" }), showing({ agent_id: "a1" }), showing({ agent_id: "a2", agent_display_name: "Sam Ito" })],
      NOW,
    );
    expect(stats).toHaveLength(2);
    expect(stats[0]).toMatchObject({ agentId: "a1", showings: 2 });
    expect(stats[1]).toMatchObject({ agentId: "a2", name: "Sam Ito", showings: 1 });
  });

  it("skips unassigned showings rather than inventing an agent", () => {
    const stats = perAgentStats([showing({ agent_id: null }), showing({ agent_id: "a1" })], NOW);
    expect(stats).toHaveLength(1);
    expect(stats[0].agentId).toBe("a1");
  });

  it("excludes cancellations from the no-show denominator", () => {
    // 1 no-show, 1 cancelled, 1 completed. The no-show rate is 1/2, not 1/3 —
    // a deliberately cancelled showing isn't a failure to turn up.
    const stats = perAgentStats(
      [
        showing({ status: "scheduled", actual_start: null, scheduled_end: T(10, 15) }),
        showing({ status: "cancelled", actual_start: null }),
        showing(),
      ],
      NOW,
    );
    expect(stats[0].noShowRate).toBeCloseTo(0.5);
  });

  it("measures on-time only over showings that actually started", () => {
    // A no-show must not count as a late start.
    const stats = perAgentStats(
      [
        showing({ actual_start: T(10, 14, 2) }), // on time
        showing({ status: "scheduled", actual_start: null, scheduled_end: T(10, 15) }), // no-show
      ],
      NOW,
    );
    expect(stats[0].onTimeRate).toBe(1);
  });

  it("returns null rates rather than 0 when there is nothing to measure", () => {
    // 0/0 rendered as 0% would read as a catastrophic failure.
    const stats = perAgentStats([showing({ status: "cancelled", actual_start: null, actual_end: null })], NOW);
    expect(stats[0].onTimeRate).toBeNull();
    expect(stats[0].verifiedRate).toBeNull();
    expect(stats[0].avgDurationMin).toBeNull();
  });

  it("computes verified rate over started showings only", () => {
    const stats = perAgentStats(
      [showing({ verified_at: T(10, 14, 2) }), showing({ verified_at: null })],
      NOW,
    );
    expect(stats[0].verifiedRate).toBeCloseTo(0.5);
  });

  it("excludes cancelled showings from booked time", () => {
    const stats = perAgentStats(
      [showing(), showing({ status: "cancelled", actual_start: null })],
      NOW,
    );
    expect(stats[0].bookedMinutes).toBe(60);
  });
});

describe("showingsPerDay", () => {
  it("zero-fills days with no showings so gaps are visible", () => {
    const days = showingsPerDay([showing({ scheduled_start: T(20, 14) })], 3, NOW);
    expect(days).toHaveLength(3);
    expect(days[2]).toEqual({ date: "2026-09-20", showings: 1 });
    expect(days[0].showings).toBe(0);
  });

  it("ignores showings outside the window", () => {
    const days = showingsPerDay([showing({ scheduled_start: T(1, 14) })], 3, NOW);
    expect(days.every((d) => d.showings === 0)).toBe(true);
  });
});

describe("coverageGaps", () => {
  it("puts never-shown active listings first", () => {
    const gaps = coverageGaps(
      [property({ id: "p1" }), property({ id: "p2" })],
      [showing({ property_id: "p1", scheduled_start: T(19, 14) })],
      NOW,
    );
    expect(gaps[0].property.id).toBe("p2");
    expect(gaps[0].daysSinceLastShowing).toBeNull();
    // 22 elapsed hours is 0 whole days. Measured as elapsed time rather than
    // calendar days on purpose: calendar differences depend on a timezone,
    // and this runs client-side where that isn't reliably the org's own.
    expect(gaps[1].daysSinceLastShowing).toBe(0);
  });

  it("counts whole elapsed days for an older showing", () => {
    const gaps = coverageGaps(
      [property({ id: "p1" })],
      [showing({ property_id: "p1", scheduled_start: T(14, 14) })],
      NOW,
    );
    expect(gaps[0].daysSinceLastShowing).toBe(5);
  });

  it("ranks the longest-neglected listing first among those shown before", () => {
    const gaps = coverageGaps(
      [property({ id: "p1" }), property({ id: "p2" })],
      [
        showing({ property_id: "p1", scheduled_start: T(19, 14) }),
        showing({ property_id: "p2", scheduled_start: T(12, 14) }),
      ],
      NOW,
    );
    expect(gaps[0].property.id).toBe("p2");
  });

  it("ignores non-active listings", () => {
    const gaps = coverageGaps([property({ id: "p1", status: "sold" })], [], NOW);
    expect(gaps).toHaveLength(0);
  });

  it("does not let a future booking count as recent coverage", () => {
    // A showing booked for next week doesn't mean the listing has been shown.
    const gaps = coverageGaps([property({ id: "p1" })], [showing({ property_id: "p1", scheduled_start: T(25, 14) })], NOW);
    expect(gaps[0].daysSinceLastShowing).toBeNull();
  });

  it("ignores cancelled showings when dating last coverage", () => {
    const gaps = coverageGaps(
      [property({ id: "p1" })],
      [showing({ property_id: "p1", scheduled_start: T(19, 14), status: "cancelled", actual_start: null })],
      NOW,
    );
    expect(gaps[0].daysSinceLastShowing).toBeNull();
  });
});

describe("summarise", () => {
  it("aggregates across every agent", () => {
    const s = summarise([showing({ agent_id: "a1" }), showing({ agent_id: "a2" })], NOW);
    expect(s.totalShowings).toBe(2);
    expect(s.avgDurationMin).toBe(40);
    expect(s.verifiedRate).toBe(1);
  });

  it("reports empty input without dividing by zero", () => {
    const s = summarise([], NOW);
    expect(s).toMatchObject({
      totalShowings: 0,
      avgDurationMin: null,
      onTimeRate: null,
      noShowRate: null,
      verifiedRate: null,
      conflicts: 0,
    });
  });
});

describe("formatRate", () => {
  it("renders a percentage", () => {
    expect(formatRate(0.836)).toBe("84%");
  });

  it("renders a dash for no data, which is not the same as zero", () => {
    expect(formatRate(null)).toBe("—");
    expect(formatRate(0)).toBe("0%");
  });
});
