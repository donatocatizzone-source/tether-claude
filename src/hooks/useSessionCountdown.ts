import { useEffect, useState } from "react";

// Shared countdown for any timed professional session.
//
// Two call sites had two different bugs this replaces:
//   - TeamMemberView declared a `countdown` string but never called its
//     setter, so the active-session timer rendered "--:--" forever.
//   - ProGuardActive decremented a local counter every second, which drifts
//     and stalls whenever the tab is backgrounded — and never agreed with
//     the `expected_end_time` Overwatch reads out of the database.
//
// Both are fixed by deriving remaining time from the wall clock against the
// session's real `expected_end_time`, so the UI and the manager console can
// never disagree, and backgrounding the tab doesn't slow the clock down.
export interface SessionCountdown {
  /** "MM:SS", or "--:--" when there's no active session. */
  label: string;
  remainingSec: number;
  /** Under 5 minutes left (and not yet expired). */
  isWarning: boolean;
  isExpired: boolean;
}

const WARNING_THRESHOLD_SEC = 300;

function remainingFrom(expectedEndTime: string | null): number {
  if (!expectedEndTime) return 0;
  const ms = new Date(expectedEndTime).getTime() - Date.now();
  return Number.isNaN(ms) ? 0 : Math.max(0, Math.floor(ms / 1000));
}

export function useSessionCountdown(expectedEndTime: string | null): SessionCountdown {
  const [remainingSec, setRemainingSec] = useState(() => remainingFrom(expectedEndTime));

  useEffect(() => {
    setRemainingSec(remainingFrom(expectedEndTime));
    if (!expectedEndTime) return;

    const interval = setInterval(() => {
      setRemainingSec(remainingFrom(expectedEndTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [expectedEndTime]);

  if (!expectedEndTime) {
    return { label: "--:--", remainingSec: 0, isWarning: false, isExpired: false };
  }

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;

  return {
    label: `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
    remainingSec,
    isWarning: remainingSec > 0 && remainingSec <= WARNING_THRESHOLD_SEC,
    isExpired: remainingSec === 0,
  };
}
