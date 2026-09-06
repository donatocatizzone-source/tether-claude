import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
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
import B2BHome from "@/pages/b2b/Home";
import B2BTeam from "@/pages/b2b/Team";
import B2BOpenHouse from "@/pages/b2b/OpenHouse";
import NotFound from "@/pages/NotFound";

// Route map is a 1:1 translation of switchScreen('<id>') calls in
// reference/tether-app-demo.html (~line 1590) into React Router paths.
// See CLAUDE.md > Screen Inventory for the full screen-id -> route table.
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster theme="dark" position="top-center" richColors />
        <AppShell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/mode/:mode" element={<ModeMenu />} />
            <Route path="/active-timer" element={<ActiveTimer />} />
            <Route path="/dating" element={<DatingMode />} />
            <Route path="/ride" element={<RideMode />} />
            <Route path="/market" element={<MarketplaceMode />} />
            <Route path="/vault" element={<Vault />} />
            <Route path="/student/bus" element={<StudentBus />} />
            <Route path="/student/walk" element={<StudentWalk />} />
            <Route path="/student/hangout" element={<StudentHangout />} />
            <Route path="/circle" element={<SafetyCircle />} />
            <Route path="/vouch" element={<Vouch />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/premium/:key" element={<Premium />} />
            <Route path="/guardian" element={<Guardian />} />
            <Route path="/b2b" element={<B2BHome />} />
            <Route path="/b2b/team" element={<B2BTeam />} />
            <Route path="/b2b/openhouse" element={<B2BOpenHouse />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
