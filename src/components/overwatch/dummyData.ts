// Port of OLD/src/components/tether/overwatch/dummyData.ts (see CLAUDE.md
// > Ground truth).
//
// These are FABRICATED rows for demos. They are only merged into the console
// when VITE_DEMO_SEED=true (see src/lib/env.ts and OverwatchDashboard's
// mergedEmployees) — off by default, because one of them carries an
// `emergency` status that becomes a critical incident in the live feed, and a
// manager must never have to work out whether a distress alert is invented.
//
// Names carry a "[Demo]" prefix so they stay identifiable in every view that
// renders an Employee (status board, map pins, team table, drill-in) without
// each of those needing its own demo-aware branch.
//
// Roles are real-estate ones now; they previously read "Security Guard" and
// "Patrol Officer", left over from the generic field-safety product this B2B
// side started as.
export interface Employee {
  id: string;
  name: string;
  role: string;
  status: "idle" | "active" | "emergency";
  lastCheckIn: string;
  location?: { lat: number; lng: number };
}

export const dummyEmployees: Employee[] = [
  { id: "1", name: "[Demo] Sarah Chen", role: "Listing Agent", status: "idle", lastCheckIn: "2 min ago" },
  {
    id: "2",
    name: "[Demo] Marcus Williams",
    role: "Showing Agent",
    status: "emergency",
    lastCheckIn: "Just now",
    location: { lat: 40.7128, lng: -74.006 },
  },
  { id: "3", name: "[Demo] Priya Patel", role: "Listing Agent", status: "idle", lastCheckIn: "5 min ago" },
  {
    id: "4",
    name: "[Demo] James Rodriguez",
    role: "Showing Agent",
    status: "active",
    lastCheckIn: "1 min ago",
    location: { lat: 40.7589, lng: -73.9851 },
  },
  { id: "5", name: "[Demo] Aisha Johnson", role: "Buyer's Agent", status: "idle", lastCheckIn: "8 min ago" },
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
  { id: "i1", employeeName: "[Demo] Marcus Williams", type: "emergency", message: "Distress signal triggered — Location shared", time: "Just now" },
  { id: "i2", employeeName: "[Demo] James Rodriguez", type: "checkin", message: "Monitoring activated", time: "1 min ago" },
  { id: "i3", employeeName: "[Demo] Sarah Chen", type: "checkin", message: "Safe check-in completed", time: "2 min ago" },
  { id: "i4", employeeName: "[Demo] Priya Patel", type: "checkin", message: "Safe check-in completed", time: "5 min ago" },
  { id: "i5", employeeName: "[Demo] Aisha Johnson", type: "alert", message: "Entered monitored zone", time: "8 min ago" },
];
