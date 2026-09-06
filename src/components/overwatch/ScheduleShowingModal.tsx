import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CalendarPlus, Loader2, AlertTriangle } from "lucide-react";
import { ACTIVITY_LABELS, formatAddress, type Property, type SessionActivity } from "@/lib/showings";

interface Member {
  user_id: string;
  full_name: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onScheduled: () => void;
  /** Pre-select a property when opened from its detail view. */
  defaultPropertyId?: string;
  /** Defaults the date field; falls back to today. */
  defaultDate?: Date;
}

const DURATIONS = [30, 45, 60, 90, 120];

function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ScheduleShowingModal({ open, onClose, onScheduled, defaultPropertyId, defaultDate }: Props) {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [showAllAgents, setShowAllAgents] = useState(false);

  const [propertyId, setPropertyId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [date, setDate] = useState(toDateInput(new Date()));
  const [time, setTime] = useState("14:00");
  const [duration, setDuration] = useState("45");
  const [activityType, setActivityType] = useState<SessionActivity>("showing");
  const [buyerName, setBuyerName] = useState("");
  const [brokerage, setBrokerage] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPropertyId(defaultPropertyId ?? "");
    setAgentId("");
    setDate(toDateInput(defaultDate ?? new Date()));
    setTime("14:00");
    setDuration("45");
    setActivityType("showing");
    setBuyerName("");
    setBrokerage("");
    setNotes("");
    setShowAllAgents(false);

    (async () => {
      const [propRes, memberRes] = await Promise.all([
        supabase.from("properties").select("*").order("address_line1"),
        supabase.from("profiles").select("user_id, full_name"),
      ]);
      setProperties((propRes.data ?? []) as Property[]);
      setMembers((memberRes.data ?? []) as Member[]);
    })();
  }, [open, defaultPropertyId, defaultDate]);

  // Narrow the agent list to whoever actually covers the chosen property.
  useEffect(() => {
    if (!propertyId) {
      setAssignedIds(new Set());
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("property_assignments")
        .select("user_id")
        .eq("property_id", propertyId);
      setAssignedIds(new Set((data ?? []).map((r) => (r as { user_id: string }).user_id)));
    })();
  }, [propertyId]);

  const selectedProperty = properties.find((p) => p.id === propertyId) ?? null;
  const agentOptions = showAllAgents ? members : members.filter((m) => assignedIds.has(m.user_id));

  async function handleSave() {
    if (!user || !propertyId || !agentId) return;
    setSaving(true);

    try {
      const start = new Date(`${date}T${time}`);
      if (Number.isNaN(start.getTime())) {
        toast.error("That date and time isn't valid");
        return;
      }
      const end = new Date(start.getTime() + Number(duration) * 60_000);

      // organization_id and agent_display_name are set by the set_showing_org
      // trigger from the property, so they're deliberately not sent here.
      const { error } = await supabase.from("showings").insert({
        property_id: propertyId,
        agent_id: agentId,
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
        status: "scheduled",
        activity_type: activityType,
        buyer_name: buyerName.trim(),
        buyer_agent_brokerage: brokerage.trim(),
        notes: notes.trim(),
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Showing scheduled");
      onScheduled();
      onClose();
    } catch (err) {
      // 23P01 is the GiST exclusion constraint: this agent already has an
      // overlapping showing. Postgres' own message is unreadable, so name the
      // actual problem.
      const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "";
      if (code === "23P01") {
        const agentName = members.find((m) => m.user_id === agentId)?.full_name ?? "That agent";
        toast.error("Double-booked", {
          description: `${agentName} already has a showing that overlaps this time. Pick another slot or another agent.`,
        });
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to schedule");
      }
    } finally {
      setSaving(false);
    }
  }

  const noAssignedAgents = !!propertyId && agentOptions.length === 0 && !showAllAgents;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-background sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <CalendarPlus size={18} /> Schedule Showing
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Property</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger className="border-border bg-secondary text-foreground">
                <SelectValue placeholder="Select a listing" />
              </SelectTrigger>
              <SelectContent className="border-border bg-background">
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {formatAddress(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProperty && selectedProperty.lat === null && (
              <p className="flex items-start gap-1.5 text-[11px] text-amber-500">
                <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                This listing has no map pin, so this showing can't be geofenced or GPS-verified.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground">Agent</Label>
              {propertyId && (
                <button
                  type="button"
                  onClick={() => setShowAllAgents((v) => !v)}
                  className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                >
                  {showAllAgents ? "Only assigned agents" : "Show all team members"}
                </button>
              )}
            </div>
            <Select value={agentId} onValueChange={setAgentId} disabled={!propertyId}>
              <SelectTrigger className="border-border bg-secondary text-foreground">
                <SelectValue placeholder={propertyId ? "Select an agent" : "Pick a property first"} />
              </SelectTrigger>
              <SelectContent className="border-border bg-background">
                {agentOptions.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.full_name || "Unnamed member"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {noAssignedAgents && (
              <p className="text-[11px] text-muted-foreground">
                Nobody is assigned to this listing yet — use "Show all team members", or assign someone from the
                property page.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border-border bg-secondary text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Start</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="border-border bg-secondary text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="border-border bg-secondary text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-background">
                  {DURATIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Type</Label>
            <Select value={activityType} onValueChange={(v) => setActivityType(v as SessionActivity)}>
              <SelectTrigger className="border-border bg-secondary text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-background">
                {(Object.keys(ACTIVITY_LABELS) as SessionActivity[])
                  .filter((v) => v !== "other")
                  .map((v) => (
                    <SelectItem key={v} value={v}>
                      {ACTIVITY_LABELS[v]}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Buyer Name</Label>
              <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="border-border bg-secondary text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Buyer's Brokerage</Label>
              <Input value={brokerage} onChange={(e) => setBrokerage(e.target.value)} className="border-border bg-secondary text-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="border-border bg-secondary text-foreground" />
            <p className="text-[11px] text-muted-foreground">
              Internal only. Buyer name and notes never appear on the seller's shared record.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !propertyId || !agentId}>
            {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <CalendarPlus size={16} className="mr-2" />}
            {saving ? "Scheduling…" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ScheduleShowingModal;
