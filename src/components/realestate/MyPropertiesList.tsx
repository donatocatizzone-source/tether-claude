import { useState } from "react";
import { Home, Play, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { PropertyCard } from "@/components/realestate/PropertyCard";
import { ACTIVITY_LABELS, formatAddress, type Property } from "@/lib/showings";
import type { StartedSession } from "@/components/realestate/MyScheduleToday";

// Replaces TeamMemberView's MOCK_PROPERTIES. "Start now" goes through
// start_adhoc_showing_session, which back-creates the showings row — without
// that, a walk-in showing would never reach the seller-facing record and the
// public page would silently under-report.

const ADHOC_DURATION_MIN = 45;

interface Props {
  properties: Property[];
  loading: boolean;
  error: string | null;
  hasActiveSession: boolean;
  onSessionStarted: (session: StartedSession) => void;
}

export function MyPropertiesList({ properties, loading, error, hasActiveSession, onSessionStarted }: Props) {
  const [startingId, setStartingId] = useState<string | null>(null);

  async function handleStartNow(property: Property) {
    setStartingId(property.id);
    try {
      const { data: sessionId, error: rpcError } = await supabase.rpc("start_adhoc_showing_session", {
        _property_id: property.id,
        _activity_type: "showing",
        _client_name: "",
        _duration_min: ADHOC_DURATION_MIN,
      });
      if (rpcError) throw rpcError;
      if (!sessionId) throw new Error("No session was created");

      onSessionStarted({
        sessionId: sessionId as string,
        activityLabel: ACTIVITY_LABELS.showing,
        address: formatAddress(property),
        expectedEndTime: new Date(Date.now() + ADHOC_DURATION_MIN * 60_000).toISOString(),
      });

      toast.success("Showing started", {
        description: property.lat
          ? "Tracking active — geofence armed on arrival"
          : "Tracking active — this property has no map pin, so no geofence",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start a showing here");
    } finally {
      setStartingId(null);
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Home className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">My Assigned Properties</h3>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your properties…
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          <div>
            <p className="font-medium text-foreground">Couldn't load your properties</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      ) : properties.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
          <p className="text-sm font-medium text-foreground">No properties assigned yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your broker assigns listings from the Overwatch console.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              action={
                <Button
                  onClick={() => handleStartNow(property)}
                  disabled={startingId === property.id || hasActiveSession}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  {startingId === property.id ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Starting…
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-3.5 w-3.5" /> Start now
                    </>
                  )}
                </Button>
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
