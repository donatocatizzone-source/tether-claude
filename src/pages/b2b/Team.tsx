import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, MessageSquare, MapPin, Key } from "lucide-react";

// Port of reference/tether-app-demo.html #screen-b2b-team (~line 472).
// The agent-row action buttons and the bottom "Request Check-in"/"Team
// Broadcast" buttons have no onclick handlers in the reference, so they're
// rendered inert here too.
export default function B2BTeam() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-900 p-6 pt-12 text-white">
      <div className="sticky top-0 z-10 mb-8 flex items-center gap-3 bg-slate-900 py-2">
        <button
          onClick={() => navigate("/b2b")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 shadow-sm transition hover:bg-slate-700"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">Team Safety</h2>
          <p className="text-xs text-slate-400">Keller Williams - Team A</p>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-900/30 p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <CheckCircle className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-emerald-400">All Agents Safe</h4>
          <p className="text-[10px] text-slate-400">Last update: Just now</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-600" />
            <div>
              <h4 className="text-sm font-bold">Sarah Jenkins</h4>
              <p className="flex items-center gap-1 text-xs text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> At Office • 92%
              </p>
            </div>
          </div>
          <button className="rounded-lg bg-slate-700 p-2 hover:bg-slate-600">
            <MessageSquare className="h-4 w-4 text-slate-300" />
          </button>
        </div>

        <div className="relative flex items-center justify-between overflow-hidden rounded-xl border border-yellow-500/30 bg-slate-800 p-4">
          <div className="absolute bottom-0 left-0 top-0 w-1 bg-yellow-500" />
          <div className="flex items-center gap-3 pl-2">
            <div className="h-10 w-10 rounded-full bg-slate-600" />
            <div>
              <h4 className="text-sm font-bold">David Kim</h4>
              <p className="flex items-center gap-1 text-xs text-yellow-500">
                <Key className="h-3 w-3" /> Showing Active (12m)
              </p>
              <p className="text-[10px] text-slate-500">123 Sunset Blvd</p>
            </div>
          </div>
          <button className="rounded-lg bg-slate-700 p-2 hover:bg-slate-600">
            <MapPin className="h-4 w-4 text-slate-300" />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-600" />
            <div>
              <h4 className="text-sm font-bold">Mike Ross</h4>
              <p className="flex items-center gap-1 text-xs text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-500" /> Idle • Last seen 1h ago
              </p>
            </div>
          </div>
          <button className="rounded-lg bg-slate-700 p-2 hover:bg-slate-600">
            <MessageSquare className="h-4 w-4 text-slate-300" />
          </button>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-4 pb-24 pt-6">
        <button className="rounded-xl border border-slate-700 bg-slate-800 py-4 text-xs font-bold text-white hover:bg-slate-700">
          Request Check-in
        </button>
        <button className="rounded-xl bg-yellow-600 py-4 text-xs font-bold text-white hover:bg-yellow-700">
          Team Broadcast
        </button>
      </div>
    </div>
  );
}
