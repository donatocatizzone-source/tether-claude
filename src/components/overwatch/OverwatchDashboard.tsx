import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { OverwatchSidebar } from "@/components/overwatch/OverwatchSidebar";
import { StatusBoard } from "@/components/overwatch/StatusBoard";
import { AlertsMap } from "@/components/overwatch/AlertsMap";
import { IncidentFeed } from "@/components/overwatch/IncidentFeed";
import { TeamTable } from "@/components/overwatch/TeamTable";
import { OverwatchLive } from "@/components/overwatch/OverwatchLive";
import { ProGuardView } from "@/components/pro/ProGuardView";
import { AlertStream } from "@/components/overwatch/AlertStream";
import { AuditLog } from "@/components/overwatch/AuditLog";
import { InvitationsView } from "@/components/overwatch/InvitationsView";
import { AnalyticsView } from "@/components/overwatch/AnalyticsView";
import { EmployeeDetailView } from "@/components/overwatch/EmployeeDetailView";
import { PropertiesView } from "@/components/overwatch/PropertiesView";
import { PropertyDetailView } from "@/components/overwatch/PropertyDetailView";
import { ScheduleView } from "@/components/overwatch/ScheduleView";
import { type Employee, dummyEmployees, type Incident as DummyIncident, dummyIncidents, type LocalIncident } from "@/components/overwatch/dummyData";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// Port of OLD/src/components/tether/overwatch/OverwatchDashboard.tsx (see
// CLAUDE.md > Ground truth) — the real Overwatch manager console,
// replacing this rebuild's earlier ScreenStub at /business/admin (which
// itself replaced the never-built, orphaned src/pages/b2b/Dashboard.tsx
// stub from before OLD was discovered).
interface RealAgent {
  userId: string;
  name: string;
  role: string;
  status: "idle" | "active" | "emergency";
  lastCheckIn: string;
  location?: { lat: number; lng: number };
}

