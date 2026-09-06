import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Home as HomeIcon, Key, Users, ScanFace, Menu } from "lucide-react";
import { useMenuDrawer } from "@/components/layout/MenuDrawerContext";
import { WorkspaceToggle } from "@/components/layout/WorkspaceToggle";

// Port of reference/tether-app-demo.html #screen-b2b-home (~line 410).
export default function B2BHome() {
  const navigate = useNavigate();
  const { openMenu } = useMenuDrawer();

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 p-6 pt-16 text-white">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={openMenu}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 transition hover:bg-slate-700"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-yellow-500 text-xs font-bold text-slate-900">
                P
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-yellow-500">Professional</span>
            </div>
            <h2 className="text-2xl font-bold">Agent Dashboard</h2>
          </div>
        </div>
        <WorkspaceToggle variant="dark" />
      </div>

      <div className="relative mb-6 overflow-hidden rounded-3xl border border-slate-700 bg-slate-800 p-6 shadow-xl">
        <div className="absolute right-0 top-0 p-4 opacity-10">
          <HomeIcon className="h-32 w-32" />
        </div>

        <div className="relative z-10">
          <span className="rounded border border-emerald-500/20 bg-emerald-900/50 px-2 py-1 text-[10px] text-emerald-400">
            GPS ACTIVE
          </span>
          <h3 className="mb-1 mt-4 text-xl font-bold">Next Showing: 2:00 PM</h3>
          <p className="mb-6 text-sm text-slate-400">456 Hollywood Blvd, Los Angeles</p>

          <button
            onClick={() => navigate("/active-timer")}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 py-4 font-bold text-slate-900 shadow-lg transition hover:brightness-110"
          >
            <Key className="h-4 w-4" /> Start Showing Timer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate("/b2b/openhouse")}
          className="group rounded-2xl border border-slate-700 bg-slate-800 p-5 text-left transition hover:border-yellow-500/50"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-700 transition group-hover:bg-yellow-500 group-hover:text-slate-900">
            <Users className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-bold">Open House</h4>
          <p className="mt-1 text-[10px] text-slate-500">Geofence Monitor</p>
        </button>

        <button
          onClick={() => toast("ID Verification API Loading...")}
          className="group rounded-2xl border border-slate-700 bg-slate-800 p-5 text-left transition hover:border-yellow-500/50"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-700 transition group-hover:bg-yellow-500 group-hover:text-slate-900">
            <ScanFace className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-bold">Verify Client</h4>
          <p className="mt-1 text-[10px] text-slate-500">Scan ID / Driver Lic</p>
        </button>

        <button
          onClick={() => navigate("/b2b/team")}
          className="col-span-2 flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-800 p-5 text-left transition hover:border-yellow-500/50"
        >
          <div>
            <h4 className="text-sm font-bold">Team Status</h4>
            <p className="mt-1 text-[10px] text-slate-500">Keller Williams - Team A</p>
          </div>
          <div className="flex -space-x-2">
            <div className="h-8 w-8 rounded-full border-2 border-slate-800 bg-slate-600" />
            <div className="h-8 w-8 rounded-full border-2 border-slate-800 bg-slate-500" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-800 bg-yellow-500 text-[10px] font-bold text-slate-900">
              +3
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
