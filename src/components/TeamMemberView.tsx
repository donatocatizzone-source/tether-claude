import { useState, useEffect } from "react";
import {
  MapPin, Shield, Phone, User, Save, Play, Square, Loader2,
  ShieldAlert, CheckCircle2, AlertTriangle, Clock, Home, Plus, Timer,
  Briefcase, FileText, ChevronDown, ChevronUp, Pencil, Radio, CircleDashed,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { GoogleMapView } from "@/components/maps/GoogleMapView";
import { PinPadModal } from "@/components/pro/PinPadModal";
import { useGeoTracking } from "@/hooks/useGeoTracking";
import { useSessionCountdown } from "@/hooks/useSessionCountdown";
import { useMySchedule } from "@/hooks/useMySchedule";
import { useMyProperties } from "@/hooks/useMyProperties";
import { MyScheduleToday, type StartedSession } from "@/components/realestate/MyScheduleToday";
import { MyPropertiesList } from "@/components/realestate/MyPropertiesList";
import { ACTIVITY_LABELS, type SessionActivity } from "@/lib/showings";

// Port of OLD/src/components/tether/TeamMemberView.tsx (see CLAUDE.md >
// Ground truth) — the real content of /business/member, replacing this
// rebuild's earlier placeholder (the old demo's b2b trio, which was a
// different concept — a realtor showing-timer dashboard, not this).
// The activity picker is now driven by ACTIVITY_LABELS in lib/showings, which
// is keyed by the session_activity enum — so the picker, the enum, and the
// analytics rollups can't drift apart. MOCK_PROPERTIES (three hardcoded
// Unsplash cards) is gone; assigned properties are real rows now.
const ACTIVITY_PRESETS = (Object.keys(ACTIVITY_LABELS) as SessionActivity[])
  .filter((value) => value !== "other")
  .map((value) => ({ value, label: ACTIVITY_LABELS[value] }));

export function TeamMemberView() {
  const { user } = useAuth();
  const [activityType, setActivityType] = useState("");
  const [customJob, setCustomJob] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [starting, setStarting] = useState(false);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeActivity, setActiveActivity] = useState("");
  const [activeAddress, setActiveAddress] = useState("");
  const [activeExpectedEnd, setActiveExpectedEnd] = useState<string | null>(null);

  // Was a `countdown` string whose setter was never called anywhere, so the
  // active-session timer rendered "--:--" for the entire session.
  const { label: countdown } = useSessionCountdown(activeExpectedEnd);

  const [pinOpen, setPinOpen] = useState(false);

  const {
    showings: todaysShowings,
    loading: scheduleLoading,
    error: scheduleError,
    refresh: refreshSchedule,
  } = useMySchedule({ userId: user?.id });

  const {
    properties: myProperties,
    loading: propertiesLoading,
    error: propertiesError,
  } = useMyProperties(user?.id);

  const { location: currentLocation } = useGeoTracking({
    userId: user?.id,
    enabled: !!activeSessionId,
  });

  const fullName = (user?.user_metadata?.full_name as string) || "Team Member";
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [editName, setEditName] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("job_title, job_description, phone, full_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setJobTitle(data.job_title || "");
          setJobDescription(data.job_description || "");
          setProfilePhone(data.phone || "");
          setEditName(data.full_name || "");
        }
      });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    await supabase
      .from("profiles")
      .update({ full_name: editName, job_title: jobTitle, job_description: jobDescription, phone: profilePhone })
      .eq("user_id", user.id);
    setProfileSaving(false);
    toast.success("Profile updated");
  };

  useEffect(() => {
    if (!activeSessionId) return;

    const channel = supabase
      .channel(`member-session-${activeSessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "professional_sessions", filter: `id=eq.${activeSessionId}` },
        (payload) => {
          const row = payload.new as { status?: string; expected_end_time?: string } | undefined;
          const newStatus = row?.status;
          const oldStatus = (payload.old as { status?: string } | undefined)?.status;

          // Keep the countdown honest if the session's window moves server-side.
          if (row?.expected_end_time) setActiveExpectedEnd(row.expected_end_time);

          if (newStatus === "completed") {
            setActiveSessionId(null);
            setActiveActivity("");
            setActiveAddress("");
            setActiveExpectedEnd(null);
            toast.info("Session ended by your manager", { description: "You've been marked safe." });
          } else if (newStatus === "duress_alert") {
            toast.error("Duress alert active on your session");
          } else if (newStatus === "active" && oldStatus === "duress_alert") {
            toast.success("Alert cleared — status reset to active");
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSessionId]);

  /**
   * Free-form session not tied to a property. Anything attached to a real
   * property goes through the start_showing_session RPCs instead, so it gets
   * a geofence and a seller-facing record.
   *
   * `client_name` used to receive the activity label here, which is what made
   * the column mean three different things depending on the writer. The label
   * now goes to `activity_type` (or `notes` for a custom one).
   */
  const startSession = async (
    activityType: SessionActivity,
    label: string,
    address: string,
    durationMin = 60,
  ) => {
    if (!user) return;
    setStarting(true);
    try {
      const expectedEnd = new Date(Date.now() + durationMin * 60_000);
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data, error } = await supabase
        .from("professional_sessions")
        .insert({
          user_id: user.id,
          organization_id: profile?.organization_id ?? null,
          client_name: "",
          activity_type: activityType,
          // A custom activity has no enum value, so keep its wording somewhere
          // a manager can still read it.
          notes: activityType === "other" ? label : "",
          address,
          expected_end_time: expectedEnd.toISOString(),
          status: "active",
        })
        .select("id")
        .single();

      if (error) throw error;
      setActiveSessionId(data.id);
      setActiveActivity(label);
      setActiveAddress(address);
      setActiveExpectedEnd(expectedEnd.toISOString());
      toast.success("Session started — tracking active");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setStarting(false);
    }
  };

  const handleStartFromForm = () => {
    if (showCustom) {
      const label = customJob.trim();
      if (!label) {
        toast.error("Describe the activity");
        return;
      }
      startSession("other", label, "");
      return;
    }

    const preset = ACTIVITY_PRESETS.find((p) => p.value === activityType);
    if (!preset) {
      toast.error("Select an activity type");
      return;
    }
    startSession(preset.value, preset.label, "");
  };

  // Sessions started from a real property/showing are created server-side by
  // the start_showing_session / start_adhoc_showing_session RPCs, so they
  // arrive here already persisted — this only syncs the local UI state.
  const handleSessionStarted = (session: StartedSession) => {
    setActiveSessionId(session.sessionId);
    setActiveActivity(session.activityLabel);
    setActiveAddress(session.address);
    setActiveExpectedEnd(session.expectedEndTime);
  };

  const handleEndSession = async (isDuress: boolean) => {
    if (!activeSessionId) return;
    try {
      // sync_showing_from_session() also stamps this server-side and mirrors
      // the end onto the linked showing; setting it here too keeps the value
      // right even if that trigger is ever dropped.
      await supabase
        .from("professional_sessions")
        .update({
          status: isDuress ? "duress_alert" : "completed",
          actual_end_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeSessionId);

      setActiveSessionId(null);
      setActiveActivity("");
      setActiveAddress("");
      setActiveExpectedEnd(null);
      refreshSchedule();
      toast.success(isDuress ? "Duress alert sent" : "Session ended");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to end session");
    }
  };

  const handleCheckIn = async () => {
    if (!user) return;
    await supabase.from("check_ins").insert({ user_id: user.id, status: "idle" });
    if (activeSessionId) {
      await supabase
        .from("professional_sessions")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", activeSessionId);
    }
    toast.success("Check-in sent — status: All Clear ✓");
  };

  const handleSilentSOS = async () => {
    if (!user) return;
    await supabase.from("check_ins").insert({ user_id: user.id, status: "emergency" });
    if (activeSessionId) {
      await supabase
        .from("professional_sessions")
        .update({ status: "duress_alert", updated_at: new Date().toISOString() })
        .eq("id", activeSessionId);
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();
    if (profile?.organization_id) {
      await supabase.from("incidents").insert({
        user_id: user.id,
        organization_id: profile.organization_id,
        severity: "critical",
        status: "new",
        session_id: activeSessionId,
      });
    }
    toast.error("Silent SOS triggered", { description: "Emergency contacts notified" });
  };

  const handleAssistRequest = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();
    if (profile?.organization_id) {
      await supabase.from("incidents").insert({
        user_id: user.id,
        organization_id: profile.organization_id,
        severity: "low",
        status: "new",
        session_id: activeSessionId,
        resolution_notes: "Assistance requested by team member",
      });
    }
    await supabase.from("check_ins").insert({ user_id: user.id, status: "active" });
    toast("Assistance request sent to manager");
  };

  return (
    // Was locked to max-w-lg (512px) — a phone-shaped column stranded in the
    // middle of a desktop monitor, on the screen an agent actually works from.
    // Two columns at lg: the live session and what's next on the left, the map
    // and reference material in a right rail.
    <div className="mx-auto w-full max-w-lg px-4 pb-28 lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 lg:px-6">
      {/* Main column: who you are, what's running, what's next. */}
      <div className="min-w-0">
      <button onClick={() => setProfileOpen(!profileOpen)} className="mt-5 mb-5 flex w-full items-center justify-between text-left">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {jobTitle || "Team Workspace"}
          </p>
          <h1 className="text-xl font-bold text-foreground">{editName || fullName}</h1>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Pencil size={14} />
          {profileOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      <AnimatePresence>
        {profileOpen && (
          <motion.div
            key="profile-editor"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <Card className="border-border bg-secondary">
              <CardContent className="space-y-4 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Edit Profile</p>

                <div>
                  <label className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <User size={14} /> Full Name
                  </label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your full name"
                    className="h-12 rounded-xl border-border bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Briefcase size={14} /> Job Title
                  </label>
                  <Input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Field Inspector, Real Estate Agent"
                    className="h-12 rounded-xl border-border bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <FileText size={14} /> Role Description
                  </label>
                  <Textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Briefly describe your responsibilities..."
                    rows={2}
                    className="resize-none rounded-xl border-border bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Phone size={14} /> Phone
                  </label>
                  <Input
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="h-12 rounded-xl border-border bg-background text-foreground"
                  />
                </div>

                <Button onClick={handleSaveProfile} disabled={profileSaving} className="h-12 w-full rounded-xl font-semibold active:scale-95">
                  <Save size={16} className="mr-2" />
                  {profileSaving ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {activeSessionId && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          <button
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-destructive/40 bg-destructive/10 px-2 py-4 text-destructive transition-all active:scale-95"
            onClick={handleSilentSOS}
          >
            <ShieldAlert size={22} />
            <span className="text-[11px] font-semibold">Silent SOS</span>
          </button>
          <button
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-primary/40 bg-primary/10 px-2 py-4 text-primary transition-all active:scale-95"
            onClick={handleCheckIn}
          >
            <CheckCircle2 size={22} />
            <span className="text-[11px] font-semibold">Check-In</span>
          </button>
          <button
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-2 py-4 text-amber-500 transition-all active:scale-95"
            onClick={handleAssistRequest}
          >
            <AlertTriangle size={22} />
            <span className="text-[11px] font-semibold">Assist</span>
          </button>
        </div>
      )}

      <AnimatePresence>
        {activeSessionId && (
          <motion.div key="active-session" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="mb-5">
            <Card className="border-sky-500/30 bg-sky-500/5 shadow-[0_0_24px_-4px_hsl(199_89%_48%/0.25)]">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/15">
                      <Shield size={18} className="text-sky-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{activeActivity}</p>
                      <p className="text-xs text-muted-foreground">{activeAddress || "No address"}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-400">Live</span>
                </div>

                <div className="flex items-center justify-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-500/5 py-5">
                  <Timer size={20} className="text-sky-400" />
                  <span className="font-mono text-3xl font-bold tracking-wider text-foreground">{countdown || "--:--"}</span>
                </div>

                {currentLocation && (
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-background/50 p-2.5">
                    <MapPin size={14} className="text-sky-400" />
                    <span className="text-xs text-muted-foreground">
                      {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
                    </span>
                  </div>
                )}

                <Button onClick={() => setPinOpen(true)} variant="destructive" className="h-14 w-full rounded-2xl text-base font-semibold active:scale-95">
                  <Square size={16} className="mr-2" />
                  End Session
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today's real schedule sits above the free-form starter: the common
          case is starting a showing that's already on the calendar. */}
      <div className="mb-5">
        <MyScheduleToday
          showings={todaysShowings}
          loading={scheduleLoading}
          error={scheduleError}
          hasActiveSession={!!activeSessionId}
          onSessionStarted={handleSessionStarted}
        />
      </div>

      {!activeSessionId && (
        <div className="mb-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Start Something Else
          </h3>
          <Card className="border-border/50 bg-secondary/60 backdrop-blur-lg">
            <CardContent className="space-y-4 p-5">
              {!showCustom ? (
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger className="h-14 rounded-2xl border-border bg-background text-foreground">
                    <SelectValue placeholder="Select Activity Type" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover">
                    {ACTIVITY_PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={customJob}
                  onChange={(e) => setCustomJob(e.target.value)}
                  placeholder="e.g. Property Inspection"
                  className="h-14 rounded-2xl border-border bg-background text-foreground"
                />
              )}
              <button
                onClick={() => {
                  setShowCustom(!showCustom);
                  setActivityType("");
                  setCustomJob("");
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Plus size={14} />
                {showCustom ? "Use Preset" : "Add Custom Job"}
              </button>
              <Button
                onClick={handleStartFromForm}
                disabled={starting || (!activityType && !customJob.trim())}
                className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground active:scale-95"
              >
                {starting ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Play size={18} className="mr-2" />}
                {starting ? "Starting..." : "Start Timer"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      </div>

      {/* Right rail: reference material, not the thing you act on. */}
      <div className="min-w-0 lg:sticky lg:top-4">
      <div className="mb-5">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">My Location</h3>
        <GoogleMapView
          center={currentLocation || { lat: 30.2672, lng: -97.7431 }}
          zoom={15}
          markers={currentLocation ? [{ position: currentLocation, color: "blue" }] : []}
          className="h-48 w-full overflow-hidden rounded-md"
        />
        <div className="mt-2">
          {/* Was an emoji: "🟢 Tracking" / "⚪ Off duty". Emoji render
              differently per platform and are announced unhelpfully by screen
              readers — not what you want on a live safety indicator. */}
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/80 px-2 py-1 text-[11px] font-medium text-foreground">
            {activeSessionId ? (
              <>
                <Radio size={11} className="text-mode-safe" /> Tracking
              </>
            ) : (
              <>
                <CircleDashed size={11} className="text-muted-foreground" /> Off duty
              </>
            )}
          </span>
        </div>
      </div>

      <MyPropertiesList
        properties={myProperties}
        loading={propertiesLoading}
        error={propertiesError}
        hasActiveSession={!!activeSessionId}
        onSessionStarted={handleSessionStarted}
      />
      </div>

      <PinPadModal open={pinOpen} onOpenChange={setPinOpen} onVerify={handleEndSession} />
    </div>
  );
}

export default TeamMemberView;
