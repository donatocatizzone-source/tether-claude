import { Routes, Route } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import B2BHome from "@/pages/b2b/Home";
import B2BTeam from "@/pages/b2b/Team";
import B2BOpenHouse from "@/pages/b2b/OpenHouse";

// Mounted at /business/member/* by App.tsx (see CLAUDE.md > Architecture).
// Temporarily hosts the old demo's B2B trio (realtor showing-timer
// dashboard) as a placeholder — real Pro Guard (duress PIN, geofencing,
// professional_sessions) is build-order item 9 and should replace this.
export default function MemberPage() {
  return (
    <>
      <TopBar />
      <Routes>
        <Route index element={<B2BHome />} />
        <Route path="team" element={<B2BTeam />} />
        <Route path="openhouse" element={<B2BOpenHouse />} />
      </Routes>
    </>
  );
}
