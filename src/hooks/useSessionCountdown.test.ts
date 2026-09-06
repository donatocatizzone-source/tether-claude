import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionCountdown } from "@/hooks/useSessionCountdown";

// First test in this repo — vitest + jsdom were configured but unused.
// This hook is worth covering because it replaced two separate broken
// timers (see the comment in useSessionCountdown.ts), and because a safety
// countdown that silently disagrees with the database is exactly the kind
// of bug a screenshot can't catch.
// Always capture this into a variable BEFORE renderHook. Calling it inside
// the render callback recomputes a fresh deadline on every re-render, so
// under fake timers the deadline chases the clock and never drains.
function inSeconds(sec: number): string {
  return new Date(Date.now() + sec * 1000).toISOString();
}

describe("useSessionCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a placeholder when there is no active session", () => {
    const { result } = renderHook(() => useSessionCountdown(null));
    expect(result.current.label).toBe("--:--");
    expect(result.current.isExpired).toBe(false);
    expect(result.current.isWarning).toBe(false);
  });

  it("formats remaining time as MM:SS", () => {
    const { result } = renderHook(() => useSessionCountdown(inSeconds(65)));
    expect(result.current.label).toBe("01:05");
    expect(result.current.remainingSec).toBe(65);
  });

  it("zero-pads both fields", () => {
    const { result } = renderHook(() => useSessionCountdown(inSeconds(9)));
    expect(result.current.label).toBe("00:09");
  });

  it("counts down as time passes", () => {
    const end = inSeconds(60);
    const { result } = renderHook(() => useSessionCountdown(end));
    expect(result.current.label).toBe("01:00");

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.label).toBe("00:55");
  });

  it("derives from the wall clock, so backgrounding the tab cannot slow it down", () => {
    // The bug this replaces decremented a counter once per tick, so a
    // throttled/suspended interval made the timer read later than reality.
    // Advancing 30s of wall time must cost 30s regardless of tick count.
    const end = inSeconds(120);
    const { result } = renderHook(() => useSessionCountdown(end));

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.remainingSec).toBe(90);
  });

  it("flags a warning under five minutes", () => {
    const { result } = renderHook(() => useSessionCountdown(inSeconds(299)));
    expect(result.current.isWarning).toBe(true);
    expect(result.current.isExpired).toBe(false);
  });

  it("does not flag a warning above five minutes", () => {
    const { result } = renderHook(() => useSessionCountdown(inSeconds(301)));
    expect(result.current.isWarning).toBe(false);
  });

  it("expires at zero and clamps rather than going negative", () => {
    const end = inSeconds(2);
    const { result } = renderHook(() => useSessionCountdown(end));

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(result.current.remainingSec).toBe(0);
    expect(result.current.label).toBe("00:00");
    expect(result.current.isExpired).toBe(true);
    expect(result.current.isWarning).toBe(false);
  });

  it("treats an already-past end time as expired", () => {
    const { result } = renderHook(() => useSessionCountdown(inSeconds(-500)));
    expect(result.current.remainingSec).toBe(0);
    expect(result.current.isExpired).toBe(true);
  });

  it("picks up an extended end time without remounting", () => {
    // "Extend +15m" updates expected_end_time in the database; the hook must
    // follow the new prop rather than keep draining the original window.
    const { result, rerender } = renderHook(({ end }) => useSessionCountdown(end), {
      initialProps: { end: inSeconds(60) as string | null },
    });
    expect(result.current.remainingSec).toBe(60);

    rerender({ end: inSeconds(60 + 900) });
    expect(result.current.remainingSec).toBe(960);
    expect(result.current.isExpired).toBe(false);
  });

  it("resets to the placeholder when the session ends", () => {
    const { result, rerender } = renderHook(({ end }) => useSessionCountdown(end), {
      initialProps: { end: inSeconds(60) as string | null },
    });
    rerender({ end: null });
    expect(result.current.label).toBe("--:--");
  });

  it("does not crash on a malformed timestamp", () => {
    const { result } = renderHook(() => useSessionCountdown("not-a-date"));
    expect(result.current.remainingSec).toBe(0);
    expect(result.current.label).toBe("00:00");
  });
});
