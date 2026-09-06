import { TopBar } from "@/components/layout/TopBar";
import { ScreenStub } from "@/components/layout/ScreenStub";

// Mounted at /business/admin by App.tsx (see CLAUDE.md > Architecture).
// OLD's real AdminPage renders OverwatchDashboard — a full manager console
// (alert stream, alerts map, status board, employee detail, incident
// resolution workflow, audit log, org invitations). None of that is built
// here yet; this replaces the previously-planned-but-never-built
// src/pages/b2b/Dashboard.tsx stub. See CLAUDE.md > Suggested build order,
// item 9.
export default function AdminPage() {
  return (
    <>
      <TopBar />
      <ScreenStub
        eyebrow="Business / Admin"
        title="Overwatch manager console"
        description="Alert stream, alerts map, team status board, employee detail view, incident resolution workflow, audit log, and org invitations — not started yet."
        specRef="OLD/src/components/tether/overwatch/* — see CLAUDE.md > Feature inventory > B2B — Overwatch"
      />
    </>
  );
}
