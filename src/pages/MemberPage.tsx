import { TopBar } from "@/components/layout/TopBar";
import { TeamMemberView } from "@/components/TeamMemberView";

// Mounted at /business/member/* by App.tsx (see CLAUDE.md > Architecture).
// Real Pro Guard field-employee view now (session start/end, silent SOS,
// duress PIN, GPS tracking) — replaces the old demo's b2b trio placeholder
// (b2b/Home.tsx, Team.tsx, OpenHouse.tsx, now deleted; that was a
// different concept — a realtor showing-timer dashboard — not this).
export default function MemberPage() {
  return (
    <>
      <TopBar />
      <TeamMemberView />
    </>
  );
}
