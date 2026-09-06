import {
  effectiveShowingStatus,
  showingDurationMin,
  isOnTime,
  findConflicts,
  type Showing,
  type Property,
} from "@/lib/showings";

// Brokerage efficiency metrics. Pure functions so the numbers a broker makes
// staffing decisions on are actually testable — several of these are easy to
// get subtly wrong in ways that flatter the brokerage (see the tests).

export interface AgentStats {
  agentId: string;
  name: string;
  showings: number;
  completed: number;
  avgDurationMin: number | null;
  /** Share of *started* showings begun within the grace period, 0-1. */
  onTimeRate: number | null;
  /** Share of scheduled showings nobody showed up for, 0-1. */
  noShowRate: number | null;
  /** Share of completed showings with GPS confirmation, 0-1. */
  verifiedRate: number | null;
  bookedMinutes: number;
}

/** Mean of the values that exist; null when there are none. */
function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Ratio, or null when the denominator is empty — never 0/0 = 0. */
function rate(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

export function perAgentStats(showings: Showing[], now: number = Date.now()): AgentStats[] {
  const groups = new Map<string, Showing[]>();

  for (const s of showings) {
    // Unassigned showings belong to no agent — bucketing them under a shared
    // "unassigned" key would invent a fake agent in every per-agent chart.
    if (!s.agent_id) continue;
    if (!groups.has(s.agent_id)) groups.set(s.agent_id, []);
    groups.get(s.agent_id)!.push(s);
  }

  return [...groups.entries()]
    .map(([agentId, rows]) => {
      const statuses = rows.map((s) => effectiveShowingStatus(s, now));
      const durations = rows.map(showingDurationMin).filter((d): d is number => d !== null);

      // On-time is measured only over showings that actually started. A
      // no-show is a different failure and counting it as "late" would
      // understate the on-time rate for the wrong reason.
      const onTimeFlags = rows.map(isOnTime).filter((v): v is boolean => v !== null);

      const noShows = statuses.filter((s) => s === "no_show").length;
      const cancelled = statuses.filter((s) => s === "cancelled").length;
      // Cancelled showings were called off deliberately; including them in the
      // denominator would make a well-run day look like a no-show problem.
      const noShowDenominator = rows.length - cancelled;

      const completedRows = rows.filter((s) => s.actual_start !== null);
      const verified = completedRows.filter((s) => s.verified_at !== null).length;

      const bookedMinutes = rows
        .filter((_, i) => statuses[i] !== "cancelled")
        .reduce((sum, s) => {
          const start = new Date(s.scheduled_start).getTime();
          const end = new Date(s.scheduled_end).getTime();
          return Number.isNaN(start) || Number.isNaN(end) ? sum : sum + (end - start) / 60_000;
        }, 0);

      return {
        agentId,
        name: rows[0].agent_display_name || "Agent",
        showings: rows.length,
        completed: completedRows.length,
        avgDurationMin: durations.length ? Math.round(mean(durations)!) : null,
        onTimeRate: rate(onTimeFlags.filter(Boolean).length, onTimeFlags.length),
        noShowRate: rate(noShows, noShowDenominator),
        verifiedRate: rate(verified, completedRows.length),
        bookedMinutes: Math.round(bookedMinutes),
      };
    })
    .sort((a, b) => b.showings - a.showings);
}

export interface DayCount {
  date: string;
  showings: number;
}

/** Daily counts across the last `days` days, including days with none. */
export function showingsPerDay(showings: Showing[], days: number, now: number = Date.now()): DayCount[] {
  const buckets = new Map<string, number>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  for (const s of showings) {
    const key = s.scheduled_start.slice(0, 10);
    // Zero-filled days are what make a gap visible; only count what's in range.
    if (buckets.has(key)) buckets.set(key, buckets.get(key)! + 1);
  }

  return [...buckets.entries()].map(([date, count]) => ({ date, showings: count }));
}

export interface CoverageGap {
  property: Property;
  /**
   * Whole days of elapsed time since the last past, non-cancelled showing;
   * null if it has never been shown. Elapsed rather than calendar days on
   * purpose — calendar differences depend on a timezone, and this runs
   * client-side where that isn't reliably the organisation's own.
   */
  daysSinceLastShowing: number | null;
}

/**
 * Active listings with nothing booked in the window, worst first.
 *
 * This is the metric a broker acts on — "which of my listings is nobody
 * showing?" — as opposed to a count of listings that are already fine.
 */
export function coverageGaps(
  properties: Property[],
  showings: Showing[],
  now: number = Date.now(),
): CoverageGap[] {
  const lastByProperty = new Map<string, number>();

  for (const s of showings) {
    if (effectiveShowingStatus(s, now) === "cancelled") continue;
    const t = new Date(s.scheduled_start).getTime();
    if (Number.isNaN(t) || t > now) continue;
    const prev = lastByProperty.get(s.property_id);
    if (prev === undefined || t > prev) lastByProperty.set(s.property_id, t);
  }

  return properties
    .filter((p) => p.status === "active")
    .map((p) => {
      const last = lastByProperty.get(p.id);
      return {
        property: p,
        daysSinceLastShowing: last === undefined ? null : Math.floor((now - last) / 86_400_000),
      };
    })
    // Never-shown listings first, then longest-neglected.
    .sort((a, b) => {
      if (a.daysSinceLastShowing === null && b.daysSinceLastShowing === null) return 0;
      if (a.daysSinceLastShowing === null) return -1;
      if (b.daysSinceLastShowing === null) return 1;
      return b.daysSinceLastShowing - a.daysSinceLastShowing;
    });
}

export interface BrokerageSummary {
  totalShowings: number;
  avgDurationMin: number | null;
  onTimeRate: number | null;
  noShowRate: number | null;
  verifiedRate: number | null;
  conflicts: number;
}

export function summarise(showings: Showing[], now: number = Date.now()): BrokerageSummary {
  const statuses = showings.map((s) => effectiveShowingStatus(s, now));
  const durations = showings.map(showingDurationMin).filter((d): d is number => d !== null);
  const onTimeFlags = showings.map(isOnTime).filter((v): v is boolean => v !== null);

  const cancelled = statuses.filter((s) => s === "cancelled").length;
  const noShows = statuses.filter((s) => s === "no_show").length;
  const started = showings.filter((s) => s.actual_start !== null);
  const verified = started.filter((s) => s.verified_at !== null).length;

  return {
    totalShowings: showings.length,
    avgDurationMin: durations.length ? Math.round(mean(durations)!) : null,
    onTimeRate: rate(onTimeFlags.filter(Boolean).length, onTimeFlags.length),
    noShowRate: rate(noShows, showings.length - cancelled),
    verifiedRate: rate(verified, started.length),
    conflicts: findConflicts(showings).length,
  };
}

/** "84%" / "—" for a rate in 0-1. */
export function formatRate(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}