export function OverwatchDashboard() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [localIncidents, setLocalIncidents] = useState<LocalIncident[]>([]);
  const [employees, setEmployees] = useState<Employee[]>(dummyEmployees);
  const [feedIncidents, setFeedIncidents] = useState<DummyIncident[]>(dummyIncidents);
  const [realAgents, setRealAgents] = useState<RealAgent[]>([]);

  const fetchRealAgents = async () => {
    if (!user) return;

    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, job_title, job_description, phone");

    if (!profiles || profiles.length === 0) return;

    const userIds = profiles.map((p) => p.user_id);

    const [sessionsRes, locsRes] = await Promise.all([
      supabase
        .from("professional_sessions")
        .select("user_id, status, expected_end_time")
        .in("user_id", userIds)
        .in("status", ["active", "extended", "duress_alert", "expired"]),
      supabase.from("user_locations").select("user_id, lat, lng, last_updated").in("user_id", userIds),
    ]);

    const sessionMap = new Map(sessionsRes.data?.map((s) => [s.user_id, s]) || []);
    const locMap = new Map(locsRes.data?.map((l) => [l.user_id, l]) || []);

    const agents: RealAgent[] = profiles.map((p) => {
      const session = sessionMap.get(p.user_id);
      const loc = locMap.get(p.user_id);
      let status: "idle" | "active" | "emergency" = "idle";
      if (session) {
        status = session.status === "duress_alert" ? "emergency" : "active";
      }
      return {
        userId: p.user_id,
        name: p.full_name || "Unknown",
        role: p.job_title || "Team Member",
        status,
        lastCheckIn: loc ? new Date(loc.last_updated).toLocaleTimeString() : "Never",
        location: loc ? { lat: loc.lat, lng: loc.lng } : undefined,
      };
    });

    setRealAgents(agents);
  };

  useEffect(() => {
    fetchRealAgents();

    const ch1 = supabase
      .channel("dashboard-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "professional_sessions" }, () => fetchRealAgents())
      .subscribe();

    const ch2 = supabase
      .channel("dashboard-locations")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_locations" }, () => fetchRealAgents())
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [user]);

  const mergedEmployees: Employee[] = [
    ...realAgents.map((a) => ({
      id: `real-${a.userId}`,
      name: a.name,
      role: a.role,
      status: a.status,
      lastCheckIn: a.lastCheckIn,
      location: a.location,
    })),
    ...employees,
  ];

  useEffect(() => {
    const emergencyEmployees = mergedEmployees.filter((emp) => emp.status === "emergency");
    const existingNames = new Set(localIncidents.filter((li) => li.status !== "resolved").map((li) => li.employee_name));
    const newIncidents: LocalIncident[] = emergencyEmployees
      .filter((emp) => !existingNames.has(emp.name))
      .map((emp) => ({
        id: `auto-${emp.id}-${Date.now()}`,
        employee_name: emp.name,
        type: "PANIC — Emergency distress signal",
        severity: "critical" as const,
        status: "new" as const,
        created_at: new Date().toISOString(),
      }));
    if (newIncidents.length > 0) {
      setLocalIncidents((prev) => [...newIncidents, ...prev]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedEmployees.map((e) => `${e.name}:${e.status}`).join(",")]);

  const handleViewChange = (view: string) => {
    setActiveView(view);
    setSidebarOpen(false);
    setSelectedEmployee(null);
    setSelectedPropertyId(null);
  };

  const handleIncidentCreated = (incident: LocalIncident) => {
    setLocalIncidents((prev) => [incident, ...prev]);
    const feedEntry: DummyIncident = {
      id: incident.id,
      employeeName: incident.employee_name,
      type: incident.severity === "critical" ? "emergency" : incident.severity === "high" ? "alert" : "checkin",
      message: incident.type,
      time: "Just now",
    };
    setFeedIncidents((prev) => [feedEntry, ...prev]);
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.name === incident.employee_name
          ? { ...emp, status: incident.severity === "critical" ? ("emergency" as const) : ("active" as const), lastCheckIn: "Just now" }
          : emp,
      ),
    );
  };

  // Real agents are merged in with id `real-<userId>`, so the id identifies
  // them exactly. These handlers used to match on display name, which meant
  // two people called "Chris" acted on each other's sessions, and a real
  // agent sharing a name with a seed row hit the database when they
  // shouldn't have.
  const realUserId = (employee: Employee): string | null =>
    employee.id.startsWith("real-") ? employee.id.slice("real-".length) : null;

  const handleClearAlert = async (employee: Employee) => {
    const employeeName = employee.name;
    const userId = realUserId(employee);
    const agent = userId ? realAgents.find((a) => a.userId === userId) : undefined;
    if (agent) {
      await supabase
        .from("professional_sessions")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("user_id", agent.userId)
        .in("status", ["active", "extended", "duress_alert", "expired"]);

      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("user_id", agent.userId).single();
      if (profile?.organization_id) {
        await supabase
          .from("incidents")
          .update({ status: "resolved", resolved_by: user?.id, resolved_at: new Date().toISOString(), outcome: "user_safe" })
          .eq("user_id", agent.userId)
          .eq("organization_id", profile.organization_id)
          .in("status", ["new", "acknowledged"]);
      }
    }

    setEmployees((prev) => prev.map((emp) => (emp.id === employee.id ? { ...emp, status: "idle" as const, lastCheckIn: "Just now" } : emp)));
    setLocalIncidents((prev) =>
      prev.map((li) => (li.employee_name === employeeName && li.status !== "resolved" ? { ...li, status: "resolved" as const } : li)),
    );
    setSelectedEmployee((prev) => (prev && prev.id === employee.id ? { ...prev, status: "idle" as const, lastCheckIn: "Just now" } : prev));
  };

  const handleSetActive = async (employee: Employee) => {
    const userId = realUserId(employee);
    const agent = userId ? realAgents.find((a) => a.userId === userId) : undefined;
    if (agent) {
      const { data: profile } = await supabase.from("profiles").select("organization_id").eq("user_id", agent.userId).single();

      await supabase.from("professional_sessions").insert({
        user_id: agent.userId,
        client_name: "Admin-initiated session",
        address: "",
        expected_end_time: new Date(Date.now() + 60 * 60_000).toISOString(),
        status: "active",
        organization_id: profile?.organization_id || null,
      });
    }

    setEmployees((prev) => prev.map((emp) => (emp.id === employee.id ? { ...emp, status: "active" as const, lastCheckIn: "Just now" } : emp)));
    setSelectedEmployee((prev) => (prev && prev.id === employee.id ? { ...prev, status: "active" as const, lastCheckIn: "Just now" } : prev));
  };

  const handleAddEmployee = (emp: Employee) => {
    setEmployees((prev) => [emp, ...prev]);
  };

  const handleRemoveEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="flex min-h-screen bg-background">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary text-foreground shadow-lg md:hidden"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <OverwatchSidebar activeView={activeView} onViewChange={handleViewChange} />
      </div>

      <main className="flex-1 overflow-auto p-4 pt-16 md:p-6 md:pt-6">
        {activeView === "dashboard" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Tether Overwatch</h1>
              <p className="text-sm text-muted-foreground">Real-time team safety monitoring</p>
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-1">
                <StatusBoard employees={mergedEmployees} />
              </div>
              <div className="xl:col-span-2">
                <AlertsMap employees={mergedEmployees} />
              </div>
            </div>
            <IncidentFeed incidents={feedIncidents} />
          </div>
        )}
        {activeView === "properties" && !selectedPropertyId && (
          <PropertiesView onSelect={setSelectedPropertyId} />
        )}
        {activeView === "properties" && selectedPropertyId && (
          <PropertyDetailView propertyId={selectedPropertyId} onBack={() => setSelectedPropertyId(null)} />
        )}
        {activeView === "schedule" && <ScheduleView />}
        {activeView === "incidents" && <AlertStream localIncidents={localIncidents} onUpdateLocal={setLocalIncidents} />}
        {activeView === "audit-log" && <AuditLog />}
        {activeView === "pro-guard" && (
          <div className="mx-auto max-w-2xl">
            <ProGuardView />
          </div>
        )}
        {activeView === "invitations" && <InvitationsView />}
        {activeView === "analytics" && <AnalyticsView />}
        {activeView === "live" && <OverwatchLive employees={mergedEmployees} />}
        {activeView === "team" && !selectedEmployee && (
          <TeamTable employees={mergedEmployees} onSelectEmployee={(emp) => setSelectedEmployee(emp)} onAddEmployee={handleAddEmployee} onRemoveEmployee={handleRemoveEmployee} />
        )}
        {activeView === "team" && selectedEmployee && (
          <EmployeeDetailView
            employee={selectedEmployee}
            onBack={() => setSelectedEmployee(null)}
            onIncidentCreated={handleIncidentCreated}
            onClearAlert={handleClearAlert}
            onSetActive={handleSetActive}
          />
        )}
      </main>
    </div>
  );
}

export default OverwatchDashboard;
