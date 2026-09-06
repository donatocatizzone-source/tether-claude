import type { Database } from "@/types/database";

// Shared vocabulary for the real-estate B2B side. Pure functions only — no
// Supabase, no React — so both the agent view (/business/member) and the
// Overwatch console can use them, and so they're directly testable.

export type Showing = Database["public"]["Tables"]["showings"]["Row"];
export type Property = Database["public"]["Tables"]["properties"]["Row"];
export type ShowingStatus = Database["public"]["Enums"]["showing_status"];
export type SessionActivity = Database["public"]["Enums"]["session_activity"];

/** A showing joined to its property, the shape the schedule UI actually needs. */
export type ShowingWithProperty = Showing & { property: Property | null };

// Values match the session_activity enum exactly (see the migration), so this
// is the single label map for both the enum and TeamMemberView's activity
// picker — they used to be separate hardcoded lists.
export const ACTIVITY_LABELS: Record<SessionActivity, string> = {
  showing: "Showing",
  open_house: "Open House",
  appraisal: "Appraisal",
  client_meeting: "Client Meeting",
  inspection: "Inspection",
  listing_appointment: "Listing Appointment",
  other: "Other",
};

export const STATUS_LABELS: Record<ShowingStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

/** Grace period before a scheduled showing counts as started late. */
export const ON_TIME_GRACE_MIN = 5;

/** How long past its window a never-started showing is treated as a no-show. */
export const NO_SHOW_AFTER_MIN = 15;

function toMs(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * The status to *display*, which is not always the stored one.
 *
 * A showing nobody ever started stays 'scheduled' in the database forever —
 * nothing sweeps it. Rather than run a cron to rewrite rows, the no-show is
 * derived at read time, so the stored value keeps meaning "what someone
 * explicitly set" and the UI still tells the truth.
 */
export function effectiveShowingStatus(showing: Showing, now: number = Date.now()): ShowingStatus {
  if (showing.status !== "scheduled" && showing.status !== "confirmed") return showing.status;
  if (showing.actual_start) return showing.status;

  const end = toMs(showing.scheduled_end);
  if (end !== null && now > end + NO_SHOW_AFTER_MIN * 60_000) return "no_show";
  return showing.status;
}

/** Actual on-site duration in whole minutes, or null if it didn't complete. */
export function showingDurationMin(showing: Showing): number | null {
  const start = toMs(showing.actual_start);
  const end = toMs(showing.actual_end);
  if (start === null || end === null || end < start) return null;
  return Math.round((end - start) / 60_000);
}

/**
 * Whether the agent started within the grace period. Returns null when the
 * question doesn't apply (never started) — deliberately not `false`, so an
 * unstarted showing can't be counted as "late" in an on-time-rate average.
 */
export function isOnTime(showing: Showing): boolean | null {
  const actual = toMs(showing.actual_start);
  const scheduled = toMs(showing.scheduled_start);
  if (actual === null || scheduled === null) return null;
  return actual <= scheduled + ON_TIME_GRACE_MIN * 60_000;
}

export interface ShowingConflict<T extends Showing = Showing> {
  a: T;
  b: T;
  /** Agent conflicts are errors; property conflicts are often legitimate. */
  kind: "agent" | "property";
}

/**
 * Overlapping showings.
 *
 * Agent-level overlap is also blocked by a database exclusion constraint —
 * one person cannot be in two places. Property-level overlap is only
 * reported, never blocked: two agents at one house is sometimes deliberate
 * (open house, dual agency), so the broker wants it visible, not prevented.
 *
 * Cancelled and no-show rows can't conflict with anything.
 */
// Generic so callers keep whatever they passed in. ScheduleView hands in
// showings joined to their property and then reads `.property` off a
// conflict — with a non-generic Showing[] that silently became undefined and
// the conflict list rendered "Unknown address".
export function findConflicts<T extends Showing>(showings: T[]): ShowingConflict<T>[] {
  const live = showings.filter((s) => {
    const status = effectiveShowingStatus(s);
    return status !== "cancelled" && status !== "no_show";
  });

  const sorted = [...live].sort(
    (x, y) => (toMs(x.scheduled_start) ?? 0) - (toMs(y.scheduled_start) ?? 0),
  );

  const conflicts: ShowingConflict<T>[] = [];

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];

      const aStart = toMs(a.scheduled_start);
      const aEnd = toMs(a.scheduled_end);
      const bStart = toMs(b.scheduled_start);
      const bEnd = toMs(b.scheduled_end);
      if (aStart === null || aEnd === null || bStart === null || bEnd === null) continue;

      // Sorted by start, so once b starts at/after a ends, no later b can overlap a.
      if (bStart >= aEnd) break;

      // Half-open intervals: touching end-to-start is not an overlap.
      const overlaps = aStart < bEnd && bStart < aEnd;
      if (!overlaps) continue;

      if (a.agent_id && a.agent_id === b.agent_id) {
        conflicts.push({ a, b, kind: "agent" });
      } else if (a.property_id === b.property_id) {
        conflicts.push({ a, b, kind: "property" });
      }
    }
  }

  return conflicts;
}

/** "2:00 – 2:45 PM" for a schedule row. */
export function formatWindow(startIso: string, endIso: string, locale?: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";

  const time = (d: Date, opts: Intl.DateTimeFormatOptions = {}) =>
    d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", ...opts });

  // Drop the meridiem from the start when both sides share it: "2:00 – 4:45 PM".
  const sameMeridiem = start.getHours() < 12 === end.getHours() < 12;
  const startLabel = sameMeridiem
    ? time(start).replace(/\s*[AP]M$/i, "")
    : time(start);

  return `${startLabel} – ${time(end)}`;
}

/** Single-line address for a property, skipping blank parts. */
export function formatAddress(property: Pick<Property, "address_line1" | "city" | "state"> | null): string {
  if (!property) return "Unknown address";
  return [property.address_line1, property.city, property.state].filter(Boolean).join(", ") || "Unknown address";
}
