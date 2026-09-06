import { Plus, Car } from "lucide-react";
import { toast } from "sonner";
import { GoogleMapView, type LatLng } from "@/components/maps/GoogleMapView";

// Port of reference/tether-app-demo.html #screen-circle (~line 795).
// The original used a fake SVG grid + hardcoded pixel pins; this rebuild
// swaps that for a real GoogleMapView per CLAUDE.md's Google Maps section.
const SELF_POSITION: LatLng = { lat: 33.081, lng: -97.175 };
const MEMBERS = [
  { name: "Mom", initial: "M", position: { lat: 33.086, lng: -97.182 }, status: "At Home • 100%", statusColor: "bg-mode-safe", icon: null },
  { name: "Sister", initial: "S", position: { lat: 33.076, lng: -97.166 }, status: "Driving • 45mph", statusColor: null, icon: Car },
];

const ACTIVITY = [
  { name: "Sister", text: "left work.", time: "10 mins ago", dot: "bg-muted" },
  { name: "Mom", text: "arrived at Home.", time: "2 hrs ago", dot: "bg-mode-safe" },
];

export default function SafetyCircle() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-6 pt-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Safety Circle</h2>
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm">
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 h-48 overflow-hidden rounded-lg border border-border shadow-inner">
          <GoogleMapView
            center={SELF_POSITION}
            zoom={14}
            marker={SELF_POSITION}
            markers={MEMBERS.map((m) => ({ position: m.position, label: m.initial }))}
            className="h-full w-full"
          />
        </div>

        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Members</h3>
        <div className="mb-8 space-y-3">
          {MEMBERS.map((m) => (
            <div
              key={m.name}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                    m.name === "Mom" ? "bg-muted text-mode-dating" : "bg-muted text-mode-ride"
                  }`}
                >
                  {m.initial}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">{m.name}</h4>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
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
                className="rounded-lg bg-background px-3 py-1.5 text-xs font-bold text-[#4292c6] hover:bg-muted"
              >
                Ping
              </button>
            </div>
          ))}
        </div>

        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
        <div className="space-y-4 border-l-2 border-border pl-4">
          {ACTIVITY.map((a, i) => (
            <div key={i} className="relative">
              <div className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-background ${a.dot}`} />
              <p className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{a.name}</span> {a.text}
              </p>
              <p className="text-[10px] text-muted-foreground">{a.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
