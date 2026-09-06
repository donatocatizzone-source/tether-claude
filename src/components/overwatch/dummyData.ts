// Port of OLD/src/components/tether/overwatch/dummyData.ts (see CLAUDE.md
// > Ground truth). Seed/fallback data shown alongside real org members
// (see OverwatchDashboard's mergedEmployees) so the console isn't empty
// before real Pro Guard sessions exist.
export interface Employee {
  id: string;
  name: string;
  role: string;
  status: "idle" | "active" | "emergency";
  lastCheckIn: string;
  location?: { lat: number; lng: number };
}

export const dummyEmployees: Employee[] = [
  { id: "1", name: "Sarah Chen", role: "Field Agent", status: "idle", lastCheckIn: "2 min ago" },
  {
    id: "2",
    name: "Marcus Williams",
    role: "Security Guard",
    status: "emergency",
    lastCheckIn: "Just now",
    location: { lat: 40.7128, lng: -74.006 },
  },
  { id: "3", name: "Priya Patel", role: "Field Agent", status: "idle", lastCheckIn: "5 min ago" },
  {
    id: "4",
    name: "James Rodriguez",
    role: "Patrol Officer",
    status: "active",
    lastCheckIn: "1 min ago",
    location: { lat: 40.7589, lng: -73.9851 },
  },
  { id: "5", name: "Aisha Johnson", role: "Field Agent", status: "idle", lastCheckIn: "8 min ago" },
];

export interface Incident {
  id: string;
  employeeName: string;
  type: "emergency" | "checkin" | "alert";
  message: string;
  time: string;
}

// Locally-created incidents (from EmployeeDetailView quick actions / panic
// button) — merged with real `incidents` table rows in AlertStream. Kept
// as a separate shared type (rather than defined inline in
// OverwatchDashboard, as OLD does) to avoid a circular import between it
// and the components that create/read these.
export interface LocalIncident {
  id: string;
  employee_name: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "new" | "acknowledged" | "resolved";
  created_at: string;
}

export const dummyIncidents: Incident[] = [
  { id: "i1", employeeName: "Marcus Williams", type: "emergency", message: "Distress signal triggered — Location shared", time: "Just now" },
  { id: "i2", employeeName: "James Rodriguez", type: "checkin", message: "Monitoring activated", time: "1 min ago" },
  { id: "i3", employeeName: "Sarah Chen", type: "checkin", message: "Safe check-in completed", time: "2 min ago" },
  { id: "i4", employeeName: "Priya Patel", type: "checkin", message: "Safe check-in completed", time: "5 min ago" },
  { id: "i5", employeeName: "Aisha Johnson", type: "alert", message: "Entered monitored zone", time: "8 min ago" },
];
