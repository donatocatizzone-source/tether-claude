import { useState } from "react";
import { CalendarDays, MapPin, Play, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  effectiveShowingStatus,
  formatWindow,
  formatAddress,
  ACTIVITY_LABELS,
  STATUS_LABELS,
  type ShowingWithProperty,
  type ShowingStatus,
} from "@/lib/showings";

// The agent's day at /business/member. Starting a showing goes through the
// start_showing_session RPC rather than inserting a session from the client:
// the RPC sets organization_id and copies the geofence from the property, so
// a session physically cannot be created without them (previously the client
// forgot the geofence, which left the whole geofence feature dead).

const STATUS_STYLES: Record<ShowingStatus, string> = {
  scheduled: "bg-muted text-muted-foreground",
  confirmed: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  in_progress: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground line-through",
  no_show: "bg-red-500/15 text-red-600 dark:text-red-400",
};

export interface StartedSession {
  sessionId: string;
  activityLabel: string;
  address: string;
  expectedEndTime: string;
}

interface Props {
  showings: ShowingWithProperty[];
  loading: boolean;
  error: string | null;
  /** Blocks starting a second session while one is already running. */
  hasActiveSession: boolean;
  onSessionStarted: (session: StartedSession) => void;
}

export function MyScheduleToday({ showings, loading, error, hasActiveSession, onSessionStarted }: Props) {
  const [startingId, setStartingId] = useState<string | null>(null);

  async function handleStart(showing: ShowingWithProperty) {
    setStartingId(showing.id);
    try {
      const { data: sessionId, error: rpcError } = await supabase.rpc("start_showing_session", {
        _showing_id: showing.id,
      });
      if (rpcError) throw rpcError;
      if (!sessionId) throw new Error("No session was created");

      onSessionStarted({
        sessionId: sessionId as string,
        activityLabel: ACTIVITY_LABELS[showing.activity_type],
        address: formatAddress(showing.property),
        expectedEndTime: showing.scheduled_end,
      });

      toast.success("Showing started", {
        description: showing.property?.lat
          ? "Tracking active — geofence armed on arrival"
          : "Tracking active — this property has no map pin, so no geofence",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start this showing");
    } finally {
      setStartingId(null);
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Today's Schedule</h3>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your schedule…
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          <div>
            <p className="font-medium text-foreground">Couldn't load your schedule</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      ) : showings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
          <p className="text-sm font-medium text-foreground">No showings scheduled today</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Start an unscheduled one from your properties below.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {showings.map((showing) => {
            const status = effectiveShowingStatus(showing);
            const canStart = !showing.session_id && status !== "cancelled" && status !== "completed";
            const isStarting = startingId === showing.id;

            return (
              <li key={showing.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {formatWindow(showing.scheduled_start, showing.scheduled_end)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      {formatAddress(showing.property)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      STATUS_STYLES[status],
                    )}
                  >
                    {STATUS_LABELS[status]}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span>{ACTIVITY_LABELS[showing.activity_type]}</span>
                  {showing.buyer_agent_brokerage && <span>· {showing.buyer_agent_brokerage}</span>}
                  {showing.verified_at && (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="h-3 w-3" /> Verified on site
                    </span>
                  )}
                </div>

                {canStart && (
                  <Button
                    onClick={() => handleStart(showing)}
                    disabled={isStarting || hasActiveSession}
                    size="sm"
                    className="mt-3 w-full"
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Starting…
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-3.5 w-3.5" />
                        {hasActiveSession ? "Finish your active session first" : "Start Showing"}
                      </>
                    )}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
