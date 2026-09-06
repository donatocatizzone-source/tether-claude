import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ProGuardSetup, type ProSessionSetup } from "@/components/pro/ProGuardSetup";
import { ProGuardActive, EXTEND_SECONDS } from "@/components/pro/ProGuardActive";
import { SessionEndScreen } from "@/components/pro/SessionEndScreen";

// Port of OLD/src/components/tether/pro/ProGuardView.tsx (see CLAUDE.md >
// Ground truth). Orchestrates setup -> active -> end. Used as Overwatch's
// own "Pro Guard" preview tab (see OverwatchDashboard.tsx) — the real
// field-employee flow lives in TeamMemberView, rendered by MemberPage.
export function ProGuardView() {
  const { user } = useAuth();
  const [session, setSession] = useState<ProSessionSetup | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expectedEndTime, setExpectedEndTime] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);

  const handleStart = useCallback(
    async (data: ProSessionSetup) => {
      if (!user) return;
      const endTime = new Date(Date.now() + data.durationMin * 60 * 1000).toISOString();

      // organization_id is required, not optional: check_geofence_breach()
      // copies it straight into incidents.organization_id, which is NOT NULL.
      // A geofenced session with a null org therefore makes the trigger throw,
      // and because it fires on user_locations, the failure aborts the whole
      // upsert — silently killing GPS tracking for that user. This view sets
      // geofence coords, so it is exactly the path that hits that.
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: row, error } = await supabase
        .from("professional_sessions")
        .insert({
          user_id: user.id,
          organization_id: profile?.organization_id ?? null,
          client_name: data.clientName,
          address: data.address,
          notes: data.notes,
          expected_end_time: endTime,
          status: "active",
          // Only arm the geofence when we can also attribute incidents to an
          // org, otherwise the breach trigger would break location tracking.
          geofence_lat: profile?.organization_id ? data.geofenceLat : null,
          geofence_lng: profile?.organization_id ? data.geofenceLng : null,
          geofence_radius_m: data.geofenceRadiusM,
        })
        .select("id")
        .single();

      if (error) {
        toast.error("Failed to start session");
        return;
      }

      if (data.geofenceEnabled && !profile?.organization_id) {
        toast.warning("Geofence disabled — your profile isn't linked to an organization yet");
      }

      setSessionId(row.id);
      setExpectedEndTime(endTime);
      setSession(data);
      toast.success("Pro Guard activated");
    },
    [user],
  );

  const handleExtend = useCallback(async () => {
    if (!sessionId || !expectedEndTime) return;
    const extended = new Date(new Date(expectedEndTime).getTime() + EXTEND_SECONDS * 1000).toISOString();

    const { error } = await supabase
      .from("professional_sessions")
      .update({ expected_end_time: extended, status: "extended" })
      .eq("id", sessionId);

    if (error) {
      toast.error("Failed to extend session");
      return;
    }

    setExpectedEndTime(extended);
    toast.success("Extended by 15 minutes");
  }, [sessionId, expectedEndTime]);

  const handleEnd = useCallback(
    async (isDuress: boolean) => {
      if (!sessionId || !user) return;

      await supabase
        .from("professional_sessions")
        .update({ status: isDuress ? "duress_alert" : "completed" })
        .eq("id", sessionId);

      if (isDuress) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile?.organization_id) {
          await supabase.from("incidents").insert({
            organization_id: profile.organization_id,
            user_id: user.id,
            session_id: sessionId,
            status: "new",
            severity: "critical",
          });
        }
      }

      setEnded(true);
    },
    [sessionId, user],
  );

  const handleDone = () => {
    setSession(null);
    setSessionId(null);
    setExpectedEndTime(null);
    setEnded(false);
  };

  if (ended) return <SessionEndScreen onDone={handleDone} />;
  if (session && expectedEndTime)
    return (
      <ProGuardActive
        session={session}
        expectedEndTime={expectedEndTime}
        onEnd={handleEnd}
        onExtend={handleExtend}
      />
    );
  return <ProGuardSetup onStart={handleStart} />;
}

export default ProGuardView;
