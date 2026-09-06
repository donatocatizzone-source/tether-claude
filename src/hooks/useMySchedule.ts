import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { ShowingWithProperty } from "@/lib/showings";

// The signed-in agent's own showings for a day, joined to their property.
//
// Subscribes to `showings` filtered to this agent so a manager rescheduling
// or cancelling lands on the phone without a refresh — same Realtime channel
// pattern TeamMemberView already uses for professional_sessions.

interface UseMyScheduleOptions {
  userId: string | undefined;
  /** Any time within the target day; defaults to today. */
  date?: Date;
}

export interface MySchedule {
  showings: ShowingWithProperty[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function dayBounds(date: Date): { start: string; end: string } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function useMySchedule({ userId, date }: UseMyScheduleOptions): MySchedule {
  const [showings, setShowings] = useState<ShowingWithProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Depend on the day, not the Date instance — a caller passing `new Date()`
  // inline would otherwise re-run this effect on every single render.
  const dayKey = date ? date.toDateString() : new Date().toDateString();

  const fetchSchedule = useCallback(async () => {
    if (!userId) {
      setShowings([]);
      setLoading(false);
      return;
    }

    const { start, end } = dayBounds(new Date(dayKey));

    const { data, error: err } = await supabase
      .from("showings")
      .select("*, property:properties(*)")
      .eq("agent_id", userId)
      .gte("scheduled_start", start)
      .lt("scheduled_start", end)
      .order("scheduled_start", { ascending: true });

    if (err) {
      setError(err.message);
      // Deliberately leave any previously loaded showings on screen rather
      // than blanking the agent's schedule on a transient network error.
      setLoading(false);
      return;
    }

    setError(null);
    setShowings((data ?? []) as ShowingWithProperty[]);
    setLoading(false);
  }, [userId, dayKey]);

  useEffect(() => {
    setLoading(true);
    fetchSchedule();
  }, [fetchSchedule]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`my-schedule-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "showings", filter: `agent_id=eq.${userId}` },
        () => fetchSchedule(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchSchedule]);

  return { showings, loading, error, refresh: fetchSchedule };
}
