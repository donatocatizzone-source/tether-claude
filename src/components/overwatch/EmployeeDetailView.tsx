import { useState } from "react";
import { ArrowLeft, MapPin, Phone, AlertTriangle, ShieldAlert, Clock, FileWarning, UserX, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Employee, LocalIncident } from "@/components/overwatch/dummyData";
import { GoogleMapView } from "@/components/maps/GoogleMapView";
import { toast } from "sonner";

// Port of OLD/src/components/tether/overwatch/EmployeeDetailView.tsx (see
// CLAUDE.md > Ground truth).
interface Props {
  employee: Employee;
  onBack: () => void;
  onIncidentCreated: (incident: LocalIncident) => void;
  onClearAlert: (employeeName: string) => void;
  onSetActive: (employeeName: string) => void;
}

const quickActions = [
  { id: "welfare", label: "Welfare Check", icon: Phone, severity: "low" as const, desc: "Request a welfare check-in from this employee" },
  { id: "overdue", label: "Overdue Check-in", icon: Clock, severity: "medium" as const, desc: "Employee missed scheduled check-in" },
  { id: "suspicious", label: "Suspicious Activity", icon: FileWarning, severity: "high" as const, desc: "Flag suspicious activity at employee location" },
  { id: "no_contact", label: "No Contact", icon: UserX, severity: "high" as const, desc: "Unable to reach employee after multiple attempts" },
];

const statusColors = {
  idle: "bg-primary/20 text-primary",
  active: "bg-amber-500/20 text-amber-400",
  emergency: "bg-destructive/20 text-red-400",
};

export function EmployeeDetailView({ employee, onBack, onIncidentCreated, onClearAlert, onSetActive }: Props) {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [panicActive, setPanicActive] = useState(false);

  const createIncident = (severity: "low" | "medium" | "high" | "critical", actionLabel: string) => {
    const incident: LocalIncident = {
      id: crypto.randomUUID(),
      employee_name: employee.name,
      type: actionLabel,
      severity,
      status: "new",
      created_at: new Date().toISOString(),
    };
    onIncidentCreated(incident);
    toast.success(`${actionLabel} incident created for ${employee.name}`);
  };

  const handleQuickAction = (action: (typeof quickActions)[0]) => {
    setSubmitting(action.id);
    createIncident(action.severity, action.label);
    setTimeout(() => setSubmitting(null), 500);
  };

  const handlePanic = () => {
    setPanicActive(true);
    createIncident("critical", "PANIC — Emergency");
    setTimeout(() => setPanicActive(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{employee.name}</h1>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{employee.role}</span>
            <Badge className={`text-xs ${statusColors[employee.status]}`}>{employee.status}</Badge>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden border-border bg-secondary">
        <CardContent className="relative p-0">
          <GoogleMapView
            center={employee.location ? { lat: employee.location.lat, lng: employee.location.lng } : { lat: 30.2672, lng: -97.7431 }}
            zoom={14}
            markers={
              employee.location
                ? [
                    {
                      position: { lat: employee.location.lat, lng: employee.location.lng },
                      color: employee.status === "emergency" ? "red" : employee.status === "active" ? "amber" : "green",
                    },
                  ]
                : []
            }
            className="h-56 w-full sm:h-72"
          />
          <div className="absolute bottom-3 left-3 z-10 rounded-lg bg-background/80 px-3 py-2 backdrop-blur-sm">
            <p className="text-xs font-medium text-foreground">{employee.name}'s last known location</p>
            <p className="text-[10px] text-muted-foreground">Last check-in: {employee.lastCheckIn}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-secondary">
        <CardContent className="space-y-3 py-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status Control</p>

          {employee.status === "idle" && (
            <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="flex items-center gap-3">
                <Briefcase size={16} className="text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Set On Job</p>
                  <p className="text-xs text-muted-foreground">Mark this employee as actively working</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  onSetActive(employee.name);
                  toast.success(`${employee.name} set to active`);
                }}
                className="bg-amber-500 text-white hover:bg-amber-600"
              >
                Activate
              </Button>
            </div>
          )}

          {employee.status !== "idle" && (
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{employee.status === "emergency" ? "Emergency Active" : "Currently On Job"}</p>
                <p className="text-xs text-muted-foreground">Reset status to safe / idle</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClearAlert(employee.name);
                  toast.success(`${employee.name} marked as safe`);
                }}
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                Mark Safe
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Incident Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const isLoading = submitting === action.id;
            return (
              <motion.button
                key={action.id}
                whileTap={{ scale: 0.97 }}
                disabled={isLoading || !!submitting}
                onClick={() => handleQuickAction(action)}
                className="flex items-start gap-3 rounded-xl border border-border bg-secondary p-4 text-left transition-colors hover:bg-accent disabled:opacity-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon size={18} className="text-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{action.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{action.desc}</p>
                  <Badge variant="outline" className="mt-1.5 text-[10px]">
                    {action.severity}
                  </Badge>
                </div>
                {isLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
              </motion.button>
            );
          })}
        </div>
      </div>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <ShieldAlert size={28} className="text-destructive" />
          <p className="max-w-xs text-center text-sm text-muted-foreground">
            Trigger an immediate critical alert for <strong className="text-foreground">{employee.name}</strong>. This will notify all managers and begin
            incident response.
          </p>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              size="lg"
              disabled={panicActive || !!submitting}
              onClick={handlePanic}
              className={`rounded-xl px-8 font-bold text-white ${
                panicActive ? "cursor-not-allowed bg-red-700" : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
              }`}
            >
              <AlertTriangle size={18} className="mr-2" />
              {panicActive ? "Alert Sent" : "Panic Alert"}
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
}

export default EmployeeDetailView;
