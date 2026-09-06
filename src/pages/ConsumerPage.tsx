import { Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import Home from "@/pages/Home";
import ModeMenu from "@/pages/ModeMenu";
import ActiveTimer from "@/pages/ActiveTimer";
import DatingMode from "@/pages/DatingMode";
import RideMode from "@/pages/RideMode";
import MarketplaceMode from "@/pages/MarketplaceMode";
import Vault from "@/pages/Vault";
import StudentBus from "@/pages/student/Bus";
import StudentWalk from "@/pages/student/Walk";
import StudentHangout from "@/pages/student/Hangout";
import SafetyCircle from "@/pages/SafetyCircle";
import Vouch from "@/pages/Vouch";
import Settings from "@/pages/Settings";
import Premium from "@/pages/Premium";
import Guardian from "@/pages/Guardian";
import NotFound from "@/pages/NotFound";

// Mounted at /consumer/* by App.tsx (see CLAUDE.md > Architecture). Routes
// below are relative to that prefix — this replaces the old flat top-level
// route list that lived directly in App.tsx before OLD's real /consumer +
// /business/member + /business/admin split was discovered.
export default function ConsumerPage() {
  return (
    <>
      <TopBar />
      <AppShell>
        <Routes>
          <Route index element={<Home />} />
          <Route path="mode/:mode" element={<ModeMenu />} />
          <Route path="active-timer" element={<ActiveTimer />} />
          <Route path="dating" element={<DatingMode />} />
          <Route path="ride" element={<RideMode />} />
          <Route path="market" element={<MarketplaceMode />} />
          <Route path="vault" element={<Vault />} />
          <Route path="student/bus" element={<StudentBus />} />
          <Route path="student/walk" element={<StudentWalk />} />
          <Route path="student/hangout" element={<StudentHangout />} />
          <Route path="circle" element={<SafetyCircle />} />
          <Route path="vouch" element={<Vouch />} />
          <Route path="settings" element={<Settings />} />
          <Route path="premium/:key" element={<Premium />} />
          <Route path="guardian" element={<Guardian />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppShell>
    </>
  );
}
