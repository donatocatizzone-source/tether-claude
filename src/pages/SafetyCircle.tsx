import { Plus, Car } from "lucide-react";
import { toast } from "sonner";
import { GoogleMapView, type LatLng } from "@/components/maps/GoogleMapView";

// Port of reference/tether-app-demo.html #screen-circle (~line 795).
// The original used a fake SVG grid + hardcoded pixel pins; this rebuild
// swaps that for a real GoogleMapView per CLAUDE.md's Google Maps section.
const SELF_POSITION: LatLng = { lat: 33.081, lng: -97.175 };
const MEMBERS = [
  { name: "Mom", initial: "M", position: { lat: 33.086, lng: -97.182 }, status: "At Home • 100%", statusColor: "bg-emerald-500", icon: null },
  { name: "Sister", initial: "S", position: { lat: 33.076, lng: -97.166 }, status: "Driving • 45mph", statusColor: null, icon: Car },
];

const ACTIVITY = [
  { name: "Sister", text: "left work.", time: "10 mins ago", dot: "bg-slate-300" },
  { name: "Mom", text: "arrived at Home.", time: "2 hrs ago", dot: "bg-emerald-400" },
];

export default function SafetyCircle() {
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="p-6 pt-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Safety Circle</h2>
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-600 shadow-sm">
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 h-48 overflow-hidden rounded-3xl border border-slate-300 shadow-inner">
          <GoogleMapView
            center={SELF_POSITION}
            zoom={14}
            marker={SELF_POSITION}
            markers={MEMBERS.map((m) => ({ position: m.position, label: m.initial }))}
            className="h-full w-full"
          />
        </div>

        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Members</h3>
        <div className="mb-8 space-y-3">
          {MEMBERS.map((m) => (
            <div
              key={m.name}
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                    m.name === "Mom" ? "bg-pink-100 text-pink-600" : "bg-indigo-100 text-indigo-600"
                  }`}
                >
                  {m.initial}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{m.name}</h4>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    {m.icon ? (
                      <m.icon className="h-3 w-3" />
                    ) : (
                      <span className={`h-1.5 w-1.5 rounded-full ${m.statusColor}`} />
                    )}
                    {m.status}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toast(`Ping sent to ${m.name}`)}
                className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#4292c6] hover:bg-blue-100"
              >
                Ping
              </button>
            </div>
          ))}
        </div>

        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Recent Activity</h3>
        <div className="space-y-4 border-l-2 border-slate-200 pl-4">
          {ACTIVITY.map((a, i) => (
            <div key={i} className="relative">
              <div className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-slate-50 ${a.dot}`} />
              <p className="text-xs text-slate-600">
                <span className="font-bold text-slate-900">{a.name}</span> {a.text}
              </p>
              <p className="text-[10px] text-slate-400">{a.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
