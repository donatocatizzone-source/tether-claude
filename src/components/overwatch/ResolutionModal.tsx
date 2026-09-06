import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Port of OLD/src/components/tether/overwatch/ResolutionModal.tsx (see
// CLAUDE.md > Ground truth). Incident response workflow: new ->
// acknowledged -> resolved (outcome + notes), matching incident_outcome
// enum in supabase/schema.sql exactly.
interface Incident {
  id: string;
  user_id: string;
  severity: string;
}

interface Props {
  incident: Incident | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved: () => void;
}

const outcomeOptions = [
  { value: "false_alarm", label: "False Alarm" },
  { value: "user_safe", label: "User Safe — No Action" },
  { value: "emergency_services_called", label: "Emergency Services Called" },
  { value: "test", label: "Test" },
];

export function ResolutionModal({ incident, open, onOpenChange, onResolved }: Props) {
  const { user } = useAuth();
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!incident || !user || !outcome) {
      toast.error("Please select an outcome");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from("incidents")
      .update({
        status: "resolved",
        resolved_by: user.id,
        outcome: outcome as "false_alarm" | "user_safe" | "emergency_services_called" | "test",
        resolution_notes: notes || null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", incident.id);

    setSubmitting(false);

    if (error) {
      toast.error("Failed to resolve incident");
    } else {
      setOutcome("");
      setNotes("");
      onResolved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-background">
        <DialogHeader>
          <DialogTitle className="text-foreground">Resolve Incident</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Outcome</label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger>
                <SelectValue placeholder="Select outcome..." />
              </SelectTrigger>
              <SelectContent>
                {outcomeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Notes</label>
            <Textarea
              placeholder="E.g., Called agent, they entered wrong PIN. Confirmed safe."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !outcome}>
            {submitting ? "Closing..." : "Close Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ResolutionModal;
